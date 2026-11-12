/**
 * Key-protected HTTP API for the dashboard, mounted from src/server.ts before
 * the TanStack Start handler.
 *
 * Auth: every data endpoint needs a key in either header:
 *   Authorization: Bearer <DASHBOARD_API_KEY>
 *   X-API-Key: <DASHBOARD_API_KEY>
 * The key lives server-side only (.env.local); it is never sent to the browser
 * and never logged.
 *
 * Endpoints:
 *   GET    /api/health              liveness probe, no auth, no data
 *   GET    /api/overview            KPIs + alerts exactly like the dashboard page
 *   POST   /api/agent               { message, history? } -> natural-language answer
 *                                   (runs the same tool loop as the dashboard chat,
 *                                   including creating/moving tasks)
 *   GET    /api/tasks?status=&limit= list tasks
 *   POST   /api/tasks               { title, priority?, due_date?, description? } -> new task
 *   PATCH  /api/tasks/:id           { status } -> move a task
 *   GET    /api/research?section=   saved research reports (newest first)
 *   POST   /api/research            { section, question } -> runs research, saves a report
 *   POST   /api/research/:id/apply  writes that report's proposed record changes
 *   GET    /api/prospect-files?project_id=|project=   Word/Excel files of a SaaS project
 *   POST   /api/prospect-files      multipart: file + project_id or project -> uploads it
 *   DELETE /api/prospect-files/:id  removes a prospect file
 *
 * Sections for research: tasks, customers, sales, cars, saas, websites, products,
 * resources, leads, properties, velora, expenses, team.
 */

import { runLoop, type Message } from "@/lib/ai/client";
import { computeInsights } from "@/lib/ai/insights";
import { researchInternals } from "@/lib/ai/research";
import { SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { executeTool, tools } from "@/lib/ai/tools";

const RATE_LIMIT_PER_MINUTE = 60;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 32_000;
const MAX_HISTORY = 20;

const PROSPECT_TABLE = "saas_prospect_files";
const PROSPECT_BUCKET = "prospect-lists";
const PROSPECT_MAX_BYTES = 10 * 1024 * 1024;
const PROSPECT_ALLOWED = /\.(docx?|xlsx?)$/i;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function env(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  // Same lookup order as the AI client: .env.local values also land here.
  const fromMeta = import.meta.env?.[name]?.trim();
  return fromMeta || undefined;
}

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-api-key",
  "access-control-max-age": "86400",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

/** Constant-time comparison so the key cannot be guessed by timing. */
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function presentedKey(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  return bearer || (request.headers.get("x-api-key") ?? "").trim();
}

/** Sliding one-minute window, in memory (single instance). */
const calls: number[] = [];
function isRateLimited(): boolean {
  const now = Date.now();
  while (calls.length > 0 && now - calls[0] > RATE_WINDOW_MS) calls.shift();
  if (calls.length >= RATE_LIMIT_PER_MINUTE) return true;
  calls.push(now);
  return false;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, "Body too large.");
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "Body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

/** Supabase connection used by the file endpoints (server side only). */
function supabaseConfig(): { url: string; key: string } {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) {
    throw new HttpError(500, "Supabase is not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, authorization: `Bearer ${key}`, ...extra };
}

function prospectPublicUrl(url: string, path: string) {
  return `${url}/storage/v1/object/public/${PROSPECT_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function prospectViewerUrl(publicLink: string) {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicLink)}`;
}

/** Resolves a SaaS project from ?project_id= (uuid) or ?project= (exact name). */
async function resolveProject(input: {
  projectId?: string;
  projectName?: string;
}): Promise<{ id: string; name: string }> {
  const { url, key } = supabaseConfig();
  const projectId = (input.projectId ?? "").trim();
  const projectName = (input.projectName ?? "").trim();
  if (!projectId && !projectName) {
    throw new HttpError(400, "project_id (uuid) or project (name) is required.");
  }

  const query = projectId
    ? `id=eq.${encodeURIComponent(projectId)}`
    : `project_name=eq.${encodeURIComponent(projectName)}`;
  const response = await fetch(
    `${url}/rest/v1/saas_projects?select=id,project_name&${query}&limit=1`,
    { headers: supabaseHeaders(key) },
  );
  if (!response.ok) {
    throw new HttpError(500, `Could not read saas_projects: ${await response.text()}`);
  }
  const rows = (await response.json()) as Array<{ id: string; project_name?: string }>;
  const row = rows[0];
  if (!row) {
    throw new HttpError(
      404,
      projectId ? `No SaaS project with id ${projectId}.` : `No SaaS project named "${projectName}".`,
    );
  }
  return { id: String(row.id), name: String(row.project_name ?? projectName) };
}

async function listProspectFiles(url: URL): Promise<unknown[]> {
  const { url: base, key } = supabaseConfig();
  const project = await resolveProject({
    projectId: url.searchParams.get("project_id") ?? "",
    projectName: url.searchParams.get("project") ?? "",
  });
  const response = await fetch(
    `${base}/rest/v1/${PROSPECT_TABLE}?select=*&saas_project_id=eq.${encodeURIComponent(project.id)}&order=created_at.desc`,
    { headers: supabaseHeaders(key) },
  );
  if (!response.ok) {
    throw new HttpError(500, `Could not read ${PROSPECT_TABLE}: ${await response.text()}`);
  }
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const path = String(row["storage_path"] ?? "");
    const publicLink = path ? prospectPublicUrl(base, path) : "";
    return {
      id: row["id"],
      project: project.name,
      project_id: project.id,
      file_name: row["file_name"],
      file_type: row["file_type"],
      file_size: row["file_size"],
      created_at: row["created_at"],
      viewer_url: publicLink ? prospectViewerUrl(publicLink) : null,
      download_url: publicLink || null,
    };
  });
}

async function uploadProspectFile(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new HttpError(
      415,
      "Send multipart/form-data with a 'file' field plus 'project_id' or 'project'.",
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof (file as Blob).arrayBuffer !== "function") {
    throw new HttpError(400, "file is required (multipart field named 'file').");
  }
  const upload = file as File;
  const fileName = String(upload.name ?? "file");
  if (!PROSPECT_ALLOWED.test(fileName)) {
    throw new HttpError(400, "Only Word (.doc, .docx) or Excel (.xls, .xlsx) files are accepted.");
  }
  if (upload.size > PROSPECT_MAX_BYTES) {
    throw new HttpError(413, "File is larger than 10 MB.");
  }

  const project = await resolveProject({
    projectId: String(form.get("project_id") ?? ""),
    projectName: String(form.get("project") ?? ""),
  });

  const { url, key } = supabaseConfig();
  const safeName = fileName.replace(/[^\w.\- ()]/g, "_").slice(-120);
  const path = `${project.id}/${Date.now()}-${safeName}`;
  const bytes = await upload.arrayBuffer();

  const put = await fetch(
    `${url}/storage/v1/object/${PROSPECT_BUCKET}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: supabaseHeaders(key, {
        "content-type": upload.type || "application/octet-stream",
        "x-upsert": "false",
      }),
      body: bytes,
    },
  );
  if (!put.ok) {
    throw new HttpError(500, `Upload failed: ${await put.text()}`);
  }

  const insert = await fetch(`${url}/rest/v1/${PROSPECT_TABLE}`, {
    method: "POST",
    headers: supabaseHeaders(key, {
      "content-type": "application/json",
      prefer: "return=representation",
    }),
    body: JSON.stringify({
      saas_project_id: project.id,
      file_name: fileName,
      file_type: upload.type || null,
      file_size: upload.size,
      storage_path: path,
      created_by: "api",
    }),
  });
  if (!insert.ok) {
    await fetch(`${url}/storage/v1/object/${PROSPECT_BUCKET}/${path}`, {
      method: "DELETE",
      headers: supabaseHeaders(key),
    });
    throw new HttpError(500, `Could not save the file record: ${await insert.text()}`);
  }

  const publicLink = prospectPublicUrl(url, path);
  const [row] = (await insert.json()) as Array<Record<string, unknown>>;
  return json(
    {
      file: {
        id: row?.["id"] ?? null,
        project: project.name,
        project_id: project.id,
        file_name: fileName,
        file_type: upload.type || null,
        file_size: upload.size,
        storage_path: path,
        viewer_url: prospectViewerUrl(publicLink),
        download_url: publicLink,
      },
    },
    201,
  );
}

async function deleteProspectFile(id: string): Promise<Response> {
  const { url, key } = supabaseConfig();
  const read = await fetch(
    `${url}/rest/v1/${PROSPECT_TABLE}?select=storage_path&id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: supabaseHeaders(key) },
  );
  if (!read.ok) throw new HttpError(500, `Could not read ${PROSPECT_TABLE}: ${await read.text()}`);
  const rows = (await read.json()) as Array<{ storage_path?: string }>;
  if (!rows[0]) throw new HttpError(404, `No prospect file with id ${id}.`);

  const path = String(rows[0].storage_path ?? "");
  if (path) {
    await fetch(
      `${url}/storage/v1/object/${PROSPECT_BUCKET}/${path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      { method: "DELETE", headers: supabaseHeaders(key) },
    );
  }
  const removed = await fetch(`${url}/rest/v1/${PROSPECT_TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: supabaseHeaders(key),
  });
  if (!removed.ok) {
    throw new HttpError(500, `Could not delete the file record: ${await removed.text()}`);
  }
  return json({ deleted: id });
}

async function runAgent(
  message: string,
  history: unknown,
): Promise<{ reply: string; ms: number }> {
  const previous: Message[] = (Array.isArray(history) ? history : [])
    .filter(
      (item): item is Message =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { content?: unknown }).content === "string" &&
        ["user", "assistant"].includes(String((item as { role?: unknown }).role)),
    )
    .slice(-MAX_HISTORY)
    .map((item) => ({ role: item.role, content: item.content }));

  const started = Date.now();
  const reply = await runLoop(
    [
      { role: "system", content: SYSTEM_PROMPT },
      ...previous,
      { role: "user", content: message },
    ],
    tools,
    executeTool,
  );
  return { reply: String(reply.content ?? ""), ms: Date.now() - started };
}

/**
 * Returns null when the request is not for this API, so the caller can fall
 * through to the normal SSR/app handler.
 */
export async function handleDashboardApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (!path.startsWith("/api/")) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (path === "/api/health") {
    return json({ ok: true, service: "my-business-os-api", time: new Date().toISOString() });
  }

  const expected = env("DASHBOARD_API_KEY");
  if (!expected) {
    return json(
      {
        error: "API is not configured on the server.",
        hint: "Add DASHBOARD_API_KEY to .env.local and restart the server.",
      },
      503,
    );
  }
  if (!safeEqual(presentedKey(request), expected)) {
    return json(
      { error: "Unauthorized.", hint: "Send the key as: Authorization: Bearer <DASHBOARD_API_KEY>" },
      401,
    );
  }
  if (isRateLimited()) {
    return json({ error: `Rate limit exceeded (${RATE_LIMIT_PER_MINUTE} requests/minute).` }, 429);
  }

  try {
    if (path === "/api") {
      return json({
        service: "my-business-os-api",
        endpoints: [
          "GET /api/health",
          "GET /api/overview",
          "POST /api/agent",
          "GET /api/tasks?status=&limit=",
          "POST /api/tasks",
          "PATCH /api/tasks/:id",
          "GET /api/research?section=",
          "POST /api/research",
          "POST /api/research/:id/apply",
          "GET /api/prospect-files?project_id=|project=",
          "POST /api/prospect-files",
          "DELETE /api/prospect-files/:id",
        ],
      });
    }

    if (path === "/api/prospect-files") {
      if (request.method === "GET") {
        return json({ files: await listProspectFiles(url) });
      }
      if (request.method === "POST") {
        return await uploadProspectFile(request);
      }
      throw new HttpError(405, "Use GET or POST.");
    }

    const prospectMatch = path.match(/^\/api\/prospect-files\/([^/]+)$/);
    if (prospectMatch) {
      if (request.method !== "DELETE") throw new HttpError(405, "Use DELETE.");
      return await deleteProspectFile(decodeURIComponent(prospectMatch[1]));
    }

    if (path === "/api/overview") {
      if (request.method !== "GET") throw new HttpError(405, "Use GET.");
      return json(await computeInsights());
    }

    if (path === "/api/agent") {
      if (request.method !== "POST") throw new HttpError(405, "Use POST.");
      const body = await readJson(request);
      const message = String(body["message"] ?? "").trim();
      if (!message) throw new HttpError(400, "message is required.");
      const result = await runAgent(message, body["history"]);
      return json(result);
    }

    if (path === "/api/tasks") {
      if (request.method === "GET") {
        const status = (url.searchParams.get("status") ?? "").trim();
        const requested = Number(url.searchParams.get("limit") ?? "50");
        const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 200) : 50;
        const rows = await executeTool("query_table", {
          table: "tasks",
          filters: [{ column: "status", operator: "eq", value: status }],
          order_by: "status",
          order_asc: false,
          limit,
        });
        return json({ tasks: rows });
      }
      if (request.method === "POST") {
        const body = await readJson(request);
        const task = await executeTool("create_task", body);
        return json({ task }, 201);
      }
      throw new HttpError(405, "Use GET or POST.");
    }

    if (path === "/api/research") {
      if (request.method === "GET") {
        const section = (url.searchParams.get("section") ?? "").trim();
        const rows = await executeTool("query_table", {
          table: "research_reports",
          filters: [
            { column: "section", operator: "eq", value: section },
          ],
          order_by: "created_at",
          order_asc: false,
          limit: 20,
        });
        return json({ reports: rows });
      }
      if (request.method === "POST") {
        const body = await readJson(request);
        const report = await researchInternals.run(
          String(body["section"] ?? "").trim(),
          String(body["question"] ?? "").trim(),
        );
        return json({ report }, 201);
      }
      throw new HttpError(405, "Use GET or POST.");
    }

    const researchApplyMatch = path.match(/^\/api\/research\/([^/]+)\/apply$/);
    if (researchApplyMatch) {
      if (request.method !== "POST") throw new HttpError(405, "Use POST.");
      const result = await researchInternals.apply(decodeURIComponent(researchApplyMatch[1]));
      return json(result);
    }

    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      if (request.method !== "PATCH") throw new HttpError(405, "Use PATCH.");
      const body = await readJson(request);
      const status = String(body["status"] ?? "").trim();
      if (!status) throw new HttpError(400, "status is required.");
      const task = await executeTool("update_task_status", {
        task_id: decodeURIComponent(taskMatch[1]),
        status,
      });
      return json({ task });
    }

    throw new HttpError(404, `Unknown endpoint: ${request.method} ${path}`);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    const message =
      error instanceof Error
        ? error.message
        : ((error as { message?: string } | null)?.message ?? "Unknown error.");
    console.error("[api]", message);
    return json({ error: message }, 500);
  }
}

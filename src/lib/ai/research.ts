import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

import { chatCompletions } from "./client";
import { TABLE_COLUMNS, isValidTable } from "./schemas";
import { executeTool } from "./tools";
import { webSearch as searchWeb, webSearchConfigured } from "./web";

/**
 * Research assistant: one report per question, per dashboard section.
 *
 * A run combines two sources — a snapshot of the user's own rows for that
 * section (read through the same tools the chatbot uses) and live web results
 * from Exa — into a single model call, then stores the report plus the record
 * changes it proposes. Nothing is written to the business tables until the
 * user presses Apply.
 */

export type ResearchSection = {
  key: string;
  label: string;
  tables: string[];
  hint: string;
};

export const RESEARCH_SECTIONS: ResearchSection[] = [
  {
    key: "tasks",
    label: "Tâches",
    tables: ["tasks"],
    hint: "priorités, charge de travail, retards",
  },
  { key: "customers", label: "Clients", tables: ["customers"], hint: "fidélisation, prix, risque de départ" },
  { key: "sales", label: "Ventes", tables: ["sales"], hint: "revenus, meilleures ventes, marges" },
  {
    key: "cars",
    label: "Achat de voitures",
    tables: ["car_buyers"],
    hint: "demande acheteurs, prix du marché",
  },
  { key: "saas", label: "SaaS", tables: ["saas_projects"], hint: "product-market fit, croissance" },
  {
    key: "websites",
    label: "Sites clients",
    tables: ["client_websites"],
    hint: "livraison, renouvellement, upsell",
  },
  {
    key: "products",
    label: "Produits digitaux",
    tables: ["digital_products"],
    hint: "prix, demande, positionnement",
  },
  { key: "resources", label: "Ressources", tables: ["resources"], hint: "contenus à produire" },
  { key: "leads", label: "Leads", tables: ["leads"], hint: "conversion, relances, qualification" },
  {
    key: "properties",
    label: "Immobilier",
    tables: ["properties", "property_dataset", "property_leads"],
    hint: "prix au m², demande, communes",
  },
  {
    key: "velora",
    label: "Velora",
    tables: ["velora_clients", "velora_orders", "velora_expenses"],
    hint: "marge, opérations, coûts",
  },
  {
    key: "expenses",
    label: "Dépenses",
    tables: ["personal_expenses"],
    hint: "habitudes de dépense, économies possibles",
  },
  { key: "team", label: "Équipe", tables: ["team_members"], hint: "capacité, délégation" },
];

export type ResearchSource = { title: string; url: string; snippet?: string };

export type ResearchAction = {
  kind: "create" | "update";
  table: string;
  id?: string;
  values: Record<string, unknown>;
  why?: string;
};

export type ResearchReport = {
  id: string;
  section: string;
  question: string;
  summary: string | null;
  findings: string | null;
  sources: ResearchSource[] | null;
  actions: ResearchAction[] | null;
  applied_at: string | null;
  created_at: string;
};

const MAX_ROWS_PER_TABLE = 6;
const MAX_ACTIONS = 5;
const MAX_FINDINGS = 8000;

function env(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const fromMeta = import.meta.env?.[name]?.trim();
  return fromMeta || undefined;
}

export function sectionByKey(key: string): ResearchSection | undefined {
  return RESEARCH_SECTIONS.find((section) => section.key === key);
}

/** Compact look at what the section actually contains right now. */
async function gatherSnapshot(section: ResearchSection): Promise<string> {
  const snapshot: Record<string, unknown> = {};
  for (const table of section.tables) {
    try {
      const summary = await executeTool("summarize_table", { table });
      const recent = await executeTool("query_table", {
        table,
        order_by: "created_at",
        order_asc: false,
        limit: MAX_ROWS_PER_TABLE,
      });
      snapshot[table] = { summary, recent };
    } catch (error) {
      snapshot[table] = { error: error instanceof Error ? error.message : "unavailable" };
    }
  }
  return JSON.stringify(snapshot).slice(0, 9000);
}

/** Live web results. Returns an empty list when EXA_API_KEY is not configured. */
async function webSearch(query: string, numResults = 4): Promise<ResearchSource[]> {
  if (!webSearchConfigured()) return [];
  try {
    const results = await searchWeb(query, numResults);
    return results.map((item) => ({ title: item.title, url: item.url, snippet: item.snippet }));
  } catch (error) {
    console.error("[research] web search error:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Allowed columns per section table, so proposed writes stay valid. */
function columnGuide(section: ResearchSection): string {
  return section.tables
    .filter(isValidTable)
    .map((table) => `${table}: ${(TABLE_COLUMNS as Record<string, string[]>)[table]?.join(", ") ?? ""}`)
    .join("\n");
}

const RESEARCH_SYSTEM = `You are the research analyst inside My Business OS, a private business dashboard.

You receive (1) a snapshot of the user's own rows for one dashboard section and (2) live web search results.
Produce decisions the user can act on today: what their data says, what the outside world says, and the next moves.

RULES
- Reply in the language of the user's question (French question -> French answer).
- Every number about the business must come from the snapshot. Never invent figures. If data is thin, say so plainly.
- Web facts get their URL in parentheses. Ignore web results that do not fit the question.
- Propose at most ${MAX_ACTIONS} record changes, and only when the data clearly justifies them.
  Do not propose deletes. Do not touch id, created_at, user_id or other protected columns.
- Return ONLY a JSON object, no prose outside it, in this exact shape:
{"summary": "2-3 sentences with the headline finding",
 "findings": "markdown: short sections and bullets, concrete numbers, what to do next",
 "sources": [{"title": "page title", "url": "https://..."}],
 "actions": [{"kind": "create", "table": "table_name", "values": {"column": "value"}, "why": "one short reason"}]}
Use "kind": "update" with an "id" copied from the snapshot when changing an existing row.
If no record change makes sense, return "actions": [].`;

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function normalizeSources(value: unknown): ResearchSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: String(item["title"] ?? item["url"] ?? "Source").slice(0, 200),
      url: String(item["url"] ?? "").slice(0, 500),
    }))
    .filter((item) => /^https?:\/\//i.test(item.url))
    .slice(0, 8);
}

function normalizeActions(value: unknown, section: ResearchSection): ResearchAction[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(section.tables);
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const kind = item["kind"] === "update" ? "update" : "create";
      const table = String(item["table"] ?? "");
      const values =
        item["values"] && typeof item["values"] === "object" && !Array.isArray(item["values"])
          ? (item["values"] as Record<string, unknown>)
          : {};
      return {
        kind,
        table,
        id: item["id"] === undefined ? undefined : String(item["id"]),
        values,
        why: item["why"] === undefined ? undefined : String(item["why"]).slice(0, 300),
      } satisfies ResearchAction;
    })
    .filter((action) => allowed.has(action.table) && Object.keys(action.values).length > 0)
    .filter((action) => action.kind === "create" || Boolean(action.id))
    .slice(0, MAX_ACTIONS);
}

async function runResearchInternal(sectionKey: string, question: string): Promise<ResearchReport> {
  const section = sectionByKey(sectionKey);
  if (!section) throw new Error(`Unknown section "${sectionKey}".`);
  const asked = question.trim();
  if (asked.length < 3) throw new Error("Ask a longer question (at least a few words).");

  // Fetch the two sources at the same time: they are independent.
  const [snapshot, web] = await Promise.all([
    gatherSnapshot(section),
    webSearch(`${asked} ${section.label} ${section.hint}`),
  ]);

  const userContent = [
    `SECTION: ${section.label} (${section.key})`,
    `USER QUESTION: ${asked}`,
    `TABLES AND COLUMNS YOU MAY WRITE TO:\n${columnGuide(section)}`,
    `DASHBOARD DATA:\n${snapshot}`,
    web.length > 0
      ? `WEB RESULTS:\n${JSON.stringify(web).slice(0, 6000)}`
      : "WEB RESULTS: none available right now — answer from the dashboard data only and say that live web data was unavailable.",
  ].join("\n\n");

  const { data } = await chatCompletions({
    messages: [
      { role: "system", content: RESEARCH_SYSTEM },
      { role: "user", content: userContent },
    ],
    temperature: 0.4,
  });

  const raw = String((data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) throw new Error("The model returned an empty answer.");

  const parsed = extractJson(raw);
  const summary = String(parsed?.["summary"] ?? "").trim() || raw.slice(0, 300);
  const findings = (String(parsed?.["findings"] ?? "").trim() || raw).slice(0, MAX_FINDINGS);
  const sources = normalizeSources(parsed?.["sources"]);
  const actions = normalizeActions(parsed?.["actions"], section);

  const { data: row, error } = await (supabase.from("research_reports" as never) as any)
    .insert({
      section: section.key,
      question: asked,
      summary,
      findings,
      sources,
      actions,
      created_by: "dashboard",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return row as ResearchReport;
}

async function applyResearchInternal(id: string) {
  const { data: row, error } = await (supabase.from("research_reports" as never) as any)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Report not found.");
  if (row.applied_at) return { applied: 0, results: [], alreadyApplied: true };

  const actions = Array.isArray(row.actions) ? (row.actions as ResearchAction[]) : [];
  const results: Array<{ table: string; kind: string; ok: boolean; detail: string }> = [];

  for (const action of actions) {
    if (!isValidTable(action.table)) {
      results.push({ table: action.table, kind: action.kind, ok: false, detail: "Unknown table" });
      continue;
    }
    try {
      if (action.kind === "update") {
        if (!action.id) throw new Error("Missing id for update.");
        const updated = await executeTool("update_record", {
          table: action.table,
          id: action.id,
          values: action.values,
        });
        results.push({
          table: action.table,
          kind: "update",
          ok: true,
          detail: `${(updated as { updated?: number })?.updated ?? 1} row(s) updated`,
        });
      } else {
        const created = await executeTool("create_record", {
          table: action.table,
          values: action.values,
        });
        results.push({
          table: action.table,
          kind: "create",
          ok: true,
          detail: `created ${String((created as Record<string, unknown>)?.["id"] ?? "row")}`,
        });
      }
    } catch (err) {
      results.push({
        table: action.table,
        kind: action.kind,
        ok: false,
        detail: err instanceof Error ? err.message : "failed",
      });
    }
  }

  const { error: updateError } = await (supabase.from("research_reports" as never) as any)
    .update({ applied_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  return { applied: results.filter((r) => r.ok).length, results, alreadyApplied: false };
}

/** Called by the Research page (server function — no API key in the browser). */
export const runResearch = createServerFn({ method: "POST" })
  .validator(z.object({ section: z.string().min(1), question: z.string().min(3).max(2000) }))
  .handler(async ({ data }) => runResearchInternal(data.section, data.question));

/** Writes a report's proposed changes into the dashboard tables. */
export const applyResearch = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => applyResearchInternal(data.id));

/** Reusable from the key-protected HTTP API (Telegram bot). */
export const researchInternals = {
  run: runResearchInternal,
  apply: applyResearchInternal,
  sections: RESEARCH_SECTIONS,
};

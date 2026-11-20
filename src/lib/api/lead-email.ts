/**
 * Prospection par e-mail — envoi réel via l'API Brevo (v3).
 *
 * Le navigateur ne voit jamais la clé : le bouton « Envoyer un e-mail » du
 * dashboard appelle POST /api/leads/email avec le code d'accès, et c'est le
 * serveur qui envoie. Les bots utilisent la même route avec
 * `Authorization: Bearer <DASHBOARD_API_KEY>`.
 *
 * Variables d'environnement (serveur uniquement, jamais dans le bundle client) :
 *   BREVO_API_KEY        clé API Brevo
 *   BREVO_SENDER_EMAIL   adresse d'expédition vérifiée dans Brevo
 *   BREVO_SENDER_NAME    nom affiché (facultatif)
 *
 * Aucun envoi n'est simulé : si la clé manque, la route répond 503 avec la
 * configuration attendue, et l'interface affiche la marche à suivre.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const MAX_RECIPIENTS = 25;
const MAX_SUBJECT = 200;
const MAX_BODY = 8000;
/** Brevo tolère plusieurs appels par seconde ; on reste prudent. */
const SEND_DELAY_MS = 400;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

type Lead = {
  id: string;
  name: string;
  email: string;
  city: string;
  status: string;
};

type SendResult = {
  id: string;
  email: string;
  name: string;
  ok: boolean;
  error?: string;
  /** Erreur qui condamne tout le reste de l'envoi (compte non activé, quota…). */
  fatal?: boolean;
};

/** Brevo répond 403 tant que le compte n'est pas activé : réessayer ne sert à rien. */
function isAccountBlocked(status: number, detail: string): boolean {
  if (status !== 403) return false;
  return /not yet activated|not activated|account is not activated|activate your account/i.test(detail);
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

export function leadEmailConfig() {
  const apiKey = env("BREVO_API_KEY");
  const senderEmail = env("BREVO_SENDER_EMAIL");
  return {
    provider: "brevo",
    configured: Boolean(apiKey && senderEmail),
    sender_email: senderEmail ?? null,
    sender_name: env("BREVO_SENDER_NAME") ?? null,
    max_per_request: MAX_RECIPIENTS,
    daily_free_quota: 300,
    missing: [
      ...(apiKey ? [] : ["BREVO_API_KEY"]),
      ...(senderEmail ? [] : ["BREVO_SENDER_EMAIL"]),
    ],
  };
}

const ALGERIA_HINT =
  /alg[ée]rie|alger|oran|constantine|annaba|blida|setif|s[ée]tif|tizi|bejaia|b[ée]ja[ïi]a|batna|djelfa|biskra|tlemcen|tiaret|mostaganem|mascara|skikda|jijel|guelma|mila|bouira|chlef|adrar|ghardaia/i;

/** Un lead est français quand ses notes le disent et qu'aucun indice algérien ne contredit. */
function isFrenchLead(row: Record<string, unknown>): boolean {
  const notes = String(row["notes"] ?? "");
  if (!/france/i.test(notes)) return false;
  const city = String(row["desired_city"] ?? "");
  return !ALGERIA_HINT.test(city);
}

function toLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row["id"] ?? ""),
    name: String(row["name"] ?? "").trim(),
    email: String(row["email"] ?? "").trim(),
    city: String(row["desired_city"] ?? "").trim(),
    status: String(row["status"] ?? "").trim(),
  };
}

async function readLeadsById(ids: string[]): Promise<Lead[]> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  if (ids.length === 0) return [];
  const filter = `id=in.(${ids.map((id) => encodeURIComponent(id)).join(",")})`;
  const response = await fetch(
    `${config.url}/rest/v1/leads?select=id,name,email,desired_city,status&${filter}`,
    { headers: { apikey: config.key, authorization: `Bearer ${config.key}` } },
  );
  if (!response.ok) throw new Error(`Could not read leads: ${await response.text()}`);
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const byId = new Map(rows.map((row) => [String(row["id"]), toLead(row)]));
  // Keep the caller's order so batches are predictable.
  return ids.map((id) => byId.get(id)).filter((lead): lead is Lead => Boolean(lead));
}

async function readCountryLeads(country: string, limit: number): Promise<Lead[]> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).");
  const response = await fetch(
    `${config.url}/rest/v1/leads?select=id,name,email,desired_city,notes,status&email=not.is.null&order=created_at.asc&limit=500`,
    { headers: { apikey: config.key, authorization: `Bearer ${config.key}` } },
  );
  if (!response.ok) throw new Error(`Could not read leads: ${await response.text()}`);
  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const wantsFrench = /france/i.test(country);
  return rows
    .filter((row) => !wantsFrench || isFrenchLead(row))
    .map(toLead)
    .filter((lead) => lead.email && lead.status !== "Contacted")
    .slice(0, limit);
}

/** Remplace les variables du modèle : {{entreprise}}, {{ville}}, {{email}}, {{expediteur}}. */
function render(template: string, lead: Lead, senderName: string): string {
  return template
    .replace(/\{\{\s*(entreprise|nom|name)\s*\}\}/gi, lead.name || "votre entreprise")
    .replace(/\{\{\s*(ville|city)\s*\}\}/gi, lead.city || "votre commune")
    .replace(/\{\{\s*email\s*\}\}/gi, lead.email)
    .replace(/\{\{\s*(expediteur|sender)\s*\}\}/gi, senderName);
}

function toHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111111">${escaped.replace(/\n/g, "<br />")}</div>`;
}

async function markContacted(lead: Lead): Promise<void> {
  if (lead.status === "Contacted") return;
  const config = supabaseConfig();
  if (!config) return;
  // Only untouched leads move, so a Won/Proposal lead keeps its stage.
  await fetch(
    `${config.url}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}&status=in.(New,)`,
    {
      method: "PATCH",
      headers: {
        apikey: config.key,
        authorization: `Bearer ${config.key}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ status: "Contacted" }),
    },
  ).catch(() => undefined);
}

async function sendOne(input: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  replyTo?: string | undefined;
  subject: string;
  body: string;
  lead: Lead;
}): Promise<SendResult> {
  const base = { id: input.lead.id, email: input.lead.email, name: input.lead.name };
  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": input.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: input.senderEmail, name: input.senderName },
        to: [{ email: input.lead.email, name: input.lead.name || undefined }],
        subject: input.subject,
        htmlContent: toHtml(input.body),
        textContent: input.body,
        replyTo: { email: input.replyTo ?? input.senderEmail, name: input.senderName },
        headers: {
          "List-Unsubscribe": `<mailto:${input.replyTo ?? input.senderEmail}?subject=STOP>`,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      let message = `Brevo HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(detail) as { message?: string; code?: string };
        if (parsed.message) message = `${message} — ${parsed.message}`;
      } catch {
        if (detail) message = `${message} — ${detail.slice(0, 200)}`;
      }
      if (isAccountBlocked(response.status, detail)) {
        return { ...base, ok: false, error: message, fatal: true };
      }
      return { ...base, ok: false, error: message };
    }
    return { ...base, ok: true };
  } catch (error) {
    return {
      ...base,
      ok: false,
      error: error instanceof Error ? error.message : "Envoi impossible",
    };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendProspectingEmails(request: Request): Promise<Response> {
  const config = leadEmailConfig();

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Body must be valid JSON." }, 400);
  }

  const subject = String(body["subject"] ?? "").trim();
  const template = String(body["body"] ?? "").trim();
  if (!subject) return json({ error: "subject is required." }, 400);
  if (subject.length > MAX_SUBJECT) return json({ error: `subject is limited to ${MAX_SUBJECT} characters.` }, 400);
  if (!template) return json({ error: "body is required." }, 400);
  if (template.length > MAX_BODY) return json({ error: `body is limited to ${MAX_BODY} characters.` }, 400);

  const dryRun = body["dry_run"] === true;
  const senderEmail =
    String(body["sender_email"] ?? "").trim() ||
    config.sender_email ||
    (dryRun ? "apercu@exemple.fr" : "");
  const senderName = String(body["sender_name"] ?? "").trim() || config.sender_name || "Mon entreprise";
  const replyTo = String(body["reply_to"] ?? "").trim() || undefined;
  if (!EMAIL_RE.test(senderEmail)) {
    return json({ error: "sender_email must be a valid email address." }, 400);
  }

  const mark = body["mark_contacted"] !== false;
  const skipContacted = body["skip_contacted"] !== false;

  let leads: Lead[];
  try {
    const rawIds = Array.isArray(body["lead_ids"]) ? body["lead_ids"] : [];
    const ids = [...new Set(rawIds.map((id) => String(id)).filter(Boolean))].slice(0, MAX_RECIPIENTS);
    const country = String(body["country"] ?? "").trim();
    if (ids.length > 0) {
      leads = await readLeadsById(ids);
    } else if (country) {
      const limit = Number(body["limit"] ?? MAX_RECIPIENTS);
      leads = await readCountryLeads(
        country,
        Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), MAX_RECIPIENTS) : MAX_RECIPIENTS,
      );
    } else {
      return json(
        { error: "Provide lead_ids (array) or country (e.g. \"France\")." },
        400,
      );
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not read leads." }, 500);
  }

  const valid = leads.filter((lead) => {
    if (!EMAIL_RE.test(lead.email)) return false;
    if (skipContacted && lead.status === "Contacted") return false;
    return true;
  });

  if (valid.length > MAX_RECIPIENTS) {
    return json({ error: `At most ${MAX_RECIPIENTS} recipients per request.` }, 400);
  }
  if (valid.length === 0) {
    return json({ error: "No lead with a usable email address in this selection." }, 400);
  }

  if (dryRun) {
    return json({
      dry_run: true,
      provider: config.provider,
      sender: { email: senderEmail, name: senderName },
      recipients: valid.map((lead) => ({
        id: lead.id,
        email: lead.email,
        subject: render(subject, lead, senderName),
        body: render(template, lead, senderName),
      })),
    });
  }

  if (!config.configured) {
    return json(
      {
        error: "L'envoi d'e-mails n'est pas encore configuré sur le serveur.",
        missing: config.missing,
        hint: "Ajoutez BREVO_API_KEY et BREVO_SENDER_EMAIL (Sites → Secrets, ou .env.local en local), puis redéployez.",
        setup: "https://app.brevo.com/settings/keys/api",
      },
      503,
    );
  }

  const results: SendResult[] = [];
  let aborted = false;
  for (const [index, lead] of valid.entries()) {
    if (index > 0) await sleep(SEND_DELAY_MS);
    const result = await sendOne({
      apiKey: env("BREVO_API_KEY") ?? "",
      senderEmail,
      senderName,
      replyTo,
      subject: render(subject, lead, senderName),
      body: render(template, lead, senderName),
      lead,
    });
    results.push(result);
    if (result.ok && mark) await markContacted(lead);
    // Compte bloqué : on arrête tout de suite au lieu de brûler les lots restants.
    if (result.fatal) {
      aborted = true;
      break;
    }
  }

  const sent = results.filter((r) => r.ok).length;
  return json({
    provider: config.provider,
    sender: { email: senderEmail, name: senderName },
    sent,
    failed: results.length - sent,
    skipped: valid.length - results.length,
    aborted,
    ...(aborted
      ? {
          hint:
            "Brevo refuse l'envoi : le compte n'est pas encore activé. Termine l'activation dans Brevo (vérification du numéro de téléphone et des informations d'entreprise) ou écris à contact@brevo.com pour demander l'activation, puis relance. Les leads non traités restent en statut New.",
          setup: "https://app.brevo.com/settings/account",
        }
      : {}),
    results,
  });
}

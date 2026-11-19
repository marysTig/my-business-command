import { useQueryClient } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCESS_CODE } from "@/lib/access-code";
import { useRows, type Row } from "@/lib/db";
import { leadCountry } from "@/lib/leads";

const CHUNK = 10;
const DRAFT_KEY = "leads-email-draft";
/** Plafond quotidien de l'offre gratuite Brevo (renouvelé chaque jour). */
const DAILY_QUOTA = 300;
/** Le serveur accepte 25 destinataires par requête ; le client découpe tout seul. */
const PER_REQUEST = 25;

const DEFAULT_SUBJECT = "Un site web pour {{entreprise}}";

const DEFAULT_BODY = `Bonjour,

Je me permets de vous écrire car j'accompagne les entreprises de {{ville}} dans la création de sites web : site vitrine, refonte, catalogue en ligne ou prise de rendez-vous.

Un site clair et rapide vous permet d'être trouvé sur Google et de rassurer vos clients avant même le premier contact.

Si cela vous intéresse, répondez simplement à cet e-mail : je vous envoie deux ou trois exemples et un tarif précis, sans engagement.

Bien cordialement,
{{expediteur}}

--
Message adressé à l'adresse professionnelle publiée par {{entreprise}}. Pour ne plus être contacté, répondez « STOP ».`;

type Draft = {
  country: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  limit: string;
  skipContacted: boolean;
};

function readDraft(defaultCountry: string): Draft {
  const fallback: Draft = {
    country: defaultCountry,
    senderName: "",
    senderEmail: "",
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
    limit: "25",
    skipContacted: true,
  };
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

const hasEmail = (row: Row) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(row["email"] ?? "").trim());

/** Même rendu que le serveur : chaque lead reçoit sa propre version du message. */
function renderForLead(template: string, lead: Row, senderName: string): string {
  const entreprise = String(lead["name"] ?? "").trim() || "votre entreprise";
  const ville = String(lead["desired_city"] ?? "").trim() || "votre commune";
  const email = String(lead["email"] ?? "").trim();
  const expediteur = senderName.trim() || "Mon entreprise";
  return template
    .replace(/\{\{\s*(entreprise|nom|name)\s*\}\}/gi, entreprise)
    .replace(/\{\{\s*(ville|city)\s*\}\}/gi, ville)
    .replace(/\{\{\s*email\s*\}\}/gi, email)
    .replace(/\{\{\s*(expediteur|sender)\s*\}\}/gi, expediteur);
}

/**
 * Envoie un e-mail personnalisé aux leads sélectionnés (par pays).
 *
 * L'envoi se fait côté serveur (POST /api/leads/email) : la clé de l'API
 * e-mail ne quitte jamais le serveur. Les leads contactés passent au statut
 * « Contacted » après un envoi réussi.
 */
export function EmailCampaignButton({
  rowFilter,
  defaultCountry = "France",
  label = "Envoyer un e-mail",
}: {
  rowFilter?: (row: Row) => boolean;
  defaultCountry?: string;
  label?: string;
}) {
  const qc = useQueryClient();
  const { data = [] } = useRows("leads", {});
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => readDraft(defaultCountry));
  const [config, setConfig] = useState<{ configured: boolean; sender_email: string | null; missing: string[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [previewId, setPreviewId] = useState("");

  useEffect(() => {
    if (!open) return;
    setSummary(null);
    setProgress(null);
    let cancelled = false;
    fetch("/api/leads/email", { headers: { "x-access-code": ACCESS_CODE } })
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setConfig({ configured: false, sender_email: null, missing: payload?.missing ?? [] });
          return;
        }
        setConfig({
          configured: Boolean(payload.configured),
          sender_email: payload.sender_email ?? null,
          missing: payload.missing ?? [],
        });
        setDraft((prev) =>
          prev.senderEmail || !payload.sender_email
            ? prev
            : { ...prev, senderEmail: String(payload.sender_email) },
        );
      })
      .catch(() => {
        if (!cancelled) setConfig({ configured: false, sender_email: null, missing: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // A full localStorage must never block the composer.
    }
  }, [draft, open]);

  const recipients = useMemo(() => {
    return data.filter((row) => {
      if (rowFilter && !rowFilter(row)) return false;
      if (draft.country !== "all" && leadCountry(row) !== draft.country) return false;
      if (!hasEmail(row)) return false;
      if (draft.skipContacted && String(row["status"] ?? "") === "Contacted") return false;
      return true;
    });
  }, [data, draft.country, draft.skipContacted, rowFilter]);

  const limit = Math.min(Math.max(Math.trunc(Number(draft.limit) || 25), 1), DAILY_QUOTA);
  const targets = recipients.slice(0, limit);
  const requests = Math.max(Math.ceil(targets.length / PER_REQUEST), 0);
  const previewLead = targets.find((row) => String(row["id"]) === previewId) ?? targets[0];
  const canSend =
    config?.configured === true &&
    !busy &&
    targets.length > 0 &&
    draft.subject.trim().length > 0 &&
    draft.body.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(draft.senderEmail.trim());

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSend() {
    if (!canSend) return;
    setBusy(true);
    setSummary(null);
    setProgress({ done: 0, total: targets.length });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    let stopped = false;

    for (let index = 0; index < targets.length; index += CHUNK) {
      const batch = targets.slice(index, index + CHUNK);
      try {
        const response = await fetch("/api/leads/email", {
          method: "POST",
          headers: { "content-type": "application/json", "x-access-code": ACCESS_CODE },
          body: JSON.stringify({
            lead_ids: batch.map((row) => row["id"]),
            subject: draft.subject,
            body: draft.body,
            sender_email: draft.senderEmail,
            sender_name: draft.senderName,
            skip_contacted: draft.skipContacted,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
        sent += Number(payload.sent ?? 0);
        failed += Number(payload.failed ?? 0);
        for (const result of payload.results ?? []) {
          if (!result.ok) errors.push(`${result.email} : ${result.error}`);
        }
        setProgress({ done: Math.min(index + CHUNK, targets.length), total: targets.length });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Envoi impossible");
        stopped = true;
        break;
      }
    }

    setProgress(null);
    setBusy(false);
    setSummary({ sent, failed, errors });
    qc.invalidateQueries({ queryKey: ["leads"] });
    if (sent > 0) toast.success(`${sent} e-mail${sent > 1 ? "s" : ""} envoyé${sent > 1 ? "s" : ""}`);
    if (!stopped && failed > 0) toast.error(`${failed} envoi${failed > 1 ? "s" : ""} en échec`);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        data-testid="leads-email-open"
        onClick={() => setOpen(true)}
        title="Envoyer un e-mail aux prospects sélectionnés"
      >
        <Mail className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="leads-email-dialog" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Envoyer un e-mail aux prospects</DialogTitle>
            <DialogDescription>
              Message personnalisé par prospect. Les leads contactés passent au statut « Contacted ».
            </DialogDescription>
          </DialogHeader>

          {config && !config.configured ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Envoi non configuré</p>
              <p className="mt-1 text-muted-foreground">
                Ajoutez {config.missing.length > 0 ? config.missing.join(" et ") : "BREVO_API_KEY et BREVO_SENDER_EMAIL"}{" "}
                dans Sites → Secrets (ou <code>.env.local</code> en local), puis redéployez. La clé se crée sur{" "}
                <span className="break-all">app.brevo.com/settings/keys/api</span> et l'adresse d'expédition doit être
                vérifiée dans Brevo.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="leads-email-country" className="mb-1.5 block text-sm">
                Destinataires
              </Label>
              <select
                id="leads-email-country"
                aria-label="Filtrer les destinataires par pays"
                data-testid="leads-email-country"
                value={draft.country}
                onChange={(e) => set("country", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="all">Tous les pays</option>
                <option value="France">France</option>
                <option value="Algérie">Algérie</option>
              </select>
            </div>

            <div>
              <Label htmlFor="leads-email-limit" className="mb-1.5 block text-sm">
                Combien d'e-mails personnalisés
              </Label>
              <Input
                id="leads-email-limit"
                aria-label="Nombre d'e-mails personnalisés à envoyer"
                data-testid="leads-email-limit"
                type="number"
                inputMode="numeric"
                min={1}
                max={DAILY_QUOTA}
                step={1}
                value={draft.limit}
                onChange={(e) => set("limit", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground" data-testid="leads-email-capacity">
                Jusqu'à {DAILY_QUOTA} par jour (offre gratuite) · {requests} requête
                {requests > 1 ? "s" : ""} de {PER_REQUEST} maximum, gérée automatiquement.
              </p>
            </div>

            <div>
              <Label htmlFor="leads-email-sender-name" className="mb-1.5 block text-sm">
                Nom expéditeur
              </Label>
              <Input
                id="leads-email-sender-name"
                aria-label="Nom expéditeur"
                data-testid="leads-email-sender-name"
                value={draft.senderName}
                placeholder="Votre nom ou votre entreprise"
                onChange={(e) => set("senderName", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="leads-email-sender-email" className="mb-1.5 block text-sm">
                Adresse expéditrice
              </Label>
              <Input
                id="leads-email-sender-email"
                aria-label="Adresse expéditrice"
                data-testid="leads-email-sender-email"
                value={draft.senderEmail}
                placeholder="contact@votre-domaine.fr"
                onChange={(e) => set("senderEmail", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="leads-email-subject" className="mb-1.5 block text-sm">
                Objet
              </Label>
              <Input
                id="leads-email-subject"
                aria-label="Objet"
                data-testid="leads-email-subject"
                value={draft.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="leads-email-body" className="mb-1.5 block text-sm">
                Message
              </Label>
              <Textarea
                id="leads-email-body"
                aria-label="Message"
                data-testid="leads-email-body"
                rows={10}
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Chaque lead reçoit sa propre version : {"{{entreprise}}"} devient son nom, {"{{ville}}"} sa commune,{" "}
                {"{{email}}"} son adresse et {"{{expediteur}}"} le nom expéditeur. Variables disponibles :{" "}
                {"{{entreprise}}"}, {"{{ville}}"}, {"{{email}}"}, {"{{expediteur}}"}.
              </p>
            </div>

            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/40 p-3" data-testid="leads-email-preview">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="leads-email-preview-lead" className="text-sm">
                  Aperçu personnalisé
                </Label>
                <select
                  id="leads-email-preview-lead"
                  aria-label="Lead à prévisualiser"
                  data-testid="leads-email-preview-lead"
                  value={previewLead ? String(previewLead["id"]) : ""}
                  onChange={(e) => setPreviewId(e.target.value)}
                  disabled={targets.length === 0}
                  className="h-8 max-w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {targets.length === 0 ? <option value="">Aucun destinataire</option> : null}
                  {targets.map((row) => (
                    <option key={String(row["id"])} value={String(row["id"])}>
                      {String(row["name"] ?? "Sans nom")} — {String(row["desired_city"] ?? "ville inconnue")}
                    </option>
                  ))}
                </select>
              </div>
              {previewLead ? (
                <div className="mt-2 space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    À : {String(previewLead["email"] ?? "")} · Objet :{" "}
                    <span className="font-medium text-foreground">
                      {renderForLead(draft.subject, previewLead, draft.senderName)}
                    </span>
                  </p>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-sans text-foreground">
                    {renderForLead(draft.body, previewLead, draft.senderName)}
                  </pre>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun lead avec e-mail pour ce filtre : choisissez un autre pays ou décochez « Ignorer les leads déjà
                  contactés ».
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="leads-email-skip-contacted"
                  checked={draft.skipContacted}
                  onChange={(e) => set("skipContacted", e.target.checked)}
                />
                Ignorer les leads déjà contactés
              </label>
              <span className="text-sm text-muted-foreground" data-testid="leads-email-count">
                {recipients.length} lead{recipients.length > 1 ? "s" : ""} disponible{recipients.length > 1 ? "s" : ""} avec e-mail —{" "}
                {targets.length} dans ce lot{recipients.length > targets.length ? ` (sur ${recipients.length})` : ""}
              </span>
            </div>
          </div>

          {progress ? (
            <div className="space-y-2" data-testid="leads-email-progress">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Envoi en cours : {progress.done} / {progress.total}
              </p>
            </div>
          ) : null}

          {summary ? (
            <div className="rounded-lg border border-border p-3 text-sm" data-testid="leads-email-summary">
              <p>
                <strong>{summary.sent}</strong> envoyé{summary.sent > 1 ? "s" : ""} ·{" "}
                <strong>{summary.failed}</strong> en échec
              </p>
              {summary.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-destructive">
                  {summary.errors.slice(0, 20).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" data-testid="leads-email-close" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button data-testid="leads-email-send" disabled={!canSend} onClick={handleSend}>
              <Send className="size-4" />
              {busy ? "Envoi…" : `Envoyer ${targets.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

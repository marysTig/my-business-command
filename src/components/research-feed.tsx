import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applyResearch, runResearch, sectionByKey, RESEARCH_SECTIONS } from "@/lib/ai/research";
import { formatDate, useDeleteRow, useRows, type Row } from "@/lib/db";

/**
 * JSONB columns come back as arrays, but a report written by an older bot build
 * can hold a JSON string instead. Normalise both so a single odd row cannot
 * take the whole page down.
 */
function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * The bot may file a report under the section key, its label or one of its
 * tables ("saas", "SaaS", "saas_projects"), so every comparison is lenient.
 */
function matchesSection(value: unknown, key: string): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return false;
  const meta = sectionByKey(key);
  const names = [key, meta?.label ?? "", ...(meta?.tables ?? [])]
    .map((name) => name.toLowerCase())
    .filter(Boolean);
  return names.some((name) => raw === name || raw.includes(name));
}

function tryJson(raw: string): unknown {
  if (!/^[[{]/.test(raw)) return null;
  // Some rows carry one or two stray closing brackets around an otherwise
  // valid JSON array, so retry after shaving the tail before giving up.
  for (let drop = 0; drop <= 2; drop += 1) {
    const candidate = drop === 0 ? raw : raw.slice(0, -drop);
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next shorter candidate
    }
  }
  return null;
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return <span>—</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((item, index) => (
          <li key={index}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-0.5">
        {Object.entries(value as Record<string, unknown>).map(([key, inner]) => (
          <p key={key}>
            <span className="font-medium text-foreground">{key} : </span>
            {renderValue(inner)}
          </p>
        ))}
      </div>
    );
  }
  return <span>{String(value)}</span>;
}

function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="rounded bg-muted px-1 py-0.5">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
}

/** Findings arrive as light markdown: headings, bullets, bold, inline code. */
function Markdownish({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc space-y-1 pl-4">
        {bullets.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  text.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, ""));
      return;
    }
    flushBullets();
    if (/^#{1,6}\s+/.test(trimmed)) {
      blocks.push(
        <p key={index} className="mt-2 text-sm font-semibold text-foreground">
          {inline(trimmed.replace(/^#{1,6}\s+/, ""))}
        </p>,
      );
      return;
    }
    blocks.push(<p key={index}>{inline(trimmed)}</p>);
  });
  flushBullets();

  return (
    <div
      className="space-y-1 text-xs leading-relaxed text-muted-foreground"
      data-testid="research-findings"
    >
      {blocks}
    </div>
  );
}

/**
 * Findings are markdown prose in recent reports, but an older run stored a JSON
 * array as a string — render that as a readable list instead of raw brackets.
 */
function Findings({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? tryJson(value.trim()) : value;
  if (parsed && typeof parsed === "object") {
    return (
      <div className="text-xs leading-relaxed text-muted-foreground" data-testid="research-findings">
        {renderValue(parsed)}
      </div>
    );
  }
  const text = String(value).trim();
  if (!text) return null;
  return <Markdownish text={text} />;
}

function sectionLabel(value: unknown): string {
  const raw = String(value ?? "");
  const match = RESEARCH_SECTIONS.find((item) => matchesSection(raw, item.key));
  return match?.label ?? (raw || "—");
}

/**
 * Inbox of the Telegram research bot: every report it files, newest first, with
 * the record changes it proposes. Reports are filtered with native radio inputs
 * so a bot can pick a section without touching a portal-based picker.
 */
export function ResearchFeed() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState("all");
  const [applying, setApplying] = useState<string | null>(null);
  const [runSection, setRunSection] = useState("general");
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const remove = useDeleteRow("research_reports");

  const { data = [], isLoading } = useRows("research_reports", {
    order: { column: "created_at", ascending: false },
    limit: 200,
  });

  const rows = section === "all" ? data : data.filter((row) => matchesSection(row["section"], section));

  async function launch(event: React.FormEvent) {
    event.preventDefault();
    if (running) return;
    const asked = question.trim();
    if (asked.length < 3) {
      setRunResult({ ok: false, message: "Écris une question de quelques mots." });
      return;
    }
    setRunning(true);
    setRunResult(null);
    try {
      await runResearch({ data: { section: runSection, question: asked } });
      setRunResult({ ok: true, message: "Recherche terminée et enregistrée ci-dessous." });
      setQuestion("");
      await queryClient.invalidateQueries({ queryKey: ["research_reports"] });
    } catch (error) {
      setRunResult({
        ok: false,
        message: error instanceof Error ? error.message : "Échec de la recherche",
      });
    } finally {
      setRunning(false);
    }
  }

  async function apply(report: Row) {
    setApplying(String(report["id"]));
    try {
      const result = await applyResearch({ data: { id: String(report["id"]) } });
      if (result.alreadyApplied) {
        toast.info("Déjà appliqué.");
      } else {
        toast.success(
          `${result.applied} changement${result.applied > 1 ? "s" : ""} appliqué${result.applied > 1 ? "s" : ""}`,
        );
        for (const item of result.results.filter((r) => !r.ok)) {
          toast.error(`${item.table}: ${item.detail}`);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["research_reports"] });
      const tables = sectionByKey(String(report["section"] ?? ""))?.tables ?? [];
      for (const table of tables) {
        await queryClient.invalidateQueries({ queryKey: [table] });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'application");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card data-testid="research-run-card">
        <CardContent className="pt-5">
          <form onSubmit={launch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Section</span>
              <select
                data-testid="research-run-section"
                aria-label="Section de la recherche"
                value={runSection}
                onChange={(event) => setRunSection(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {RESEARCH_SECTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Question</span>
              <input
                data-testid="research-run-question"
                aria-label="Question de recherche"
                placeholder="Ex : quels prix pratiquer pour mes projets SaaS ?"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setRunResult(null);
                }}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
            <Button type="submit" size="sm" data-testid="research-run" disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Lancer
            </Button>
          </form>
          <p
            data-testid="research-run-status"
            role="status"
            className={
              runResult && !runResult.ok
                ? "mt-2 text-xs font-medium text-destructive"
                : "mt-2 text-xs text-muted-foreground"
            }
          >
            {runResult
              ? runResult.message
              : "Recherche web (marché, actualités, concurrents, prospects) : POST /api/research {section, question}. Compte une trentaine de secondes."}
          </p>
        </CardContent>
      </Card>

      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="research-filters">
        <legend className="sr-only">Section</legend>
        <label className="flex cursor-pointer items-center gap-1.5 text-sm">
          <input
            type="radio"
            name="research-section"
            value="all"
            data-testid="research-filter-all"
            checked={section === "all"}
            onChange={() => setSection("all")}
            className="size-4 accent-primary"
          />
          <span>Toutes</span>
        </label>
        {RESEARCH_SECTIONS.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="research-section"
              value={item.key}
              data-testid={`research-filter-${item.key}`}
              checked={section === item.key}
              onChange={() => setSection(item.key)}
              className="size-4 accent-primary"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </fieldset>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Chargement…</CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card data-testid="research-empty">
          <CardContent className="space-y-1 pt-6">
            <p className="text-sm font-medium">Aucune recherche pour l&apos;instant.</p>
            <p className="text-xs text-muted-foreground">
              Le bot Telegram dépose ici chaque recherche (table <code>research_reports</code>).
              Demande-lui par exemple « cherche des idées de prix pour mes produits SaaS ».
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((report) => {
            const actions = list<{ kind: string; table: string; why?: string }>(report["actions"]).filter(
              (action) => action && typeof action === "object",
            );
            const sources = list<{ title?: string; url?: string }>(report["sources"]).filter(
              (source) => source && typeof source === "object",
            );
            const applied = Boolean(report["applied_at"]);

            return (
              <Card key={String(report["id"])} data-testid={`research-report-${report["id"]}`}>
                <CardContent className="space-y-2 pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="size-3" />
                      {sectionLabel(report["section"])}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(String(report["created_at"] ?? ""))}
                    </span>
                    {applied ? (
                      <Badge variant="outline" className="gap-1 text-emerald-600">
                        <Check className="size-3" /> Appliqué
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-8 text-muted-foreground hover:text-destructive"
                      aria-label="Supprimer cette recherche"
                      title="Supprimer cette recherche"
                      data-testid={`research-delete-${report["id"]}`}
                      onClick={() => setDeleting(report)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium">{String(report["question"] ?? "")}</p>
                  {report["summary"] ? (
                    <p className="text-sm text-foreground/90">{String(report["summary"])}</p>
                  ) : null}
                  <Findings value={report["findings"]} />
                  {sources.length > 0 ? (
                    <ul className="space-y-0.5">
                      {sources.map((source, index) => (
                        <li key={index}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-primary hover:underline"
                          >
                            {source.title || source.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {actions.length > 0 ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        data-testid={`research-apply-${report["id"]}`}
                        onClick={() => apply(report)}
                        disabled={applying === String(report["id"]) || applied}
                      >
                        {applying === String(report["id"]) ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {applied ? "Déjà appliqué" : `Appliquer (${actions.length})`}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {actions.map((action) => action.table).join(", ")}
                      </span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        name={deleting ? `« ${String(deleting["question"] ?? "cette recherche")} »` : "cette recherche"}
        onConfirm={() => {
          if (deleting) remove.mutate(String(deleting["id"]));
          setDeleting(null);
        }}
      />
    </div>
  );
}

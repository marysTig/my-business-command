import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { applyResearch, sectionByKey, RESEARCH_SECTIONS } from "@/lib/ai/research";
import { formatDate, useRows, type Row } from "@/lib/db";

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

  const { data = [], isLoading } = useRows("research_reports", {
    order: { column: "created_at", ascending: false },
    limit: 200,
  });

  const rows = section === "all" ? data : data.filter((row) => matchesSection(row["section"], section));

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
                  </div>
                  <p className="text-sm font-medium">{String(report["question"] ?? "")}</p>
                  {report["summary"] ? (
                    <p className="text-sm text-foreground/90">{String(report["summary"])}</p>
                  ) : null}
                  {report["findings"] ? (
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {String(report["findings"])}
                    </p>
                  ) : null}
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
    </div>
  );
}

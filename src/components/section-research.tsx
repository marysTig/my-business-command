import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applyResearch, sectionByKey } from "@/lib/ai/research";
import { formatDate, useRows, type Row } from "@/lib/db";

/**
 * "Space" inside a dashboard section where the Telegram research bot drops its
 * findings. The bot writes rows into research_reports (section = this key);
 * this panel reads them and lets the user apply the proposed record changes.
 */
export function SectionResearch({ section }: { section: string }) {
  const queryClient = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);

  const { data = [], isLoading } = useRows("research_reports", {
    filters: { section },
    order: { column: "created_at", ascending: false },
    limit: 5,
  });

  const sectionMeta = sectionByKey(section);
  const tables = sectionMeta?.tables ?? [];

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4" /> Recherches du bot Telegram
          {sectionMeta ? <Badge variant="outline">{sectionMeta.label}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : data.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucune recherche pour l'instant. Le bot Telegram peut en déposer ici
            (section <code>{section}</code>) — il écrit dans la table
            <code> research_reports</code>.
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((report) => {
              const actions = (report["actions"] as
                | Array<{ kind: string; table: string; why?: string; values?: Record<string, unknown> }>
                | null) ?? [];
              const sources = (report["sources"] as Array<{ title?: string; url?: string }> | null) ?? [];
              const applied = Boolean(report["applied_at"]);
              return (
                <div key={String(report["id"])} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
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
                    <p className="mt-1 text-sm text-foreground/90">{String(report["summary"])}</p>
                  ) : null}
                  {report["findings"] ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {String(report["findings"])}
                    </p>
                  ) : null}
                  {sources.length > 0 ? (
                    <ul className="mt-2 space-y-0.5">
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
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
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
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

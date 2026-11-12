import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, useRows, type Row } from "@/lib/db";
import { getMember } from "@/lib/member";

const TABLE = "saas_prospect_files";
const BUCKET = "prospect-lists";
const ACCEPT = ".doc,.docx,.xls,.xlsx";
const ALLOWED = /\.(docx?|xlsx?)$/i;

function formatSize(bytes?: number | null) {
  const value = Number(bytes ?? 0);
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isExcel(name: string) {
  return /\.xlsx?$/i.test(name);
}

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Word/Excel files cannot render natively in a browser, so a direct link would
 * download them. Route the click through Microsoft's Office viewer instead, so
 * the document opens in a new tab.
 */
function viewerUrl(path: string) {
  if (!path) return "#";
  const publicLink = publicUrl(path);
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicLink)}`;
}

export function ProspectFiles() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: projects = [] } = useRows("saas_projects", {
    order: { column: "created_at", ascending: false },
  });
  const { data: files = [], isLoading } = useRows(TABLE, {
    filters: { saas_project_id: projectId },
    enabled: Boolean(projectId),
  });

  async function addFile() {
    if (!projectId || !file || uploading) return;
    if (!ALLOWED.test(file.name)) {
      toast.error("Formats acceptés : Word (.doc, .docx) ou Excel (.xls, .xlsx).");
      return;
    }
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      const { error } = await (supabase.from(TABLE as never) as any).insert({
        saas_project_id: projectId,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        storage_path: path,
        created_by: getMember(),
      });
      if (error) throw error;

      toast.success(`${file.name} ajouté`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: [TABLE] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout du fichier");
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(row: Row) {
    setDeleting(String(row["id"]));
    try {
      await supabase.storage.from(BUCKET).remove([String(row["storage_path"] ?? "")]);
      const { error } = await (supabase.from(TABLE as never) as any)
        .delete()
        .eq("id", row["id"]);
      if (error) throw error;
      toast.success("Fichier supprimé");
      await queryClient.invalidateQueries({ queryKey: [TABLE] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la suppression");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="size-4" /> Liste prospection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Projet SaaS</span>
            <select
              aria-label="Projet SaaS"
              data-testid="prospect-project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-9 w-full min-w-52 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Choisir un projet…</option>
              {projects.map((project) => (
                <option key={String(project["id"])} value={String(project["id"])}>
                  {String(project["project_name"] ?? "Sans nom")}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              Fichier Word / Excel
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              aria-label="Fichier Word ou Excel"
              data-testid="prospect-file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="h-9 w-full min-w-56 cursor-pointer rounded-md border border-input bg-background px-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
            />
          </label>

          <Button
            size="sm"
            data-testid="prospect-add"
            disabled={!projectId || !file || uploading}
            onClick={() => void addFile()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ajouter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {file ? `Fichier sélectionné : ${file.name}` : ".doc, .docx, .xls ou .xlsx"}
        </p>

        {!projectId ? (
          <p className="text-xs text-muted-foreground">
            Sélectionnez un projet SaaS existant pour voir et ajouter sa liste de prospection.
          </p>
        ) : isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun fichier pour ce projet. Choisissez un fichier puis cliquez sur « Ajouter ».
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="hidden sm:table-cell">Ajouté le</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((row) => {
                  const name = String(row["file_name"] ?? "");
                  const path = String(row["storage_path"] ?? "");
                  const Icon = isExcel(name) ? FileSpreadsheet : FileText;
                  return (
                    <TableRow key={String(row["id"])}>
                      <TableCell>
                        <a
                          href={viewerUrl(path)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                        >
                          <Icon className="size-4 text-muted-foreground" />
                          {name || "—"}
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatSize(row["file_size"])}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {formatDate(String(row["created_at"] ?? ""))}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={deleting === String(row["id"])}
                          onClick={() => void removeFile(row)}
                        >
                          {deleting === String(row["id"]) ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

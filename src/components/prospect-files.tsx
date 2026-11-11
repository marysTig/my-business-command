import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function ProspectFiles() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: projects = [] } = useRows("saas_projects", {
    order: { column: "created_at", ascending: false },
  });
  const { data: files = [], isLoading } = useRows(TABLE, {
    filters: { saas_project_id: projectId },
    enabled: Boolean(projectId),
  });

  async function addFile(file: File) {
    if (!projectId) return;
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
      await queryClient.invalidateQueries({ queryKey: [TABLE] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'ajout du fichier");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeFile(row: Row) {
    setDeleting(String(row["id"]));
    try {
      await supabase.storage.from(BUCKET).remove([String(row["storage_path"] ?? "")]);
      const { error } = await (supabase.from(TABLE as never) as any).delete().eq("id", row["id"]);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="sm:w-72">
              <SelectValue placeholder="Choisir un projet…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={String(project["id"])} value={String(project["id"])}>
                  {String(project["project_name"] ?? "Sans nom")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addFile(file);
            }}
          />

          <Button
            size="sm"
            disabled={!projectId || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ajouter
          </Button>
          <span className="text-xs text-muted-foreground">
            Word ou Excel (.doc, .docx, .xls, .xlsx)
          </span>
        </div>

        {!projectId ? (
          <p className="text-xs text-muted-foreground">
            Sélectionnez un projet SaaS existant pour voir et ajouter sa liste de prospection.
          </p>
        ) : isLoading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : files.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun fichier pour ce projet. Cliquez sur « Ajouter » pour déposer une liste Word ou
            Excel.
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
                          href={path ? publicUrl(path) : "#"}
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

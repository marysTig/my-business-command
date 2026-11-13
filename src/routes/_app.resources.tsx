import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ExternalLink, Upload } from "lucide-react";

import { CrudPage } from "@/components/crud-page";
import { RESOURCE_CATEGORIES } from "@/lib/entities";

export const Route = createFileRoute("/_app/resources")({
  head: () => ({
    meta: [
      { title: "Resources — My Business OS" },
      { name: "description", content: "Your library of tools, docs, inspiration and links." },
      { property: "og:title", content: "Resources — My Business OS" },
      { property: "og:description", content: "Your library of tools, docs, inspiration and links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    // Save file metadata to the resources table via Supabase
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);
    formData.append("type", file.type);
    formData.append("size", String(file.size));

    // Update the first resources row with file metadata (or you can select which row)
    fetch("/api/supabase/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `UPDATE public.resources SET file_name = '${file.name}', file_type = '${file.type}', file_size = ${file.size} WHERE id = (SELECT id FROM public.resources LIMIT 1)`
      })
    })
      .then((res) => res.json())
      .then(() => {
        setSelectedFile(null);
        // Refresh the data by re-fetching
        // In a real app, you'd use useQuery/invalidate
      })
      .catch((err) => {
        console.error("Supabase update error:", err);
        setSelectedFile(null);
      });
  };

  return (
    <CrudPage
      table="resources"
      title="Resources"
      description="Inspiration, docs and tools, attached to the work they serve."
      statusField="category"
      statusOptions={RESOURCE_CATEGORIES}
      columns={[
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        {
          key: "url",
          header: "Link",
          render: (r) =>
            r["url"] ? (
              <a
                href={r["url"]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                Open <ExternalLink className="size-3.5" />
              </a>
            ) : (
              "—"
            ),
        },
        {
          key: "file_info",
          header: "File",
          render: (r) => {
            if (!r["file_name"]) return "—";
            const size = r["file_size"] ? ` (${r["file_size"]} bytes)` : "";
            return (
              <span className="text-xs text-muted-foreground">
                {r["file_name"]}{size}
              </span>
            );
          },
        },        {
          key: "drop_zone",
          header: "",
          render: () => (
            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer?.files?.[0];
                if (file) {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.doc,.docx,.xls,.xlsx,.pdf'
                  input.click();
                  input.onchange = handleFileSelect;
                  input.onchange(e => handleFileSelect(e));
                }
              }}
            >
              <Upload className="size-6 mb-2" />
              <p className="text-sm text-muted-foreground">Drag & drop files\nor browse</p>
            </div>
          ),
        },
        {
          key: "tags",
          header: "Tags",
          render: (r) =>
            Array.isArray(r["tags"]) && r["tags"].length ? r["tags"].join(", ") : "—",
        },
      ]}
      actions={
        <>
          <Button size="sm" onClick={() => setSelectedFile(null)}>
            <ExternalLink className="size-4" /> Add resource
          </Button>
          {selectedFile && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>
            </div>
          )}
        </>
      }
    />
  );
}
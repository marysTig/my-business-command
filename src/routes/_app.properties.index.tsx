import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMoney, useRows, useSaveRow, type Row } from "@/lib/db";
import { PROPERTY_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/properties/")({
  head: () => ({
    meta: [
      { title: "Properties — My Business OS" },
      { name: "description", content: "Your active marketplace listings and dataset imports." },
      { property: "og:title", content: "Properties — My Business OS" },
      {
        property: "og:description",
        content: "Your active marketplace listings and dataset imports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertiesPage,
});

function DatasetImport() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const dataset = useRows("property_dataset", {});
  const mine = useRows("properties", {});
  const save = useSaveRow("properties");

  const imported = new Set(
    (mine.data ?? []).map((p) => p["dataset_id"]).filter(Boolean) as string[],
  );

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    const rows = dataset.data ?? [];
    if (!q) return rows.slice(0, 20);
    return rows.filter((r: Row) =>
      ["title", "city", "commune", "property_type"].some((c) =>
        String(r[c] ?? "").toLowerCase().includes(q),
      ),
    );
  }, [dataset.data, term]);

  function importRow(row: Row) {
    if (imported.has(row["id"])) {
      toast.error("This dataset property is already in your listings");
      return;
    }
    save.mutate(
      {
        dataset_id: row["id"],
        title: row["title"],
        description: row["description"],
        city: row["city"],
        commune: row["commune"],
        property_type: row["property_type"],
        price: row["price"],
        surface: row["surface"],
        bedrooms: row["bedrooms"],
        bathrooms: row["bathrooms"],
        images: row["images"] ?? [],
        status: "Draft",
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Database className="size-4" /> From dataset
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add from dataset</DialogTitle>
            <DialogDescription>
              Pick an existing dataset property to add to your active listings. Each one can only be
              added once.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by title, city or type…"
          />
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              results.map((row: Row) => {
                const already = imported.has(row["id"]);
                return (
                  <div
                    key={row["id"]}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row["title"]}</p>
                      <p className="text-xs text-muted-foreground">
                        {row["property_type"]} · {row["commune"] ?? "—"}, {row["city"] ?? "—"} ·{" "}
                        {formatMoney(row["price"], "DZD")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={already ? "ghost" : "default"}
                      disabled={already || save.isPending}
                      onClick={() => importRow(row)}
                    >
                      {already ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PropertiesPage() {
  return (
    <CrudPage
      table="properties"
      title="Properties"
      description="Marketplace listings, imported from your dataset or added manually."
      statusField="status"
      statusOptions={PROPERTY_STATUSES}
      detailPath="/properties/$id"
      toolbar={<DatasetImport />}
      columns={[
        { key: "title", header: "Property" },
        { key: "property_type", header: "Type" },
        {
          key: "city",
          header: "Location",
          render: (r) => [r["commune"], r["city"]].filter(Boolean).join(", ") || "—",
        },
        { key: "price", header: "Price", render: (r) => formatMoney(r["price"], "DZD") },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r["status"]} /> },
      ]}
    />
  );
}

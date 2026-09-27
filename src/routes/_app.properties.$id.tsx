import { Link, createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { LinkOut } from "@/components/external-link";
import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { DetailField, RelatedResources, RelatedTasks } from "@/components/related";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, useDeleteRow, useRow, useRows, useSaveRow } from "@/lib/db";

export const Route = createFileRoute("/_app/properties/$id")({
  head: () => ({
    meta: [
      { title: "Property — My Business OS" },
      { name: "description", content: "Property details, interested leads and marketplace link." },
      { property: "og:title", content: "Property — My Business OS" },
      {
        property: "og:description",
        content: "Property details, interested leads and marketplace link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyDetail,
});

function InterestedLeads({ propertyId }: { propertyId: string }) {
  const links = useRows("property_leads", { filters: { property_id: propertyId } });
  const leads = useRows("leads", {});
  const save = useSaveRow("property_leads");
  const del = useDeleteRow("property_leads");
  const [pick, setPick] = useState("");

  const linkedIds = new Set((links.data ?? []).map((l) => l["lead_id"]));
  const available = (leads.data ?? []).filter((l) => !linkedIds.has(l["id"]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interested leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(links.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads linked yet.</p>
        ) : (
          (links.data ?? []).map((link) => {
            const lead = (leads.data ?? []).find((l) => l["id"] === link["lead_id"]);
            return (
              <div
                key={link["id"]}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Link
                  to="/leads/$id"
                  params={{ id: link["lead_id"] }}
                  className="truncate font-medium hover:underline"
                >
                  {lead?.["name"] ?? "Lead"}
                </Link>
                <span className="flex items-center gap-2">
                  {lead ? <StatusBadge value={lead["status"]} /> : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => del.mutate(link["id"])}
                  >
                    Remove
                  </Button>
                </span>
              </div>
            );
          })
        )}

        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Link a lead…" />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="none" disabled>
                  No other leads
                </SelectItem>
              ) : (
                available.map((l) => (
                  <SelectItem key={l["id"]} value={l["id"]}>
                    {l["name"]}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pick || save.isPending}
            onClick={() => {
              save.mutate(
                { property_id: propertyId, lead_id: pick },
                { onSuccess: () => setPick("") },
              );
            }}
          >
            <Plus className="size-4" /> Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PropertyDetail() {
  const { id } = Route.useParams();
  const { data: property, isLoading } = useRow("properties", id);
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!property)
    return <p className="text-sm text-muted-foreground">This property no longer exists.</p>;

  const images: string[] = Array.isArray(property["images"]) ? property["images"] : [];

  return (
    <>
      <PageHeader
        title={property["title"]}
        description={[property["commune"], property["city"]].filter(Boolean).join(", ") || undefined}
        backTo="/properties"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {images.slice(0, 3).map((src) => (
            <img
              key={src}
              src={src}
              alt={property["title"]}
              className="h-40 w-full rounded-xl border border-border object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Type" value={property["property_type"]} />
            <DetailField label="Status" value={<StatusBadge value={property["status"]} />} />
            <DetailField label="Price" value={formatMoney(property["price"], "DZD")} />
            <DetailField
              label="Surface"
              value={property["surface"] ? `${property["surface"]} m²` : "—"}
            />
            <DetailField label="Bedrooms" value={property["bedrooms"] ?? "—"} />
            <DetailField label="Bathrooms" value={property["bathrooms"] ?? "—"} />
            <DetailField
              label="Source"
              value={property["dataset_id"] ? "Imported from dataset" : "Added manually"}
            />
            <DetailField label="Notes" value={property["notes"] ?? "—"} />
            <div className="sm:col-span-2">
              <DetailField label="Description" value={property["description"] ?? "—"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <LinkOut url={property["marketplace_url"]} label="Open listing" />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <InterestedLeads propertyId={id} />
        </div>
        <RelatedResources filters={{ property_id: id }} />
        <div className="lg:col-span-3">
          <RelatedTasks filters={{ property_id: id }} />
        </div>
      </div>

      <EntityFormDialog
        table="properties"
        open={open}
        onOpenChange={setOpen}
        record={property}
        title="Edit property"
      />
    </>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { DetailField } from "@/components/related";
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

export const Route = createFileRoute("/_app/leads/$id")({
  head: () => ({
    meta: [
      { title: "Lead — My Business OS" },
      { name: "description", content: "Lead details and the properties they are interested in." },
      { property: "og:title", content: "Lead — My Business OS" },
      {
        property: "og:description",
        content: "Lead details and the properties they are interested in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadDetail,
});

function InterestedProperties({ leadId }: { leadId: string }) {
  const links = useRows("property_leads", { filters: { lead_id: leadId } });
  const properties = useRows("properties", {});
  const save = useSaveRow("property_leads");
  const del = useDeleteRow("property_leads");
  const [pick, setPick] = useState("");

  const linkedIds = new Set((links.data ?? []).map((l) => l["property_id"]));
  const available = (properties.data ?? []).filter((p) => !linkedIds.has(p["id"]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Interested properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(links.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties linked yet.</p>
        ) : (
          (links.data ?? []).map((link) => {
            const property = (properties.data ?? []).find((p) => p["id"] === link["property_id"]);
            return (
              <div
                key={link["id"]}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Link
                  to="/properties/$id"
                  params={{ id: link["property_id"] }}
                  className="truncate font-medium hover:underline"
                >
                  {property?.["title"] ?? "Property"}
                </Link>
                <span className="flex items-center gap-2">
                  {property ? <StatusBadge value={property["status"]} /> : null}
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
              <SelectValue placeholder="Link a property…" />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="none" disabled>
                  No other properties
                </SelectItem>
              ) : (
                available.map((p) => (
                  <SelectItem key={p["id"]} value={p["id"]}>
                    {p["title"]}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pick || save.isPending}
            onClick={() =>
              save.mutate({ lead_id: leadId, property_id: pick }, { onSuccess: () => setPick("") })
            }
          >
            <Plus className="size-4" /> Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadDetail() {
  const { id } = Route.useParams();
  const { data: lead, isLoading } = useRow("leads", id);
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!lead) return <p className="text-sm text-muted-foreground">This lead no longer exists.</p>;

  return (
    <>
      <PageHeader
        title={lead["name"]}
        description={lead["source"] ? `Source: ${lead["source"]}` : undefined}
        backTo="/leads"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lead</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Status" value={<StatusBadge value={lead["status"]} />} />
            <DetailField label="Phone" value={lead["phone"] ?? "—"} />
            <DetailField label="Email" value={lead["email"] ?? "—"} />
            <DetailField label="Budget" value={formatMoney(lead["budget"], "DZD")} />
            <DetailField label="Desired city" value={lead["desired_city"] ?? "—"} />
            <DetailField label="Desired type" value={lead["desired_property_type"] ?? "—"} />
            <div className="sm:col-span-2">
              <DetailField label="Notes" value={lead["notes"] ?? "—"} />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <InterestedProperties leadId={id} />
        </div>
      </div>

      <EntityFormDialog
        table="leads"
        open={open}
        onOpenChange={setOpen}
        record={lead}
        title="Edit lead"
      />
    </>
  );
}

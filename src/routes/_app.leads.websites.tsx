import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRows } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/entities";
import { isWebsiteLead } from "@/lib/leads";

export const Route = createFileRoute("/_app/leads/websites")({
  head: () => ({
    meta: [
      { title: "Leads sites web — My Business OS" },
      { name: "description", content: "Prospects qui ont besoin d'un site web : contact, ville et statut." },
      { property: "og:title", content: "Leads sites web — My Business OS" },
      { property: "og:description", content: "Prospects qui ont besoin d'un site web : contact, ville et statut." },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebsiteLeadsPage,
});

const number = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function WebsiteLeadStats() {
  const { data = [] } = useRows("leads", {});
  const rows = data.filter(isWebsiteLead);
  const withPhone = rows.filter((row) => String(row["phone"] ?? "").trim()).length;
  const cities = new Set(
    rows.map((row) => String(row["desired_city"] ?? "").trim()).filter(Boolean),
  ).size;
  const stats = [
    { label: "Leads sites web", value: String(rows.length) },
    { label: "Avec téléphone", value: String(withPhone) },
    { label: "Villes / wilayas", value: String(cities) },
    { label: "Budget estimé (DZD)", value: new Intl.NumberFormat("fr-FR").format(rows.reduce((sum, row) => sum + number(row["budget"]), 0)) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stat.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function WebsiteLeadsPage() {
  return (
    <div className="space-y-6">
      <WebsiteLeadStats />
      <CrudPage
        table="leads"
        title="Leads sites web"
        description="Prospects dont le besoin est un site : vitrine, refonte, catalogue ou prise de rendez-vous."
        statusField="status"
        statusOptions={LEAD_STATUSES}
        rowFilter={isWebsiteLead}
        emptyTitle="Aucun lead site web"
        columns={[
          { key: "name", header: "Entreprise" },
          { key: "phone", header: "Téléphone" },
          { key: "desired_city", header: "Ville / wilaya" },
          {
            key: "service",
            header: "Service",
            render: (row) => (row["service"] ? String(row["service"]) : String(row["desired_property_type"] ?? "—")),
          },
          { key: "status", header: "Statut", render: (row) => <StatusBadge value={row["status"]} /> },
        ]}
      />
    </div>
  );
}

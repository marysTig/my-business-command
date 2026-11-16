import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { ExportLeadsButton } from "@/components/export-leads-button";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRows } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/leads/")({
  head: () => ({
    meta: [
      { title: "Leads — My Business OS" },
      { name: "description", content: "Prospects à contacter, budget estimé et avancement." },
      { property: "og:title", content: "Leads — My Business OS" },
      { property: "og:description", content: "Prospects à contacter, budget estimé et avancement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

const number = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

function LeadStats() {
  const { data = [] } = useRows("leads", {});
  const pipeline = data.reduce((sum, row) => sum + number(row["budget"]), 0);
  const open = data.filter((row) => !["Won", "Lost"].includes(String(row["status"] ?? ""))).length;
  const won = data.filter((row) => row["status"] === "Won").length;
  const cities = new Set(
    data.map((row) => String(row["desired_city"] ?? "").trim()).filter(Boolean),
  ).size;

  const stats = [
    { label: "Leads", value: String(data.length) },
    { label: "Budget estimé (DZD)", value: new Intl.NumberFormat("fr-FR").format(pipeline) },
    { label: "En cours", value: String(open) },
    { label: "Gagnés", value: String(won) },
    { label: "Villes / wilayas", value: String(cities) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.label} data-testid={`leads-stat-${stat.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stat.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeadsPage() {
  return (
    <div className="space-y-6">
      <LeadStats />
      <CrudPage
        table="leads"
        title="Leads"
        description="Prospects à contacter en Algérie : entreprise, contact, ville, budget et statut."
        statusField="status"
        statusOptions={LEAD_STATUSES}
        toolbar={<ExportLeadsButton fileName="leads-algerie" />}
        columns={[
          { key: "name", header: "Entreprise" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Téléphone" },
          { key: "desired_city", header: "Ville / wilaya" },
          { key: "service", header: "Service", className: "hidden md:table-cell" },
          { key: "desired_property_type", header: "Besoin", className: "hidden lg:table-cell" },
          {
            key: "budget",
            header: "Budget (DZD)",
            render: (row) => new Intl.NumberFormat("fr-FR").format(number(row["budget"])),
          },
          { key: "source", header: "Source", className: "hidden lg:table-cell" },
          { key: "status", header: "Statut", render: (row) => <StatusBadge value={row["status"]} /> },
        ]}
      />
    </div>
  );
}

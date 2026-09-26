import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/db";
import { LEAD_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/leads/")({
  head: () => ({
    meta: [
      { title: "Real Estate Leads — My Business OS" },
      { name: "description", content: "Buyer leads, budgets and the properties they want." },
      { property: "og:title", content: "Real Estate Leads — My Business OS" },
      { property: "og:description", content: "Buyer leads, budgets and the properties they want." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  return (
    <CrudPage
      table="leads"
      title="Leads"
      description="People looking for property, and what they want."
      statusField="status"
      statusOptions={LEAD_STATUSES}
      detailPath="/leads/$id"
      columns={[
        { key: "name", header: "Lead" },
        { key: "phone", header: "Phone" },
        { key: "desired_city", header: "Desired city" },
        { key: "budget", header: "Budget", render: (r) => formatMoney(r["budget"], "DZD") },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r["status"]} /> },
      ]}
    />
  );
}

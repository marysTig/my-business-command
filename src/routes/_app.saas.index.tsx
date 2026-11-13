import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/db";
import { SAAS_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/saas/")({
  head: () => ({
    meta: [
      { title: "SaaS Projects — My Business OS" },
      { name: "description", content: "Your personal SaaS products and their build progress." },
      { property: "og:title", content: "SaaS Projects — My Business OS" },
      {
        property: "og:description",
        content: "Your personal SaaS products and their build progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaasPage,
});

function SaasPage() {
  // The prospection files live in their own sub-section (/saas/prospects),
  // reachable from the folded "SaaS Projects" entry of the sidebar.
  return (
    <>
      <CrudPage
        table="saas_projects"
        researchSection="saas"
        title="SaaS Projects"
        description="Your own products, from idea to launch."
        statusField="status"
        statusOptions={SAAS_STATUSES}
        detailPath="/saas/$id"
        columns={[
          { key: "project_name", header: "Project" },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r["status"]} /> },
          {
            key: "progress_percentage",
            header: "Progress",
            render: (r) => (
              <div className="flex w-32 items-center gap-2">
                <Progress value={Number(r["progress_percentage"] ?? 0)} className="h-2" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {r["progress_percentage"] ?? 0}%
                </span>
              </div>
            ),
          },
          { key: "target_date", header: "Target", render: (r) => formatDate(r["target_date"]) },
        ]}
      />
    </>
  );
}

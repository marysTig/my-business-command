import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/db";
import { WEBSITE_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/websites/")({
  head: () => ({
    meta: [
      { title: "Client Websites — My Business OS" },
      { name: "description", content: "Track client website projects, progress and deadlines." },
      { property: "og:title", content: "Client Websites — My Business OS" },
      {
        property: "og:description",
        content: "Track client website projects, progress and deadlines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebsitesPage,
});

function WebsitesPage() {
  return (
    <CrudPage
      table="client_websites"
      title="Client Websites"
      description="Client projects with contacts, progress and links."
      statusField="status"
      statusOptions={WEBSITE_STATUSES}
      detailPath="/websites/$id"
      columns={[
        { key: "project_name", header: "Project" },
        { key: "client_name", header: "Client" },
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
        { key: "deadline", header: "Deadline", render: (r) => formatDate(r["deadline"]) },
      ]}
    />
  );
}

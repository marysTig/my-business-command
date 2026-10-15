import { createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { LinkOut } from "@/components/external-link";
import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { DetailField, RelatedResources, RelatedTasks } from "@/components/related";
import { SecretField } from "@/components/secret-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, useRow } from "@/lib/db";

export const Route = createFileRoute("/_app/saas/$id")({
  head: () => ({
    meta: [
      { title: "SaaS Project — My Business OS" },
      { name: "description", content: "Project progress, tasks, links and resources." },
      { property: "og:title", content: "SaaS Project — My Business OS" },
      { property: "og:description", content: "Project progress, tasks, links and resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaasDetail,
});

function SaasDetail() {
  const { id } = Route.useParams();
  const { data: project, isLoading } = useRow("saas_projects", id);
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!project)
    return <p className="text-sm text-muted-foreground">This project no longer exists.</p>;

  return (
    <>
      <PageHeader
        title={project["project_name"]}
        description={project["description"] ?? undefined}
        backTo="/saas"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Status" value={<StatusBadge value={project["status"]} />} />
            <DetailField
              label="Progress"
              value={
                <div className="flex items-center gap-2">
                  <Progress
                    value={Number(project["progress_percentage"] ?? 0)}
                    className="h-2 w-32"
                  />
                  <span className="text-xs tabular-nums">
                    {project["progress_percentage"] ?? 0}%
                  </span>
                </div>
              }
            />
            <DetailField label="Start date" value={formatDate(project["start_date"])} />
            <DetailField label="Target date" value={formatDate(project["target_date"])} />
            <DetailField label="Email" value={project["contact_email"] ?? "—"} />
            <SecretField label="Password" value={project["access_password"]} />
            <DetailField label="Notes" value={project["notes"] ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailField
              label="Repository"
              value={<LinkOut url={project["repository_url"]} label="Open repository" />}
            />
            <DetailField
              label="Production"
              value={<LinkOut url={project["production_url"]} label="Open production" />}
            />
            <DetailField
              label="Vercel"
              value={<LinkOut url={project["vercel_url"]} label="Open Vercel" />}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <RelatedTasks filters={{ saas_project_id: id }} />
        </div>
        <RelatedResources filters={{ saas_project_id: id }} />
      </div>

      <EntityFormDialog
        table="saas_projects"
        open={open}
        onOpenChange={setOpen}
        record={project}
        title="Edit SaaS project"
      />
    </>
  );
}

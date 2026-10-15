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

export const Route = createFileRoute("/_app/websites/$id")({
  head: () => ({
    meta: [
      { title: "Client Website — My Business OS" },
      { name: "description", content: "Client project details, tasks and resources." },
      { property: "og:title", content: "Client Website — My Business OS" },
      { property: "og:description", content: "Client project details, tasks and resources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebsiteDetail,
});

function WebsiteDetail() {
  const { id } = Route.useParams();
  const { data: site, isLoading } = useRow("client_websites", id);
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!site) return <p className="text-sm text-muted-foreground">This project no longer exists.</p>;

  return (
    <>
      <PageHeader
        title={site["project_name"]}
        description={site["description"] ?? undefined}
        backTo="/websites"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Status" value={<StatusBadge value={site["status"]} />} />
            <DetailField
              label="Progress"
              value={
                <div className="flex items-center gap-2">
                  <Progress value={Number(site["progress_percentage"] ?? 0)} className="h-2 w-32" />
                  <span className="text-xs tabular-nums">{site["progress_percentage"] ?? 0}%</span>
                </div>
              }
            />
            <DetailField label="Start date" value={formatDate(site["start_date"])} />
            <DetailField label="Deadline" value={formatDate(site["deadline"])} />
            <DetailField label="Project amount" value={site["project_amount"] ?? "—"} />
            <DetailField label="Amount paid" value={site["amount_paid"] ?? "—"} />
            <DetailField
              label="Remaining"
              value={
                site["project_amount"] != null
                  ? Number(site["project_amount"]) - Number(site["amount_paid"] ?? 0)
                  : "—"
              }
            />
            <DetailField label="Notes" value={site["notes"] ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailField label="Name" value={site["client_name"]} />
            <DetailField label="Phone" value={site["client_phone"] ?? "—"} />
            <DetailField label="Email" value={site["client_email"] ?? "—"} />
            <SecretField label="Client password" value={site["client_password"]} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField label="Website" value={<LinkOut url={site["website_url"]} label="Open site" />} />
            <DetailField label="GitHub" value={<LinkOut url={site["github_url"]} label="GitHub repo" />} />
            <DetailField label="Domain" value={<LinkOut url={site["domain"]} label={site["domain"]} />} />
            <DetailField
              label="Vercel"
              value={<LinkOut url={site["vercel_project"]} label="Vercel project" />}
            />
            <DetailField
              label="Backend"
              value={<LinkOut url={site["supabase_project"]} label="Backend project" />}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <RelatedTasks filters={{ client_website_id: id }} />
        </div>
        <RelatedResources filters={{ client_website_id: id }} />
      </div>

      <EntityFormDialog
        table="client_websites"
        open={open}
        onOpenChange={setOpen}
        record={site}
        title="Edit client website"
      />
    </>
  );
}

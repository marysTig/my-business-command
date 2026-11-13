import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { ProspectFiles } from "@/components/prospect-files";

export const Route = createFileRoute("/_app/saas/prospects")({
  head: () => ({
    meta: [
      { title: "Liste prospection — My Business OS" },
      {
        name: "description",
        content: "Prospection files (Word / Excel) attached to each SaaS project.",
      },
      { property: "og:title", content: "Liste prospection — My Business OS" },
      {
        property: "og:description",
        content: "Prospection files (Word / Excel) attached to each SaaS project.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SaasProspects,
});

function SaasProspects() {
  return (
    <>
      <PageHeader
        title="Liste prospection"
        description="Les fichiers Word et Excel de prospection, projet SaaS par projet SaaS."
        backTo="/saas"
      />
      <ProspectFiles />
    </>
  );
}

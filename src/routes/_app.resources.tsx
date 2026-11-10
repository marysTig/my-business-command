import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { CrudPage } from "@/components/crud-page";
import { RESOURCE_CATEGORIES } from "@/lib/entities";

export const Route = createFileRoute("/_app/resources")({
  head: () => ({
    meta: [
      { title: "Resources — My Business OS" },
      { name: "description", content: "Your library of tools, docs, inspiration and links." },
      { property: "og:title", content: "Resources — My Business OS" },
      { property: "og:description", content: "Your library of tools, docs, inspiration and links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <CrudPage
      table="resources"
      researchSection="resources"
      title="Resources"
      description="Inspiration, docs and tools, attached to the work they serve."
      statusField="category"
      statusOptions={RESOURCE_CATEGORIES}
      columns={[
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        {
          key: "url",
          header: "Link",
          render: (r) =>
            r["url"] ? (
              <a
                href={r["url"]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                Open <ExternalLink className="size-3.5" />
              </a>
            ) : (
              "—"
            ),
        },
        {
          key: "tags",
          header: "Tags",
          render: (r) => (Array.isArray(r["tags"]) && r["tags"].length ? r["tags"].join(", ") : "—"),
        },
      ]}
    />
  );
}

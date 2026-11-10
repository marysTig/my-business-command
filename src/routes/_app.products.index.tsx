import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/db";
import { PRODUCT_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/products/")({
  head: () => ({
    meta: [
      { title: "Digital Products — My Business OS" },
      { name: "description", content: "Files, courses and subscriptions you sell." },
      { property: "og:title", content: "Digital Products — My Business OS" },
      { property: "og:description", content: "Files, courses and subscriptions you sell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  return (
    <CrudPage
      table="digital_products"
      researchSection="products"
      title="Digital Products"
      description="What you sell, with delivery links and sales."
      statusField="status"
      statusOptions={PRODUCT_STATUSES}
      detailPath="/products/$id"
      columns={[
        { key: "product_name", header: "Product" },
        { key: "product_type", header: "Type" },
        { key: "price", header: "Price", render: (r) => formatMoney(r["price"], r["currency"]) },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r["status"]} /> },
        {
          key: "google_drive_url",
          header: "Delivery",
          render: (r) =>
            r["google_drive_url"] ? (
              <a
                href={r["google_drive_url"]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm hover:underline"
              >
                Drive <ExternalLink className="size-3.5" />
              </a>
            ) : (
              "—"
            ),
        },
      ]}
    />
  );
}

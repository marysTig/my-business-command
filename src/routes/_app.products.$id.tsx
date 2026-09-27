import { createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { LinkOut } from "@/components/external-link";
import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { DetailField, RelatedResources, RelatedTasks } from "@/components/related";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, useRow, useRows } from "@/lib/db";

export const Route = createFileRoute("/_app/products/$id")({
  head: () => ({
    meta: [
      { title: "Digital Product — My Business OS" },
      { name: "description", content: "Product details, delivery link, customers and sales." },
      { property: "og:title", content: "Digital Product — My Business OS" },
      { property: "og:description", content: "Product details, delivery link, customers and sales." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = Route.useParams();
  const { data: product, isLoading } = useRow("digital_products", id);
  const sales = useRows("sales", { filters: { product_id: id } });
  const customers = useRows("customers", { filters: { product_id: id } });
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!product) return <p className="text-sm text-muted-foreground">This product no longer exists.</p>;

  const revenue = (sales.data ?? [])
    .filter((s) => s["payment_status"] === "Paid")
    .reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);

  return (
    <>
      <PageHeader
        title={product["product_name"]}
        description={product["description"] ?? undefined}
        backTo="/products"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Product</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Type" value={product["product_type"]} />
            <DetailField label="Status" value={<StatusBadge value={product["status"]} />} />
            <DetailField
              label="Price"
              value={formatMoney(product["price"], product["currency"])}
            />
            <DetailField label="Revenue (paid)" value={formatMoney(revenue, product["currency"])} />
            <DetailField label="Notes" value={product["notes"] ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailField
              label="Delivery"
              value={<LinkOut url={product["google_drive_url"]} label="Google Drive" />}
            />
            <DetailField
              label="Landing page"
              value={<LinkOut url={product["landing_page_url"]} label="Open landing page" />}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sales.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              (sales.data ?? []).map((sale) => (
                <div
                  key={sale["id"]}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{formatDate(sale["purchase_date"])}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {formatMoney(sale["amount"], sale["currency"])}
                    </span>
                    <StatusBadge value={sale["payment_status"]} />
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(customers.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            ) : (
              (customers.data ?? []).map((c) => (
                <div
                  key={c["id"]}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate">{c["name"]}</span>
                  <StatusBadge value={c["access_status"]} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <RelatedTasks filters={{ digital_product_id: id }} />
        </div>
        <RelatedResources filters={{ digital_product_id: id }} />
      </div>

      <EntityFormDialog
        table="digital_products"
        open={open}
        onOpenChange={setOpen}
        record={product}
        title="Edit product"
      />
    </>
  );
}

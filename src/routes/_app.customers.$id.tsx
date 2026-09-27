import { createFileRoute } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { DetailField } from "@/components/related";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, useRow, useRows } from "@/lib/db";

export const Route = createFileRoute("/_app/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer — My Business OS" },
      { name: "description", content: "Customer purchases, payment and access status." },
      { property: "og:title", content: "Customer — My Business OS" },
      { property: "og:description", content: "Customer purchases, payment and access status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const { data: customer, isLoading } = useRow("customers", id);
  const sales = useRows("sales", { filters: { customer_id: id } });
  const products = useRows("digital_products", {});
  const [open, setOpen] = useState(false);

  if (isLoading) return <LoadingCards />;
  if (!customer)
    return <p className="text-sm text-muted-foreground">This customer no longer exists.</p>;

  const productName = (pid: string) =>
    (products.data ?? []).find((p) => p["id"] === pid)?.["product_name"] ?? "—";

  return (
    <>
      <PageHeader
        title={customer["name"]}
        description={customer["email"] ?? undefined}
        backTo="/customers"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Phone" value={customer["phone"] ?? "—"} />
            <DetailField label="Product" value={productName(customer["product_id"])} />
            <DetailField label="Product type" value={customer["product_type"] ?? "—"} />
            <DetailField label="Purchase date" value={formatDate(customer["purchase_date"])} />
            <DetailField label="Amount" value={formatMoney(customer["amount"])} />
            <DetailField
              label="Payment"
              value={<StatusBadge value={customer["payment_status"]} />}
            />
            <DetailField label="Access" value={<StatusBadge value={customer["access_status"]} />} />
            <DetailField label="Expires" value={formatDate(customer["expiration_date"])} />
            <DetailField label="Notes" value={customer["notes"] ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(sales.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recorded sales yet.</p>
            ) : (
              (sales.data ?? []).map((sale) => (
                <div key={sale["id"]} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{productName(sale["product_id"])}</span>
                    <StatusBadge value={sale["payment_status"]} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(sale["purchase_date"])} ·{" "}
                    {formatMoney(sale["amount"], sale["currency"])}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <EntityFormDialog
        table="customers"
        open={open}
        onOpenChange={setOpen}
        record={customer}
        title="Edit customer"
      />
    </>
  );
}

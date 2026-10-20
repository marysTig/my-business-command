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
import { formatDate, formatMoney, useRow } from "@/lib/db";

export const Route = createFileRoute("/_app/velora/$id")({
  head: () => ({
    meta: [
      { title: "Velora Order — My Business OS" },
      { name: "description", content: "Order price, expenses, profit and financing details." },
      { property: "og:title", content: "Velora Order — My Business OS" },
      {
        property: "og:description",
        content: "Order price, expenses, profit and financing details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VeloraOrderDetail,
});

function VeloraOrderDetail() {
  const { id } = Route.useParams();
  const { data: order, isLoading } = useRow("velora_orders", id);
  const [open, setOpen] = useState(false);

  const clientId: string | undefined = order?.["client_id"] ?? undefined;
  const { data: client } = useRow("velora_clients", clientId);

  if (isLoading) return <LoadingCards />;
  if (!order)
    return <p className="text-sm text-muted-foreground">This order no longer exists.</p>;

  const currency = order["currency"] ?? "DZD";
  const num = (key: string) => Number(order[key] ?? 0);
  const profit = num("sale_price") - num("expenses");
  const remaining = num("sale_price") - num("deposit");
  const totalPayable = num("monthly_payment") * num("term_months");

  return (
    <>
      <PageHeader
        title={order["item"] ?? "Order"}
        description={order["notes"] ?? undefined}
        backTo="/velora"
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="size-4" /> Edit
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Money</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Sale price" value={formatMoney(order["sale_price"], currency)} />
            <DetailField label="Expenses" value={formatMoney(order["expenses"], currency)} />
            <DetailField label="Profit" value={formatMoney(profit, currency)} />
            <DetailField label="Deposit paid" value={formatMoney(order["deposit"], currency)} />
            <DetailField label="Still to pay" value={formatMoney(remaining, currency)} />
            <DetailField label="Order date" value={formatDate(order["order_date"])} />
            <DetailField label="Date sold" value={formatDate(order["sold_at"])} />
            <DetailField label="Status" value={<StatusBadge value={order["status"]} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailField label="Name" value={client?.["name"] ?? "—"} />
            <DetailField label="Phone" value={client?.["phone"] ?? "—"} />
            <DetailField label="Email" value={client?.["email"] ?? "—"} />
            <DetailField label="Address" value={client?.["address"] ?? "—"} />
            <DetailField label="City" value={client?.["city"] ?? "—"} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Financing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField
              label="Financing status"
              value={<StatusBadge value={order["financing_status"]} />}
            />
            <DetailField label="Bank / organism" value={order["financing_org"] ?? "—"} />
            <DetailField
              label="Financed amount"
              value={formatMoney(order["financed_amount"], currency)}
            />
            <DetailField
              label="Monthly payment"
              value={formatMoney(order["monthly_payment"], currency)}
            />
            <DetailField label="Term" value={order["term_months"] ? `${order["term_months"]} months` : "—"} />
            <DetailField
              label="Total payable"
              value={totalPayable ? formatMoney(totalPayable, currency) : "—"}
            />
          </CardContent>
        </Card>
      </div>

      <EntityFormDialog
        table="velora_orders"
        open={open}
        onOpenChange={setOpen}
        record={order}
        title="Edit order"
      />
    </>
  );
}

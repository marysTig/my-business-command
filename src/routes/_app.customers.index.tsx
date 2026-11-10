import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDelete } from "@/components/confirm-delete";
import { CrudPage } from "@/components/crud-page";
import { EntityFormDialog } from "@/components/entity-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, useDeleteRow, useRows, type Row } from "@/lib/db";
import { ACCESS_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/customers/")({
  head: () => ({
    meta: [
      { title: "Customers & Sales — My Business OS" },
      { name: "description", content: "Buyers, payments, access status and revenue." },
      { property: "og:title", content: "Customers & Sales — My Business OS" },
      { property: "og:description", content: "Buyers, payments, access status and revenue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function SalesPanel() {
  const { data = [] } = useRows("sales", {});
  const products = useRows("digital_products", {});
  const customers = useRows("customers", {});
  const del = useDeleteRow("sales");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const nameOf = (list: Row[], id: string, key: string) =>
    list.find((r) => r["id"] === id)?.[key] ?? "—";

  const paid = data.filter((s) => s["payment_status"] === "Paid");
  const total = paid.reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Total sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Number of sales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{paid.length}</CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Record sale
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No sales recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((sale) => (
            <div
              key={sale["id"]}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <button
                  className="text-sm font-medium hover:underline"
                  onClick={() => {
                    setEditing(sale);
                    setOpen(true);
                  }}
                >
                  {nameOf(products.data ?? [], sale["product_id"], "product_name")}
                </button>
                <p className="text-xs text-muted-foreground">
                  {nameOf(customers.data ?? [], sale["customer_id"], "name")} ·{" "}
                  {formatDate(sale["purchase_date"])}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums">
                  {formatMoney(sale["amount"], sale["currency"])}
                </span>
                <StatusBadge value={sale["payment_status"]} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleting(sale)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityFormDialog
        table="sales"
        open={open}
        onOpenChange={setOpen}
        record={editing}
        title={editing ? "Edit sale" : "Record sale"}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        name="this sale"
        onConfirm={() => {
          if (deleting) del.mutate(deleting["id"]);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function CustomersPage() {
  return (
    <Tabs defaultValue="customers" className="space-y-4">
      <TabsList>
        <TabsTrigger value="customers">Customers</TabsTrigger>
        <TabsTrigger value="sales">Sales</TabsTrigger>
      </TabsList>
      <TabsContent value="customers" className="space-y-6">
        <CrudPage
          table="customers"
      researchSection="customers"
          title="Customers"
          description="Who bought what, and whether their access is still active."
          statusField="access_status"
          statusOptions={ACCESS_STATUSES}
          detailPath="/customers/$id"
          columns={[
            { key: "name", header: "Customer" },
            { key: "email", header: "Email" },
            {
              key: "amount",
              header: "Amount",
              render: (r) => formatMoney(r["amount"]),
            },
            {
              key: "payment_status",
              header: "Payment",
              render: (r) => <StatusBadge value={r["payment_status"]} />,
            },
            {
              key: "access_status",
              header: "Access",
              render: (r) => <StatusBadge value={r["access_status"]} />,
            },
            {
              key: "expiration_date",
              header: "Expires",
              render: (r) => formatDate(r["expiration_date"]),
            },
          ]}
        />
      </TabsContent>
      <TabsContent value="sales">
        <SalesPanel />
      </TabsContent>
    </Tabs>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, useRows } from "@/lib/db";
import { VELORA_FINANCING_STATUSES, VELORA_ORDER_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/velora/")({
  head: () => ({
    meta: [
      { title: "Velora — My Business OS" },
      { name: "description", content: "Velora clients, orders, prices, expenses and financing." },
      { property: "og:title", content: "Velora — My Business OS" },
      {
        property: "og:description",
        content: "Velora clients, orders, prices, expenses and financing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VeloraPage,
});

function VeloraStats() {
  const { data = [] } = useRows("velora_orders", {});
  const sum = (key: string) => data.reduce((total, row) => total + Number(row[key] ?? 0), 0);

  const sales = sum("sale_price");
  const expenses = sum("expenses");
  const currency = data[0]?.["currency"] ?? "DZD";

  const stats = [
    { label: "Orders", value: String(data.length) },
    { label: "Sales", value: formatMoney(sales, currency) },
    { label: "Expenses", value: formatMoney(expenses, currency) },
    { label: "Profit", value: formatMoney(sales - expenses, currency) },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {stat.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{stat.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function VeloraPage() {
  const clients = useRows("velora_clients", {});

  const clientName = (id?: string) =>
    (clients.data ?? []).find((row) => row["id"] === id)?.["name"] ?? "—";

  return (
    <Tabs defaultValue="orders" className="space-y-4">
      <TabsList>
        <TabsTrigger value="orders">Orders</TabsTrigger>
        <TabsTrigger value="clients">Clients</TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="space-y-6">
        <VeloraStats />
        <CrudPage
          table="velora_orders"
          title="Velora Orders"
          description="What was sold, for how much, what it cost and how it is financed."
          statusField="status"
          statusOptions={VELORA_ORDER_STATUSES}
          detailPath="/velora/$id"
          columns={[
            { key: "item", header: "Item" },
            {
              key: "client_id",
              header: "Client",
              render: (row) => clientName(row["client_id"]),
            },
            {
              key: "sale_price",
              header: "Sale price",
              render: (row) => formatMoney(row["sale_price"], row["currency"]),
            },
            {
              key: "expenses",
              header: "Expenses",
              render: (row) => formatMoney(row["expenses"], row["currency"]),
            },
            {
              key: "profit",
              header: "Profit",
              render: (row) =>
                formatMoney(Number(row["sale_price"] ?? 0) - Number(row["expenses"] ?? 0), row["currency"]),
            },
            {
              key: "financing_status",
              header: "Financing",
              render: (row) => <StatusBadge value={row["financing_status"]} />,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge value={row["status"]} />,
            },
          ]}
        />
      </TabsContent>

      <TabsContent value="clients">
        <CrudPage
          table="velora_clients"
          title="Velora Clients"
          description="Everyone who buys from Velora, with their contact details."
          statusOptions={VELORA_FINANCING_STATUSES}
          detailPath="/velora/$id"
          columns={[
            { key: "name", header: "Client" },
            { key: "phone", header: "Phone" },
            { key: "city", header: "City" },
            { key: "address", header: "Address" },
            { key: "email", header: "Email" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}

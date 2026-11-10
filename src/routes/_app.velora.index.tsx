import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { SectionResearch } from "@/components/section-research";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, useRows } from "@/lib/db";
import { VELORA_ORDER_STATUSES } from "@/lib/entities";

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
  const money = (key: string) => (row: Record<string, any>) => formatMoney(row[key], row["currency"]);
  const item = { key: "item", header: "Article" };
  const client = { key: "client_id", header: "Client", render: (row: Record<string, any>) => clientName(row["client_id"]) };
  const orderPage = (title: string, description: string, columns: any[], status = false) => (
    <CrudPage
      table="velora_orders"
      researchSection="velora"
      title={title}
      description={description}
      detailPath="/velora/$id"
      {...(status ? { statusField: "status", statusOptions: VELORA_ORDER_STATUSES } : {})}
      columns={columns}
    />
  );

  return (
    <Tabs defaultValue="commandes" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap">
        <TabsTrigger value="clients">Clients</TabsTrigger>
        <TabsTrigger value="commandes">Commandes</TabsTrigger>
        <TabsTrigger value="financement">Gestion financement</TabsTrigger>
        <TabsTrigger value="vendu">Vendu avec prix</TabsTrigger>
        <TabsTrigger value="depenses">Dépenses</TabsTrigger>
      </TabsList>

      <TabsContent value="clients">
        <CrudPage
          table="velora_clients"
          researchSection="velora"
          title="Clients"
          description="Tous les clients Velora et leurs coordonnées."
          columns={[
            { key: "name", header: "Client" },
            { key: "phone", header: "Téléphone" },
            { key: "city", header: "Ville" },
            { key: "address", header: "Adresse" },
            { key: "email", header: "Email" },
          ]}
        />
        <SectionResearch section="velora" />
      </TabsContent>

      <TabsContent value="commandes" className="space-y-6">
        <VeloraStats />
        {orderPage("Commandes", "Toutes les commandes et leur statut.", [
          item, client,
          { key: "order_date", header: "Date commande", render: (r: any) => formatDate(r["order_date"]) },
          { key: "status", header: "Statut", render: (r: any) => <StatusBadge value={r["status"]} /> },
        ], true)}
        <SectionResearch section="velora" />
      </TabsContent>

      <TabsContent value="financement">
        {orderPage("Gestion financement", "Apport, montant financé, mensualités et banque.", [
          item, client,
          { key: "deposit", header: "Apport", render: money("deposit") },
          { key: "financed_amount", header: "Financé", render: money("financed_amount") },
          { key: "monthly_payment", header: "Mensualité", render: money("monthly_payment") },
          { key: "term_months", header: "Durée (mois)" },
          { key: "financing_org", header: "Banque" },
          { key: "financing_status", header: "Statut", render: (r: any) => <StatusBadge value={r["financing_status"]} /> },
        ])}
        <SectionResearch section="velora" />
      </TabsContent>

      <TabsContent value="vendu">
        {orderPage("Vendu avec prix", "Ce qui a été vendu, quand et à quel prix.", [
          item, client,
          { key: "sold_at", header: "Date de vente", render: (r: any) => formatDate(r["sold_at"]) },
          { key: "sale_price", header: "Prix de vente", render: money("sale_price") },
          { key: "profit", header: "Bénéfice", render: (r: any) => formatMoney(Number(r["sale_price"] ?? 0) - Number(r["expenses"] ?? 0), r["currency"]) },
        ])}
        <SectionResearch section="velora" />
      </TabsContent>

      <TabsContent value="depenses">
        <CrudPage
          table="velora_expenses"
          researchSection="velora"
          title="Dépenses"
          description="Toutes les dépenses de Velora."
          columns={[
            { key: "label", header: "Dépense" },
            { key: "category", header: "Catégorie" },
            { key: "expense_date", header: "Date", render: (r) => formatDate(r["expense_date"]) },
            { key: "amount", header: "Montant", render: money("amount") },
            { key: "notes", header: "Notes" },
          ]}
        />
        <SectionResearch section="velora" />
      </TabsContent>
    </Tabs>
  );
}

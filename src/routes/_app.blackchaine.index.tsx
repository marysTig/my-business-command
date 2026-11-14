import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/crud-page";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, useRows } from "@/lib/db";
import { BLACKCHAINE_ORDER_STATUSES, BLACKCHAINE_PRODUCT_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/blackchaine/")({
  head: () => ({
    meta: [
      { title: "Blackchaine — My Business OS" },
      {
        name: "description",
        content: "Blackchaine : modèles, commandes, clients et dépenses de la marque.",
      },
      { property: "og:title", content: "Blackchaine — My Business OS" },
      {
        property: "og:description",
        content: "Blackchaine : modèles, commandes, clients et dépenses de la marque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlackchainePage,
});

function BlackchaineStats() {
  const orders = useRows("blackchaine_orders", {});
  const products = useRows("blackchaine_products", {});

  const rows = orders.data ?? [];
  const revenue = rows
    .filter((row) => row["status"] !== "Cancelled")
    .reduce(
      (total, row) => total + Number(row["unit_price"] ?? 0) * Number(row["quantity"] ?? 1),
      0,
    );
  const collected = rows.reduce((total, row) => total + Number(row["amount_paid"] ?? 0), 0);
  const lowStock = (products.data ?? []).filter((row) => Number(row["stock"] ?? 0) <= 3).length;
  const currency = String(rows[0]?.["currency"] ?? "DZD");

  const stats = [
    { label: "Commandes", value: String(rows.length) },
    { label: "Chiffre d'affaires", value: formatMoney(revenue, currency) },
    { label: "Encaissé", value: formatMoney(collected, currency) },
    { label: "Stock faible (≤ 3)", value: String(lowStock) },
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

function BlackchainePage() {
  const clients = useRows("blackchaine_clients", {});
  const clientName = (id?: string) =>
    (clients.data ?? []).find((row) => row["id"] === id)?.["name"] ?? "—";
  const money = (key: string) => (row: Record<string, any>) => formatMoney(row[key], row["currency"]);

  return (
    <Tabs defaultValue="commandes" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap">
        <TabsTrigger value="commandes">Commandes</TabsTrigger>
        <TabsTrigger value="produits">Produits</TabsTrigger>
        <TabsTrigger value="clients">Clients</TabsTrigger>
        <TabsTrigger value="depenses">Dépenses</TabsTrigger>
      </TabsList>

      <TabsContent value="commandes" className="space-y-6">
        <BlackchaineStats />
        <CrudPage
          table="blackchaine_orders"
          title="Commandes"
          description="Toutes les commandes Blackchaine, du panier à la livraison."
          statusField="status"
          statusOptions={BLACKCHAINE_ORDER_STATUSES}
          columns={[
            { key: "item", header: "Article" },
            {
              key: "client_id",
              header: "Client",
              render: (r) => clientName(String(r["client_id"] ?? "")),
            },
            { key: "size", header: "Taille" },
            { key: "quantity", header: "Qté" },
            {
              key: "unit_price",
              header: "Total",
              render: (r) =>
                formatMoney(
                  Number(r["unit_price"] ?? 0) * Number(r["quantity"] ?? 1),
                  String(r["currency"] ?? "DZD"),
                ),
            },
            { key: "status", header: "Statut", render: (r) => <StatusBadge value={r["status"]} /> },
            {
              key: "payment_status",
              header: "Paiement",
              render: (r) => <StatusBadge value={r["payment_status"]} />,
            },
            {
              key: "order_date",
              header: "Date",
              render: (r) => formatDate(r["order_date"]),
            },
          ]}
        />
      </TabsContent>

      <TabsContent value="produits">
        <CrudPage
          table="blackchaine_products"
          title="Produits"
          description="Les modèles Blackchaine, leurs tailles, prix et stock."
          statusField="status"
          statusOptions={BLACKCHAINE_PRODUCT_STATUSES}
          columns={[
            { key: "name", header: "Modèle" },
            { key: "category", header: "Catégorie" },
            { key: "sizes", header: "Tailles" },
            { key: "price", header: "Prix", render: money("price") },
            { key: "stock", header: "Stock" },
            { key: "status", header: "Statut", render: (r) => <StatusBadge value={r["status"]} /> },
          ]}
        />
      </TabsContent>

      <TabsContent value="clients">
        <CrudPage
          table="blackchaine_clients"
          title="Clients"
          description="Les clients de la marque et leurs coordonnées."
          columns={[
            { key: "name", header: "Client" },
            { key: "phone", header: "Téléphone" },
            { key: "city", header: "Ville" },
            { key: "size", header: "Taille" },
            { key: "email", header: "Email" },
          ]}
        />
      </TabsContent>

      <TabsContent value="depenses">
        <CrudPage
          table="blackchaine_expenses"
          title="Dépenses"
          description="Tissus, confection, livraison, publicité : les coûts de la marque."
          columns={[
            { key: "label", header: "Dépense" },
            { key: "category", header: "Catégorie" },
            { key: "supplier", header: "Fournisseur" },
            { key: "expense_date", header: "Date", render: (r) => formatDate(r["expense_date"]) },
            { key: "amount", header: "Montant", render: money("amount") },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}

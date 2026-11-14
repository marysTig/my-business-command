import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Car,
  CheckSquare,
  Globe,
  Package,
  Shirt,
  TrendingUp,
  Users,
} from "lucide-react";

import type { CSSProperties } from "react";

import { LoadingCards } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, useRows, type Row } from "@/lib/db";
import { TASK_BOARD_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — My Business OS" },
      { name: "description", content: "One command center for websites, SaaS, property and sales." },
      { property: "og:title", content: "Dashboard — My Business OS" },
      {
        property: "og:description",
        content: "One command center for websites, SaaS, property and sales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

/** Stagger helper: each card rises slightly after the previous one. */
function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

function Kpi({
  label,
  value,
  icon: Icon,
  to,
  index,
}: {
  label: string;
  value: string | number;
  icon: any;
  to: string;
  index: number;
}) {
  return (
    <Link
      to={to}
      style={delay(index * 55)}
      className="dash-card dash-rise rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

function Dashboard() {
  const websites = useRows("client_websites", {});
  const saas = useRows("saas_projects", {});
  const carBuyers = useRows("car_buyers", {});
  const products = useRows("digital_products", {});
  const sales = useRows("sales", {});
  const customers = useRows("customers", {});
  const tasks = useRows("tasks", {});
  const blackchaineOrders = useRows("blackchaine_orders", {});

  const loading =
    websites.isLoading ||
    tasks.isLoading ||
    carBuyers.isLoading ||
    sales.isLoading ||
    blackchaineOrders.isLoading;

  const today = new Date().toISOString().slice(0, 10);
  const taskRows = tasks.data ?? [];
  const todaysTasks = taskRows.filter(
    (t) => t["due_date"] && t["due_date"] <= today && t["status"] !== "Done",
  );

  const salesRows = sales.data ?? [];
  const paid = salesRows.filter((s) => s["payment_status"] === "Paid");
  const totalSales = paid.reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  const revenueThisMonth = paid
    .filter((s) => new Date(s["purchase_date"]) >= monthStart)
    .reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);
  // Blackchaine is the clothing brand: its orders are counted on their own line
  // so the brand's revenue is visible next to the other activities.
  const bcOrders = blackchaineOrders.data ?? [];
  const blackchaineRevenue = bcOrders
    .filter((order) => order["status"] !== "Cancelled")
    .reduce(
      (sum, order) => sum + Number(order["unit_price"] ?? 0) * Number(order["quantity"] ?? 1),
      0,
    );
  const blackchaineCurrency = String(bcOrders[0]?.["currency"] ?? "DZD");

  const activeSubscriptions = (customers.data ?? []).filter(
    (c) => c["product_type"] === "Subscription" && c["access_status"] === "Active",
  ).length;

  const activity: { label: string; title: string; at: string; to: string }[] = [
    ...taskRows.map((r) => ({ label: "New task", title: r["title"], at: r["created_at"], to: "/tasks" })),
    ...(websites.data ?? []).map((r) => ({
      label: "Website update",
      title: r["project_name"],
      at: r["updated_at"] ?? r["created_at"],
      to: "/websites",
    })),
    ...(carBuyers.data ?? []).map((r) => ({
      label: "New car buyer",
      title: r["name"],
      at: r["created_at"],
      to: "/cars",
    })),
    ...salesRows.map((r) => ({
      label: "Digital product sale",
      title: formatMoney(r["amount"], r["currency"]),
      at: r["created_at"],
      to: "/products",
    })),
    ...(customers.data ?? []).map((r) => ({
      label: "Customer added",
      title: r["name"],
      at: r["created_at"],
      to: "/customers",
    })),
    ...bcOrders.map((r) => ({
      label: "Blackchaine order",
      title: String(r["item"] ?? ""),
      at: String(r["created_at"] ?? ""),
      to: "/blackchaine",
    })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  if (loading) return <LoadingCards cards={8} />;

  const kpis = [
    {
      label: "Active client websites",
      value: (websites.data ?? []).filter((w) => !["Completed"].includes(w["status"])).length,
      icon: Globe,
      to: "/websites",
    },
    { label: "SaaS projects", value: (saas.data ?? []).length, icon: Briefcase, to: "/saas" },
    { label: "Car buyers", value: (carBuyers.data ?? []).length, icon: Car, to: "/cars" },
    {
      label: "Visits planned",
      value: (carBuyers.data ?? []).filter((l) => l["status"] === "Visit Planned").length,
      icon: Car,
      to: "/cars",
    },
    {
      label: "Digital products",
      value: (products.data ?? []).length,
      icon: Package,
      to: "/products",
    },
    { label: "Total sales", value: formatMoney(totalSales), icon: TrendingUp, to: "/customers" },
    {
      label: "Revenue this month",
      value: formatMoney(revenueThisMonth),
      icon: TrendingUp,
      to: "/customers",
    },
    { label: "Active subscriptions", value: activeSubscriptions, icon: Users, to: "/customers" },
    {
      label: "Blackchaine revenue",
      value: formatMoney(blackchaineRevenue, blackchaineCurrency),
      icon: Shirt,
      to: "/blackchaine",
    },
  ];

  return (
    <div className="dash-scene space-y-6">
      <PageHeader
        title="Dashboard"
        description="Everything you run, in one place."
      />

      <section className="dash-hero dash-rise p-5 sm:p-6">
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Command center
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Your business, in depth.
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Sites, SaaS, cars, produits digitaux et Blackchaine — tout ce que tu pilotes, sur un seul
          plan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/blackchaine" className="dash-chip">
            <Shirt className="size-3.5" /> Blackchaine
          </Link>
          <Link to="/saas" className="dash-chip">
            <Briefcase className="size-3.5" /> SaaS
          </Link>
          <Link to="/velora" className="dash-chip">
            Velora
          </Link>
          <Link to="/tasks" className="dash-chip">
            <CheckSquare className="size-3.5" /> Tâches
          </Link>
          <Link to="/research" className="dash-chip">
            Recherches
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <Kpi key={kpi.label} {...kpi} index={index} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="dash-card dash-rise lg:col-span-2" style={delay(500)}>
          <CardHeader>
            <CardTitle className="text-base">Tasks board</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TASK_BOARD_STATUSES.map((status) => {
                const list = taskRows.filter((t) => t["status"] === status);
                return (
                  <div key={status} className="rounded-lg bg-muted/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium">{status}</p>
                      <span className="text-xs text-muted-foreground">{list.length}</span>
                    </div>
                    <div className="space-y-2">
                      {list.slice(0, 5).map((t: Row) => (
                        <Link
                          key={t["id"]}
                          to="/tasks"
                          className="block rounded-md border border-border bg-card px-2.5 py-2 text-xs transition-colors hover:bg-accent"
                        >
                          <p className="truncate font-medium">{t["title"]}</p>
                          <p className="mt-1 text-muted-foreground">{formatDate(t["due_date"])}</p>
                        </Link>
                      ))}
                      {list.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nothing here</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="dash-card dash-rise" style={delay(560)}>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due today. Nice.</p>
            ) : (
              todaysTasks.slice(0, 8).map((t) => (
                <Link
                  key={t["id"]}
                  to="/tasks"
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="truncate">{t["title"]}</span>
                  <StatusBadge value={t["priority"]} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dash-card dash-rise" style={delay(620)}>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Activity appears here as you add work with the “Add” button.
            </p>
          ) : (
            activity.map((a, i) => (
              <Link
                key={i}
                to={a.to}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    <span className="text-muted-foreground">{a.label}:</span> {a.title}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.at)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

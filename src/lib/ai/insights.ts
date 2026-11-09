import { createClient } from "@supabase/supabase-js";

// Same access pattern as the app's publishable client (open-access DB).
function getClient() {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    "";
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Row = Record<string, any>;

async function fetchAll(table: string): Promise<Row[]> {
  try {
    const { data, error } = await getClient().from(table).select("*");
    if (error) return [];
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function countByStatus(rows: Row[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r["status"] ?? "Unknown");
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

/**
 * Computes the same KPIs shown on the dashboard page (mirrors
 * src/routes/_app.dashboard.tsx) plus actionable alerts the assistant uses
 * to answer "how is my business doing?" style questions.
 */
export async function computeInsights() {
  const [
    tasks,
    websites,
    saas,
    carBuyers,
    products,
    sales,
    customers,
    veloraOrders,
    veloraExpenses,
    veloraClients,
  ] = await Promise.all([
    fetchAll("tasks"),
    fetchAll("client_websites"),
    fetchAll("saas_projects"),
    fetchAll("car_buyers"),
    fetchAll("digital_products"),
    fetchAll("sales"),
    fetchAll("customers"),
    fetchAll("velora_orders"),
    fetchAll("velora_expenses"),
    fetchAll("velora_clients"),
  ]);

  const today = new Date();
  const todayIso = isoDay(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const in14 = addDays(today, 14);
  const in30 = addDays(today, 30);

  const paid = sales.filter((s) => s["payment_status"] === "Paid");
  const unpaid = sales.filter(
    (s) => s["payment_status"] !== "Paid" && s["payment_status"] !== "Refunded",
  );
  const totalSales = paid.reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);
  const revenueThisMonth = paid
    .filter((s) => new Date(s["purchase_date"]) >= monthStart)
    .reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0);

  const overdueTasks = tasks
    .filter((t) => t["due_date"] && t["due_date"] <= todayIso && t["status"] !== "Done")
    .map((t) => ({ title: t["title"], due_date: t["due_date"], priority: t["priority"] }));

  const upcomingDeadlines = [
    ...websites
      .filter(
        (w) =>
          w["deadline"] &&
          new Date(w["deadline"]) >= today &&
          new Date(w["deadline"]) <= in14 &&
          w["status"] !== "Completed",
      )
      .map((w) => ({ project: w["project_name"], deadline: w["deadline"], status: w["status"] })),
    ...saas
      .filter(
        (p) =>
          p["target_date"] &&
          new Date(p["target_date"]) >= today &&
          new Date(p["target_date"]) <= in14 &&
          p["status"] !== "Completed",
      )
      .map((p) => ({ project: p["project_name"], deadline: p["target_date"], status: p["status"] })),
  ].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));

  const blocked = [
    ...tasks
      .filter((t) => t["status"] === "Blocked")
      .map((t) => ({ kind: "task", title: t["title"], status: t["status"] })),
    ...websites
      .filter((w) => w["status"] === "Blocked" || w["status"] === "Waiting for Client")
      .map((w) => ({ kind: "website", title: w["project_name"], status: w["status"] })),
    ...saas
      .filter((p) => p["status"] === "Paused" || p["status"] === "Blocked")
      .map((p) => ({ kind: "saas", title: p["project_name"], status: p["status"] })),
  ];

  const expiringAccess = customers
    .filter(
      (c) =>
        c["access_status"] === "Active" &&
        c["expiration_date"] &&
        new Date(c["expiration_date"]) >= today &&
        new Date(c["expiration_date"]) <= in30,
    )
    .map((c) => ({ name: c["name"], expiration_date: c["expiration_date"] }));

  const veloraRevenue = veloraOrders
    .filter((o) => o["status"] !== "Cancelled")
    .reduce((sum, o) => sum + Number(o["sale_price"] ?? 0), 0);
  const veloraCosts = veloraExpenses.reduce(
    (sum, e) => sum + Number(e["amount"] ?? 0),
    0,
  );

  return {
    kpis: {
      activeClientWebsites: websites.filter((w) => w["status"] !== "Completed").length,
      saasProjects: saas.length,
      carBuyers: carBuyers.length,
      visitsPlanned: carBuyers.filter((l) => l["status"] === "Visit Planned").length,
      digitalProducts: products.length,
      totalSalesPaid: totalSales,
      revenueThisMonth,
      activeSubscriptions: customers.filter(
        (c) => c["product_type"] === "Subscription" && c["access_status"] === "Active",
      ).length,
    },
    alerts: {
      overdueTasks,
      upcomingDeadlines,
      blocked,
      unpaidSales: {
        count: unpaid.length,
        total: unpaid.reduce((sum, s) => sum + Number(s["amount"] ?? 0), 0),
      },
      expiringAccess,
    },
    velocity: {
      tasksByStatus: countByStatus(tasks),
      saasByStatus: countByStatus(saas),
      carBuyersByStatus: countByStatus(carBuyers),
      veloraOrdersByStatus: countByStatus(veloraOrders),
    },
    velora: {
      clients: veloraClients.length,
      revenue: veloraRevenue,
      expenses: veloraCosts,
      profit: veloraRevenue - veloraCosts,
    },
  };
}

import { Link, createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useRows } from "@/lib/db";
import { entityLabels, entityRoutes, labelColumn, searchColumns } from "@/lib/entities";


export const Route = createFileRoute("/_app/search")({
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Search — My Business OS" },
      { name: "description", content: "Search across every part of your business." },
      { property: "og:title", content: "Search — My Business OS" },
      { property: "og:description", content: "Search across every part of your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

const tables = [
  "tasks",
  "client_websites",
  "saas_projects",
  "car_buyers",
  "velora_clients",
  "velora_orders",
  "digital_products",
  "customers",
  "resources",
] as const;

function SearchPage() {
  const { q } = Route.useSearch();
  const term = q.trim().toLowerCase();

  const results = tables.map((table) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data = [] } = useRows(table, {});
    const cols = searchColumns[table] ?? [];
    const matches = term
      ? data.filter((row) =>
          cols.some((c) => String(row[c] ?? "").toLowerCase().includes(term)),
        )
      : [];
    return { table, matches };
  });

  const total = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <>
      <PageHeader title="Search" description={q ? `Results for “${q}”` : "Type in the search bar above."} />

      {!term ? (
        <EmptyState title="Search everything" description="Tasks, websites, projects, car buyers, products, customers and resources." />
      ) : total === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for “${q}”.`} />
      ) : (
        <div className="space-y-6">
          {results
            .filter((r) => r.matches.length > 0)
            .map(({ table, matches }) => (
              <section key={table}>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {entityLabels[table]} ({matches.length})
                </h2>
                <div className="space-y-2">
                  {matches.map((row) => (
                    <Link
                      key={row["id"]}
                      to={entityRoutes[table]!}
                      className="block rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <p className="font-medium">{row[labelColumn[table] ?? "name"]}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row["description"] ?? row["email"] ?? row["city"] ?? ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
}

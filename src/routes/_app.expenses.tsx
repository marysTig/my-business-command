import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDelete } from "@/components/confirm-delete";
import { EmptyState } from "@/components/empty-state";
import { EntityFormDialog } from "@/components/entity-form";
import { LoadingRows } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatMoney, useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/db";
import { SectionResearch } from "@/components/section-research";
import { EXPENSE_CATEGORIES, VELORA_CURRENCIES } from "@/lib/entities";

export const Route = createFileRoute("/_app/expenses")({
  head: () => ({
    meta: [
      { title: "Dépenses — My Business OS" },
      { name: "description", content: "Tes dépenses personnelles, jour par jour." },
      { property: "og:title", content: "Dépenses — My Business OS" },
      {
        property: "og:description",
        content: "Tes dépenses personnelles, jour par jour.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

/** Today's date as YYYY-MM-DD in the user's own timezone (not UTC). */
function localDate(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  return localDate(new Date(Date.now() - days * 86_400_000));
}

/** Totals per currency, so DZD and EUR amounts are never added together. */
function sumByCurrency(rows: Row[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const currency = String(row["currency"] ?? "DZD");
    totals.set(currency, (totals.get(currency) ?? 0) + Number(row["amount"] ?? 0));
  }
  if (totals.size === 0) return formatMoney(0, "DZD");
  return [...totals.entries()].map(([currency, total]) => formatMoney(total, currency)).join(" · ");
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

function ExpensesPage() {
  const { data = [], isLoading } = useRows("personal_expenses", {
    order: { column: "expense_date", ascending: false },
  });
  const save = useSaveRow("personal_expenses");
  const del = useDeleteRow("personal_expenses");

  const today = localDate();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string>("DZD");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(today);

  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const stats = useMemo(() => {
    const month = today.slice(0, 7);
    const weekStart = daysAgo(6);
    const todays = data.filter((row) => row["expense_date"] === today);
    const week = data.filter((row) => String(row["expense_date"] ?? "") >= weekStart);
    const monthRows = data.filter((row) => String(row["expense_date"] ?? "").startsWith(month));
    const daysWithExpenses = new Set(monthRows.map((row) => row["expense_date"])).size;
    const monthTotal = monthRows.reduce((total, row) => total + Number(row["amount"] ?? 0), 0);
    return { todays, week, monthRows, daysWithExpenses, monthTotal };
  }, [data, today]);

  const groups = useMemo(() => {
    const byDate = new Map<string, Row[]>();
    for (const row of data) {
      const key = String(row["expense_date"] ?? "—");
      const list = byDate.get(key) ?? [];
      list.push(row);
      byDate.set(key, list);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, rows]) => ({
        day,
        rows: rows.sort((a, b) => String(b["created_at"] ?? "").localeCompare(String(a["created_at"] ?? ""))),
        total: sumByCurrency(rows),
      }));
  }, [data]);

  async function addExpense(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    const value = Number(amount);
    if (!trimmed || !Number.isFinite(value) || value <= 0) return;
    await save.mutateAsync({
      label: trimmed,
      amount: value,
      currency,
      category,
      expense_date: date,
    });
    setLabel("");
    setAmount("");
  }

  return (
    <>
      <PageHeader
        title="Dépenses"
        description="Tes dépenses personnelles, jour par jour."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Nouvelle dépense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aujourd'hui" value={sumByCurrency(stats.todays)} />
        <StatCard label="7 derniers jours" value={sumByCurrency(stats.week)} />
        <StatCard label="Ce mois" value={sumByCurrency(stats.monthRows)} />
        <StatCard
          label="Moyenne / jour (ce mois)"
          value={formatMoney(
            stats.daysWithExpenses > 0 ? stats.monthTotal / stats.daysWithExpenses : 0,
            data[0]?.["currency"] ?? "DZD",
          )}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ajout rapide</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="expense-label" className="text-xs text-muted-foreground">
                Dépense
              </Label>
              <Input
                id="expense-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Courses, essence, facture…"
                required
              />
            </div>
            <div>
              <Label htmlFor="expense-amount" className="text-xs text-muted-foreground">
                Montant
              </Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expense-date" className="text-xs text-muted-foreground">
                Date
              </Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="w-24">
                <Label className="text-xs text-muted-foreground">Devise</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VELORA_CURRENCIES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="flex-1" disabled={save.isPending}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingRows />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Aucune dépense"
          description="Ajoute ta première dépense pour voir le total de la journée ici."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Nouvelle dépense
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.day}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                <CardTitle className="text-sm">
                  {group.day === today ? "Aujourd'hui" : formatDate(group.day)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {group.rows.length} dépense{group.rows.length > 1 ? "s" : ""}
                  </span>
                </CardTitle>
                <span className="text-sm font-semibold tabular-nums">{group.total}</span>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {group.rows.map((row) => (
                    <div key={String(row["id"])} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{row["label"]}</p>
                        <p className="text-xs text-muted-foreground">
                          {row["category"] ?? "Sans catégorie"}
                          {row["notes"] ? ` · ${row["notes"]}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatMoney(Number(row["amount"] ?? 0), String(row["currency"] ?? "DZD"))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Modifier ${row["label"]}`}
                        onClick={() => {
                          setEditing(row);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        aria-label={`Supprimer ${row["label"]}`}
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EntityFormDialog
        table="personal_expenses"
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        defaults={{ expense_date: today, currency: "DZD", category: EXPENSE_CATEGORIES[0] }}
        title={editing ? "Modifier la dépense" : "Nouvelle dépense"}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        name={deleting?.["label"]}
        onConfirm={() => {
          if (deleting) del.mutate(String(deleting["id"]));
          setDeleting(null);
        }}
      />

      <SectionResearch section="expenses" />
    </>
  );
}

import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { ConfirmDelete } from "@/components/confirm-delete";
import { EmptyState } from "@/components/empty-state";
import { EntityFormDialog } from "@/components/entity-form";
import { LoadingRows } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteRow, useRows, type Row } from "@/lib/db";
import { labelColumn, searchColumns } from "@/lib/entities";

export type Column = {
  key: string;
  header: string;
  render?: (row: Row) => ReactNode;
  className?: string | undefined;
};

export function CrudPage({
  table,
  title,
  description,
  columns,
  statusField,
  statusOptions,
  detailPath,
  toolbar,
  emptyTitle,
  rowFilter,
  pageSize = 40,
}: {
  table: string;
  title: string;
  description?: string;
  columns: Column[];
  statusField?: string;
  statusOptions?: readonly string[];
  detailPath?: string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  /** Keeps only the rows that belong to this sub-section. */
  rowFilter?: (row: Row) => boolean;
  /** Rows shown at a time; the rest is reachable with « Suivant ». */
  pageSize?: number;
}) {
  const { data = [], isLoading } = useRows(table, {});
  const del = useDeleteRow(table);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [page, setPage] = useState(0);

  const label = labelColumn[table] ?? "name";

  const rows = useMemo(() => {
    const cols = searchColumns[table] ?? [label];
    const q = term.trim().toLowerCase();
    return data.filter((row) => {
      if (rowFilter && !rowFilter(row)) return false;
      if (statusField && status !== "all" && row[statusField] !== status) return false;
      if (!q) return true;
      return cols.some((c) => String(row[c] ?? "").toLowerCase().includes(q));
    });
  }, [data, term, status, statusField, table, label, rowFilter]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const firstIndex = currentPage * pageSize;
  const pageRows = rows.slice(firstIndex, firstIndex + pageSize);

  return (
    <>
      <PageHeader
        title={title}
        {...(description ? { description } : {})}
        actions={
          <>
            {toolbar}
            <Button
              size="sm"
              data-testid="crud-new"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> New
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            data-testid="crud-search"
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(0);
            }}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        {statusField && statusOptions ? (
          <select
            aria-label="Filtrer par statut"
            data-testid="crud-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-52"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? `No ${title.toLowerCase()} yet`}
          description="Create your first entry to see it here."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> New
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead className="hidden md:table-cell">Ajouté par</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row["id"]} data-testid={`row-${row["id"]}`}>
                  {columns.map((c, i) => (
                    <TableCell key={c.key} className={c.className}>
                      {i === 0 && detailPath ? (
                        <Link
                          to={detailPath}
                          params={{ id: row["id"] }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {c.render ? c.render(row) : (row[c.key] ?? "—")}
                        </Link>
                      ) : c.render ? (
                        c.render(row)
                      ) : (
                        (row[c.key] ?? "—")
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {row["created_by"] ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {detailPath ? (
                          <DropdownMenuItem asChild>
                            <Link to={detailPath} params={{ id: row["id"] }}>
                              Open
                            </Link>
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(row);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setDeleting(row)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* The floating assistant bubble sits bottom-right, so keep this bar above it. */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-20 text-sm">
          <p className="text-muted-foreground" data-testid="crud-page-info">
            {`${firstIndex + 1}–${Math.min(firstIndex + pageSize, rows.length)} sur ${rows.length}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="crud-prev"
              disabled={currentPage === 0}
              onClick={() => setPage(Math.max(0, currentPage - 1))}
            >
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <span className="tabular-nums text-muted-foreground" data-testid="crud-page-number">
              Page {currentPage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-testid="crud-next"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            >
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        </div>
      )}

      <EntityFormDialog
        table={table}
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        title={editing ? `Edit ${title}` : `New ${title}`}
      />

      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        name={deleting?.[label]}
        onConfirm={() => {
          if (deleting) del.mutate(deleting["id"]);
          setDeleting(null);
        }}
      />
    </>
  );
}

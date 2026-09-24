import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}) {
  const { data = [], isLoading } = useRows(table, {});
  const del = useDeleteRow(table);
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const label = labelColumn[table] ?? "name";

  const rows = useMemo(() => {
    const cols = searchColumns[table] ?? [label];
    const q = term.trim().toLowerCase();
    return data.filter((row) => {
      if (statusField && status !== "all" && row[statusField] !== status) return false;
      if (!q) return true;
      return cols.some((c) => String(row[c] ?? "").toLowerCase().includes(q));
    });
  }, [data, term, status, statusField, table, label]);

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
            onChange={(e) => setTerm(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        {statusField && statusOptions ? (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.key} className={c.className}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row["id"]}>
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

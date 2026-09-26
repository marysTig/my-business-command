import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDelete } from "@/components/confirm-delete";
import { EmptyState } from "@/components/empty-state";
import { EntityFormDialog } from "@/components/entity-form";
import { LoadingRows } from "@/components/loading";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/db";
import { TASK_BOARD_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/entities";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — My Business OS" },
      { name: "description", content: "Plan and track every task across all your activities." },
      { property: "og:title", content: "Tasks — My Business OS" },
      {
        property: "og:description",
        content: "Plan and track every task across all your activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TasksPage,
});

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatus,
}: {
  task: Row;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <button className="text-left text-sm font-medium hover:underline" onClick={onEdit}>
          {task["title"]}
        </button>
        <StatusBadge value={task["priority"]} />
      </div>
      {task["description"] ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task["description"]}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{formatDate(task["due_date"])}</span>
        <div className="flex items-center gap-1">
          <Select value={task["status"]} onValueChange={onStatus}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            ×
          </Button>
        </div>
      </div>
    </div>
  );
}

function TasksPage() {
  const { data = [], isLoading } = useRows("tasks", {});
  const save = useSaveRow("tasks");
  const del = useDeleteRow("tasks");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return data.filter((t) => {
      if (status !== "all" && t["status"] !== status) return false;
      if (priority !== "all" && t["priority"] !== priority) return false;
      if (!q) return true;
      return ["title", "description", "category", "notes"].some((c) =>
        String(t[c] ?? "").toLowerCase().includes(q),
      );
    });
  }, [data, term, status, priority]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Every task, linked to the work it belongs to."
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4" /> New task
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add your first task to start tracking daily work."
          action={<Button onClick={openNew}>New task</Button>}
        />
      ) : (
        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="board">Kanban</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 space-y-2">
            {rows.map((task) => (
              <div
                key={task["id"]}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <button
                    className="truncate text-sm font-medium hover:underline"
                    onClick={() => {
                      setEditing(task);
                      setFormOpen(true);
                    }}
                  >
                    {task["title"]}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {task["category"] ?? "Uncategorised"} · due {formatDate(task["due_date"])}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={task["priority"]} />
                  <StatusBadge value={task["status"]} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleting(task)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="board" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {TASK_BOARD_STATUSES.map((column) => (
                <div key={column} className="rounded-xl bg-muted/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">{column}</p>
                    <span className="text-xs text-muted-foreground">
                      {rows.filter((t) => t["status"] === column).length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {rows
                      .filter((t) => t["status"] === column)
                      .map((task) => (
                        <TaskCard
                          key={task["id"]}
                          task={task}
                          onEdit={() => {
                            setEditing(task);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleting(task)}
                          onStatus={(s) => save.mutate({ id: task["id"], status: s })}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <EntityFormDialog
        table="tasks"
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editing}
        title={editing ? "Edit task" : "New task"}
      />
      <ConfirmDelete
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        name={deleting?.["title"]}
        onConfirm={() => {
          if (deleting) del.mutate(deleting["id"]);
          setDeleting(null);
        }}
      />
    </>
  );
}

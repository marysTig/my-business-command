import { Link } from "@tanstack/react-router";
import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { EntityFormDialog } from "@/components/entity-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, useRows, type Row } from "@/lib/db";

export function RelatedTasks({ filters }: { filters: Row }) {
  const { data = [], isLoading } = useRows("tasks", { filters });
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tasks</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Task
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks linked yet.</p>
        ) : (
          data.map((task) => (
            <Link
              key={task["id"]}
              to="/tasks"
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <span className="truncate font-medium">{task["title"]}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatDate(task["due_date"])}</span>
                <StatusBadge value={task["status"]} />
              </span>
            </Link>
          ))
        )}
      </CardContent>
      <EntityFormDialog
        table="tasks"
        open={open}
        onOpenChange={setOpen}
        defaults={filters}
        title="New linked task"
      />
    </Card>
  );
}

export function RelatedResources({ filters }: { filters: Row }) {
  const { data = [], isLoading } = useRows("resources", { filters });
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Resources</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Resource
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <EmptyState title="No resources attached" description="Attach inspiration, docs or tools." />
        ) : (
          data.map((res) => (
            <a
              key={res["id"]}
              href={res["url"] ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <span className="truncate font-medium">{res["name"]}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {res["category"]}
                <ExternalLink className="size-3.5" />
              </span>
            </a>
          ))
        )}
      </CardContent>
      <EntityFormDialog
        table="resources"
        open={open}
        onOpenChange={setOpen}
        defaults={filters}
        title="New linked resource"
      />
    </Card>
  );
}

export function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm text-foreground">{value ?? "—"}</div>
    </div>
  );
}

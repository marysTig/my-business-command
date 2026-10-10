import {
  Briefcase,
  Car,
  CheckSquare,
  Globe,
  Library,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { useState } from "react";

import { EntityFormDialog } from "@/components/entity-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  { table: "tasks", label: "Add Task", icon: CheckSquare },
  { table: "client_websites", label: "Add Client Website", icon: Globe },
  { table: "saas_projects", label: "Add SaaS Project", icon: Briefcase },
  { table: "car_buyers", label: "Add Car Buyer", icon: Car },
  { table: "digital_products", label: "Add Digital Product", icon: Package },
  { table: "customers", label: "Add Customer", icon: Users },
  { table: "resources", label: "Add Resource", icon: Library },
] as const;

export function QuickAdd() {
  const [table, setTable] = useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {items.map((item) => (
            <DropdownMenuItem key={item.table} onSelect={() => setTable(item.table)}>
              <item.icon className="mr-2 size-4 text-muted-foreground" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {table ? (
        <EntityFormDialog
          table={table}
          open={Boolean(table)}
          onOpenChange={(open) => {
            if (!open) setTable(null);
          }}
          title={items.find((i) => i.table === table)?.label ?? "New entry"}
        />
      ) : null}
    </>
  );
}

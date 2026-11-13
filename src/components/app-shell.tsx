import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Briefcase,
  Car,
  CheckSquare,
  ChevronDown,
  Globe,
  Gem,
  LayoutDashboard,
  Library,
  Menu,
  Package,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AiChat } from "@/components/ai-chat";
import { QuickAdd } from "@/components/quick-add";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { setMember, useMember } from "@/lib/member";

// A section with `children` folds open into its sub-sections: the parent still
// opens its main list, and the chevron (or the parent itself) reveals the rest.
const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, testId: "nav-tasks" },
  { to: "/websites", label: "Client Websites", icon: Globe, testId: "nav-websites" },
  {
    to: "/saas",
    label: "SaaS Projects",
    icon: Briefcase,
    testId: "nav-saas",
    children: [
      { to: "/saas", label: "Projets", testId: "nav-saas-projects" },
      { to: "/saas/prospects", label: "Liste prospection", testId: "nav-saas-prospects" },
    ],
  },
  { to: "/cars", label: "Car Buyers", icon: Car, testId: "nav-cars" },
  { to: "/products", label: "Digital Products", icon: Package, testId: "nav-products" },
  { to: "/customers", label: "Customers", icon: Users, testId: "nav-customers" },
  { to: "/resources", label: "Resources", icon: Library, testId: "nav-resources" },
  { to: "/velora", label: "Velora", icon: Gem, testId: "nav-velora" },
  { to: "/expenses", label: "Dépenses", icon: Wallet, testId: "nav-expenses" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
] as const;

type NavEntry = (typeof nav)[number];

const rowClass =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground";

function inSection(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavGroup({
  item,
  pathname,
  onNavigate,
}: {
  item: Extract<NavEntry, { children: readonly unknown[] }>;
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const active = inSection(pathname, item.to);
  const [open, setOpen] = useState(active);

  // Landing inside the section always reveals its sub-sections, so the state is
  // visible without a click and automation never fights a collapsed menu.
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Link to={item.to} onClick={onNavigate} data-testid={item.testId} className={`flex-1 ${rowClass}`}>
          <item.icon className="size-4" />
          <span className="flex-1 truncate text-left">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Masquer les sous-sections ${item.label}` : `Afficher les sous-sections ${item.label}`}
          data-testid={`${item.testId}-toggle`}
          onClick={() => setOpen((value) => !value)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open ? (
        <div
          className="mt-0.5 mb-1 ml-5 flex flex-col gap-0.5 border-l border-border pl-2"
          data-testid={`${item.testId}-children`}
        >
          {item.children.map((child) => (
            <Link
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              data-testid={child.testId}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:font-medium data-[status=active]:text-foreground"
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) =>
        "children" in item ? (
          <NavGroup key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-testid={item.testId}
            className={rowClass}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
        OS
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-foreground">My Business OS</p>
        <p className="text-xs text-muted-foreground">Command center</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const member = useMember();
  const [term, setTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim()) return;
    navigate({ to: "/search", search: { q: term.trim() } });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar p-3 lg:flex">
        <Brand />
        <div className="mt-6 flex-1">
          <NavList />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-3">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand />
              <div className="mt-6">
                <NavList onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <form onSubmit={submitSearch} className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search everything…"
              className="pl-9"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              title="Changer d'utilisateur"
              onClick={() => setMember(null)}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {(member ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{member}</span>
            </Button>
            <QuickAdd />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 lg:p-6">{children}</main>
      </div>

      <AiChat />
    </div>
  );
}

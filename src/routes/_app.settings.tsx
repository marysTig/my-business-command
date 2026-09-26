import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { useRows } from "@/lib/db";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — My Business OS" },
      { name: "description", content: "Account details and workspace overview." },
      { property: "og:title", content: "Settings — My Business OS" },
      { property: "og:description", content: "Account details and workspace overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const counts = {
    "Client websites": useRows("client_websites", {}).data?.length ?? 0,
    "SaaS projects": useRows("saas_projects", {}).data?.length ?? 0,
    Properties: useRows("properties", {}).data?.length ?? 0,
    Leads: useRows("leads", {}).data?.length ?? 0,
    "Digital products": useRows("digital_products", {}).data?.length ?? 0,
    Customers: useRows("customers", {}).data?.length ?? 0,
    Tasks: useRows("tasks", {}).data?.length ?? 0,
    Resources: useRows("resources", {}).data?.length ?? 0,
  };

  return (
    <>
      <PageHeader title="Settings" description="Your account and workspace." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Signed in as </span>
            {user?.email}
          </p>
          <p className="text-muted-foreground">
            Your data is private: every record is tied to your account and only you can read it.
            Never store passwords or secret keys in this dashboard — keep links only.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace contents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(counts).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { MemberPicker } from "@/components/member-picker";
import { useMember } from "@/lib/member";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const member = useMember();
  if (!member) return <MemberPicker />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

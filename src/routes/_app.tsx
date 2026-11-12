import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AccessGate } from "@/components/access-gate";
import { AppShell } from "@/components/app-shell";
import { MemberPicker } from "@/components/member-picker";
import { useUnlocked } from "@/lib/access";
import { useMember } from "@/lib/member";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const unlocked = useUnlocked();
  const member = useMember();
  if (!unlocked) return <AccessGate />;
  if (!member) return <MemberPicker />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

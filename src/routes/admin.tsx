import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/khazna/AppShell";

export const Route = createFileRoute("/admin")({
  component: () => (
    <AppShell role="admin">
      <Outlet />
    </AppShell>
  ),
});

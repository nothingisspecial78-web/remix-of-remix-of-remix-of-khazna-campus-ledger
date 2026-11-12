import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/khazna/AppShell";

export const Route = createFileRoute("/app")({
  component: () => (
    <AppShell role="student">
      <Outlet />
    </AppShell>
  ),
});

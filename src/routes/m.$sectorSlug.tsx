import { Outlet, createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/khazna/AppShell";
import { useKhazna } from "@/lib/khazna/store";

export const Route = createFileRoute("/m/$sectorSlug")({
  beforeLoad: ({ params }) => {
    const role = useKhazna.getState().currentRole;
    if (role === "admin") {
      throw redirect({ to: "/admin" });
    } else if (role === "student") {
      throw redirect({ to: "/app" });
    }
    if (!useKhazna.getState().sectors.some((s) => s.slug === params.sectorSlug)) throw notFound();
  },
  component: ManagerLayout,
});

function ManagerLayout() {
  const { sectorSlug } = Route.useParams();
  const slug = sectorSlug;
  const setManagerSector = useKhazna((s) => s.setManagerSector);
  useEffect(() => setManagerSector(slug), [slug, setManagerSector]);
  return (
    <AppShell role="manager" sectorSlug={slug}>
      <Outlet />
    </AppShell>
  );
}

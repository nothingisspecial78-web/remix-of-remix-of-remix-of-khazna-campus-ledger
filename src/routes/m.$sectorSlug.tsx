import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/khazna/AppShell";
import { useKhazna } from "@/lib/khazna/store";

export const Route = createFileRoute("/m/$sectorSlug")({
  beforeLoad: ({ params }) => {
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

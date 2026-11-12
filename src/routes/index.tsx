import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Khazna — Islahul Uloom Finance Portal" },
      { name: "description", content: "Cash ledger and finance portal for Islahul Uloom college students, sector managers and administrators." },
      { property: "og:title", content: "Khazna — Islahul Uloom Finance Portal" },
      { property: "og:description", content: "Cash ledger and finance portal for Islahul Uloom college." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

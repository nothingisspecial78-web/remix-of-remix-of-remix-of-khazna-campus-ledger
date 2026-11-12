import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BellOff, CheckCheck, Info } from "lucide-react";
import { useState } from "react";
import { Btn } from "@/components/khazna/btn";
import { EmptyState, PageHeader, Segmented } from "@/components/khazna/primitives";
import { timeAgo } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Notice } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Khazna Student Portal" },
      { name: "description", content: "Deposits, fees and due reminders from every Islahul Uloom sector." },
      { property: "og:title", content: "Notifications — Khazna Student Portal" },
      { property: "og:description", content: "Deposits, fees and due reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const KIND: Record<Notice["kind"], { icon: typeof Info; cls: string }> = {
  credit: { icon: ArrowDownLeft, cls: "text-credit bg-credit/12 border-credit/25" },
  debit: { icon: ArrowUpRight, cls: "text-debit bg-debit/12 border-debit/25" },
  due: { icon: AlertTriangle, cls: "text-primary bg-primary/12 border-primary/25" },
  info: { icon: Info, cls: "text-info bg-info/12 border-info/25" },
};

function NotificationsPage() {
  const notices = useKhazna((s) => s.notices);
  const sectors = useKhazna((s) => s.sectors);
  const markRead = useKhazna((s) => s.markRead);
  const markAllRead = useKhazna((s) => s.markAllRead);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = notices.filter((n) => !n.read).length;
  const shown = filter === "all" ? notices : notices.filter((n) => !n.read);

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up"}
        actions={<Btn variant="glass" disabled={!unread} onClick={markAllRead}><CheckCheck /> Mark all read</Btn>}
      />
      <Segmented className="mb-4" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unread", label: `Unread ${unread}` }]} />
      <div className="glass divide-y divide-hairline overflow-hidden">
        {shown.length === 0 && <EmptyState icon={BellOff} title="No unread notifications" />}
        {shown.map((n, i) => {
          const K = KIND[n.kind];
          const sec = sectors.find((s) => s.slug === n.sector);
          return (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => markRead(n.id)}
              className={cn("flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-accent", !n.read && "bg-primary/[0.04]")}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", K.cls)}><K.icon className="size-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>{n.title}</span>
                  {!n.read && <span className="size-2 rounded-full bg-primary shadow-glow" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-1.5 flex gap-3 text-xs text-subtle">
                  <span>{timeAgo(n.at)}</span>
                  {sec && (
                    <Link to="/app/s/$sectorSlug" params={{ sectorSlug: sec.slug }} onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
                      {sec.name} ledger →
                    </Link>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

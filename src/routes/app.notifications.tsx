import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, BellOff, CheckCheck, Clock, Info, MousePointerClick } from "lucide-react";
import { useState } from "react";
import { Btn } from "@/components/khazna/btn";
import { Chip, EmptyState, PageHeader } from "@/components/khazna/primitives";
import { SECTOR_ICON, tileVar } from "@/components/khazna/sector-meta";
import { formatDate, formatTime, timeAgo } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Notice, Sector } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

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

const KIND: Record<Notice["kind"], { icon: typeof Info; label: string; tone: "credit" | "debit" | "primary" | "info" }> = {
  credit: { icon: ArrowDownLeft, label: "Credit", tone: "credit" },
  debit: { icon: ArrowUpRight, label: "Debit", tone: "debit" },
  due: { icon: AlertTriangle, label: "Due", tone: "primary" },
  info: { icon: Info, label: "Info", tone: "info" },
};

function NoticeIcon({ sector, size = "size-10" }: { sector: Sector | undefined; size?: string }) {
  if (!sector) {
    return (
      <span className={cn("grid shrink-0 place-items-center rounded-xl border border-info/25 bg-info/12 text-info", size)}>
        <Bell className="size-4" />
      </span>
    );
  }
  const Icon = SECTOR_ICON[sector.slug];
  return (
    <span className={cn("tile-icon shrink-0", size)} style={tileVar(sector.color)}>
      <Icon className="size-4" />
    </span>
  );
}

function NoticeDetail({ notice, sector }: { notice: Notice; sector: Sector | undefined }) {
  const K = KIND[notice.kind];
  return (
    <div>
      <div className="flex items-center gap-3">
        <NoticeIcon sector={sector} size="size-12" />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{sector?.name ?? "Islahul Uloom office"}</div>
          <h3 className="text-lg font-semibold leading-tight">{notice.title}</h3>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip tone={K.tone} icon={K.icon}>{K.label}</Chip>
        <Chip tone="neutral" icon={Clock}>
          {formatDate(notice.at)} · {formatTime(notice.at)}
        </Chip>
      </div>
      <p className="glass-inset mt-4 p-4 text-sm leading-relaxed text-foreground/90">{notice.body}</p>
      {sector && (
        <Btn variant="glass" className="mt-4 w-full" asChild>
          <Link to="/app/s/$sectorSlug" params={{ sectorSlug: sector.slug }}>
            Open {sector.name} ledger <ArrowRight />
          </Link>
        </Btn>
      )}
    </div>
  );
}

function NotificationsPage() {
  const notices = useKhazna((s) => s.notices);
  const sectors = useKhazna((s) => s.sectors);
  const markRead = useKhazna((s) => s.markRead);
  const markAllRead = useKhazna((s) => s.markAllRead);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unread = notices.filter((n) => !n.read).length;
  const shown = filter === "all" ? notices : notices.filter((n) => !n.read || n.id === selectedId);
  const selected = notices.find((n) => n.id === selectedId);
  const sectorOf = (n: Notice) => sectors.find((s) => s.slug === n.sector);

  const open = (n: Notice) => {
    setSelectedId((cur) => (cur === n.id ? null : n.id));
    if (!n.read) markRead(n.id);
  };

  const pills: { value: "all" | "unread"; label: string; count: number }[] = [
    { value: "all", label: "All", count: notices.length },
    { value: "unread", label: "Unread", count: unread },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        description={unread ? `${unread} unread from your sectors` : "You're all caught up"}
        actions={
          <Btn variant="glass" disabled={!unread} onClick={markAllRead}>
            <CheckCheck /> Mark all as read
          </Btn>
        }
      />

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Filter notifications">
        {pills.map((p) => {
          const active = filter === p.value;
          return (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(p.value)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                active ? "border-primary/50 bg-primary/15 text-primary shadow-glow" : "border-hairline bg-accent text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 py-px text-[10px] font-bold num",
                  active ? "bg-primary text-primary-foreground" : p.value === "unread" && p.count ? "bg-primary/20 text-primary" : "bg-accent text-muted-foreground",
                )}
              >
                {p.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="glass divide-y divide-hairline overflow-hidden">
          {shown.length === 0 && <EmptyState icon={BellOff} title="No unread notifications" body="New deposits, fees and reminders will show up here." />}
          {shown.map((n, i) => {
            const K = KIND[n.kind];
            const sec = sectorOf(n);
            const isSel = n.id === selectedId;
            return (
              <motion.div key={n.id} layout {...reveal(i)}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  aria-expanded={isSel}
                  className={cn(
                    "relative flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-accent",
                    !n.read && "bg-primary/[0.05]",
                    isSel && "bg-accent",
                  )}
                >
                  {isSel && <motion.span layoutId="notice-sel" className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-primary" />}
                  <NoticeIcon sector={sec} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm", n.read ? "text-muted-foreground" : "font-semibold text-foreground")}>{n.title}</span>
                      <Chip tone={K.tone} icon={K.icon}>{K.label}</Chip>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{n.body}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-subtle">
                      <span title={`${formatDate(n.at)} ${formatTime(n.at)}`}>{timeAgo(n.at)}</span>
                      {sec && <span>{sec.name}</span>}
                    </div>
                  </div>
                  <span className="relative mt-1.5 grid size-3 shrink-0 place-items-center" aria-label={n.read ? undefined : "Unread"}>
                    {!n.read && (
                      <>
                        <span className="absolute size-2.5 rounded-full bg-primary animate-pulse-ring" />
                        <span className="size-2.5 rounded-full bg-primary shadow-glow" />
                      </>
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isSel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden lg:hidden"
                    >
                      <div className="px-4 pb-4">
                        <NoticeDetail notice={n} sector={sec} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        <div className="glass sticky top-[6.25rem] hidden p-5 lg:block">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <NoticeDetail notice={selected} sector={sectorOf(selected)} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState icon={MousePointerClick} title="Select a notification" body="Click any notice to read the full details. It will be marked as read." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

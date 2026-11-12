import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Download } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { SectorTile } from "@/components/khazna/SectorTile";
import { Amount, Chip, CountUp, GlassCard } from "@/components/khazna/primitives";
import { SECTOR_ICON, tileVar } from "@/components/khazna/sector-meta";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, formatINR, formatShortDate, timeAgo, TODAY } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "My Balance — Khazna Student Portal" },
      { name: "description", content: "Your combined balance across every Islahul Uloom sector, with recent transactions." },
      { property: "og:title", content: "My Balance — Khazna Student Portal" },
      { property: "og:description", content: "Your combined balance across every sector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const meId = useKhazna((s) => s.meStudentId);
  const me = useKhazna((s) => s.students.find((x) => x.id === s.meStudentId)!);
  const txs = useKhazna((s) => s.transactions);
  const sectors = useKhazna((s) => s.sectors);
  const notices = useKhazna((s) => s.notices);

  const d = useMemo(() => {
    const mine = txs.filter((t) => t.studentId === meId);
    const all = totals(mine);
    const per = sectors.map((s) => {
      const st = mine.filter((t) => t.sector === s.slug);
      const last = st.find((t) => !t.voided);
      return { sector: s, t: totals(st), last };
    });
    return { mine, all, per };
  }, [txs, meId, sectors]);

  const positiveTotal = d.per.reduce((a, p) => a + Math.max(0, p.t.balance), 0) || 1;
  const unread = notices.filter((n) => !n.read);
  const first = me.name.split(" ")[0];

  const statement = () => {
    downloadCSV(`khazna-${me.id}-statement-${TODAY}.csv`, [
      ["Date", "Sector", "Receipt", "Title", "Type", "Amount", "Status"],
      ...d.mine.map((t) => [t.date, sectors.find((s) => s.slug === t.sector)?.name ?? "", t.receiptNo, t.title, t.type, t.amount, t.voided ? "VOID" : "OK"]),
    ]);
    toast.success("Combined statement downloaded");
  };

  return (
    <div>
      <div className="mb-6">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{formatDate(TODAY)}</div>
        <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
          Assalamu Alaikum, <span className="text-gradient-primary">{first}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {me.className} · Ad.No <span className="num">{me.id}</span>
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 14, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="glass ring-gradient relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-info/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total combined balance</div>
            <div className={`mt-2 font-display text-5xl font-semibold md:text-6xl ${d.all.balance < 0 ? "text-debit" : "text-foreground"}`}>
              <CountUp value={d.all.balance} duration={1.8} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="credit" icon={ArrowDownLeft}>
                In {formatINR(d.all.credit)}
              </Chip>
              <Chip tone="debit" icon={ArrowUpRight}>
                Out {formatINR(d.all.debit)}
              </Chip>
              <Chip tone="neutral">{d.all.count} entries</Chip>
            </div>
          </div>
          <Btn variant="glass" onClick={statement}>
            <Download /> Combined statement
          </Btn>
        </div>
        <div className="relative mt-7">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-accent">
            {d.per.map((p, i) => (
              <motion.div
                key={p.sector.slug}
                style={tileVar(p.sector.color)}
                className="h-full bg-tile first:rounded-l-full last:rounded-r-full"
                initial={{ width: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                whileInView={{ width: `${(Math.max(0, p.t.balance) / positiveTotal) * 100}%` }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.8 }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {d.per.map((p) => (
              <span key={p.sector.slug} className="flex items-center gap-1.5" style={tileVar(p.sector.color)}>
                <span className="size-2 rounded-full bg-tile" /> {p.sector.name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My sectors</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {d.per.map((p, i) => (
          <Link key={p.sector.slug} to="/app/s/$sectorSlug" params={{ sectorSlug: p.sector.slug }} className="block">
            <SectorTile sector={p.sector} value={p.t.balance} delay={0.05 * i}>
              {p.last ? (
                <>
                  <div className="truncate text-foreground/90">{p.last.title}</div>
                  <div className="mt-0.5 flex justify-between">
                    <span>{formatShortDate(p.last.date)}</span>
                    <Amount value={p.last.amount} type={p.last.type} />
                  </div>
                </>
              ) : (
                "No activity yet"
              )}
            </SectorTile>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-2">
          <h3 className="font-semibold">Recent transactions</h3>
          <ul className="mt-3 divide-y divide-hairline">
            {d.mine.slice(0, 8).map((t, i) => {
              const s = sectors.find((x) => x.slug === t.sector)!;
              const Icon = SECTOR_ICON[t.sector];
              return (
                <motion.li key={t.id} {...reveal(i)} className="flex items-center gap-3 py-3">
                  <span className="tile-icon size-9 shrink-0" style={tileVar(s.color)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${t.voided ? "text-muted-foreground line-through" : "text-foreground"}`}>{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.name} · {formatDate(t.date)} · <span className="font-mono">{t.receiptNo}</span>
                    </div>
                  </div>
                  {t.voided ? <Chip>Void</Chip> : <Amount value={t.amount} type={t.type} className="font-medium" />}
                </motion.li>
              );
            })}
          </ul>
        </GlassCard>
        <GlassCard className="p-5" transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unread.length > 0 && <Chip tone="primary">{unread.length} new</Chip>}
          </div>
          <ul className="mt-3 space-y-2">
            {notices.slice(0, 4).map((n) => (
              <li key={n.id} className="glass-inset flex gap-3 p-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-hairline" : "bg-primary shadow-glow"}`} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-foreground">{n.title}</div>
                  <div className="text-xs text-subtle">{timeAgo(n.at)}</div>
                </div>
              </li>
            ))}
          </ul>
          <Btn asChild variant="ghost" size="sm" className="mt-3 w-full">
            <Link to="/app/notifications">
              <Bell /> All notifications <ArrowRight />
            </Link>
          </Btn>
        </GlassCard>
      </div>
    </div>
  );
}

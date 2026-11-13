import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, HandCoins, ListChecks, Plus, ReceiptText, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Btn } from "@/components/khazna/btn";
import { NewEntryDialog, type EntryPreset } from "@/components/khazna/NewEntryDialog";
import { Amount, Avatar, CountUp, EmptyState, GlassCard, StatCard } from "@/components/khazna/primitives";
import { sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { asSector } from "@/lib/khazna/data";
import { formatCompactINR, formatINR, formatShortDate } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { dailySeries, inLastDays, pendingDues, studentSectorBalances } from "@/lib/khazna/selectors";
import { managerNameIn, useKhazna } from "@/lib/khazna/store";

export const Route = createFileRoute("/m/$sectorSlug/")({
  head: () => ({
    meta: [
      { title: "Sector Overview — Khazna" },
      { name: "description", content: "Sector balance, 30-day collections, top debits and pending dues for an Islahul Uloom sector." },
      { property: "og:title", content: "Sector Overview — Khazna" },
      { property: "og:description", content: "Sector balance, collections and pending dues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SectorOverview,
});

function SectorOverview() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const managerName = useKhazna((s) => managerNameIn(s, slug));
  const txs = useKhazna((s) => s.transactions);
  const students = useKhazna((s) => s.students);
  const [entryOpen, setEntryOpen] = useState(false);
  const [preset, setPreset] = useState<EntryPreset | undefined>(undefined);
  const Icon = sectorIcon(slug);

  const d = useMemo(() => {
    const all = totals(txs, { sector: slug });
    const recent = txs.filter((t) => t.sector === slug && inLastDays(t, 30));
    const r = totals(recent);
    const series = dailySeries(txs, 30, slug);
    const debitByTitle = new Map<string, { amount: number; count: number }>();
    txs.forEach((t) => {
      if (t.sector !== slug || t.voided || t.type !== "debit" || !inLastDays(t, 120)) return;
      const cur = debitByTitle.get(t.title) ?? { amount: 0, count: 0 };
      cur.amount += t.amount;
      cur.count++;
      debitByTitle.set(t.title, cur);
    });
    const topDebits = [...debitByTitle.entries()].sort((a, b) => b[1].amount - a[1].amount).slice(0, 5);
    const bal = studentSectorBalances(txs, slug);
    const dues = [...bal.entries()]
      .filter(([, v]) => v.balance < 0)
      .sort((a, b) => a[1].balance - b[1].balance)
      .map(([id, v]) => ({ student: students.find((s) => s.id === id)!, ...v }))
      .filter((x) => x.student);
    return { all, r, series, topDebits, dues, pending: pendingDues(txs, slug), active: bal.size };
  }, [txs, slug, students]);

  const maxDebit = d.topDebits[0]?.[1].amount ?? 1;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tile-glossy mb-6 p-6 md:p-8" style={tileVar(sector.color)}>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <span className="tile-icon size-14">
              <Icon className="size-6" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-tile">Sector overview</div>
              <h1 className="mt-1 text-3xl font-semibold text-foreground">{sector.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sector.description} · Managed by {managerName}
              </p>
            </div>
          </div>
          <div className="md:text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Sector balance</div>
            <div className="font-display text-4xl font-semibold text-foreground">
              <CountUp value={d.all.balance} />
            </div>
            <div className="mt-3 flex gap-2 md:justify-end">
              <Btn asChild variant="glass" size="sm">
                <Link to="/m/$sectorSlug/bulk" params={{ sectorSlug: slug }}>
                  <ListChecks /> Bulk entry
                </Link>
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => {
                  setPreset(undefined);
                  setEntryOpen(true);
                }}
              >
                <Plus /> New entry
              </Btn>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Quick Action Squircles (inspired by responsive in mobile design) */}
      <div className="mb-5 grid grid-cols-4 gap-2.5 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setPreset(undefined);
            setEntryOpen(true);
          }}
          className="group flex flex-col items-center gap-1.5 text-center outline-none"
        >
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-12 place-items-center rounded-2xl border border-orange-500/30 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-rose-500/10 text-orange-600 shadow-sm backdrop-blur-md dark:text-orange-400"
          >
            <Plus className="size-5" />
          </motion.div>
          <span className="text-[11px] font-medium text-foreground">New Entry</span>
        </button>
        <Link to="/m/$sectorSlug/bulk" params={{ sectorSlug: slug }} className="group flex flex-col items-center gap-1.5 text-center">
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-12 place-items-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-emerald-500/10 text-cyan-600 shadow-sm backdrop-blur-md dark:text-cyan-400"
          >
            <ListChecks className="size-5" />
          </motion.div>
          <span className="text-[11px] font-medium text-foreground">Bulk Post</span>
        </Link>
        <Link to="/m/$sectorSlug/reports" params={{ sectorSlug: slug }} className="group flex flex-col items-center gap-1.5 text-center">
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-12 place-items-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-indigo-500/20 to-violet-500/10 text-purple-600 shadow-sm backdrop-blur-md dark:text-purple-400"
          >
            <BarChart3 className="size-5" />
          </motion.div>
          <span className="text-[11px] font-medium text-foreground">Reports</span>
        </Link>
        <Link to="/m/$sectorSlug/ledger" params={{ sectorSlug: slug }} className="group flex flex-col items-center gap-1.5 text-center">
          <motion.div
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.9 }}
            className="grid size-12 place-items-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-green-500/10 text-emerald-600 shadow-sm backdrop-blur-md dark:text-emerald-400"
          >
            <ReceiptText className="size-5" />
          </motion.div>
          <span className="text-[11px] font-medium text-foreground">Ledger</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 w-full">
        <StatCard label="Collected · 30d" icon={ArrowDownLeft} tone="credit" value={<CountUp value={d.r.credit} />} hint={`${d.r.count} entries this month`} />
        <StatCard label="Debited · 30d" icon={ArrowUpRight} tone="debit" delay={0.05} value={<CountUp value={d.r.debit} />} hint="Fees & charges posted" />
        <StatCard label="Active ledgers" icon={Users} tone="info" delay={0.1} value={<CountUp value={d.active} format={(n) => String(Math.round(n))} />} hint="Students with entries" />
        <StatCard label="Pending dues" icon={AlertTriangle} tone="primary" delay={0.15} value={<CountUp value={d.pending.amount} />} hint={`${d.pending.count} students below zero`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3 w-full">
        <GlassCard className="p-4 sm:p-5 xl:col-span-2 w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">Last 30 days</h3>
              <p className="text-xs text-muted-foreground">Daily credits collected vs debits posted</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-credit" /> Credits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-debit" /> Debits
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.series} margin={{ left: -10, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="gCredit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--credit)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--credit)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDebit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--debit)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--debit)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--hairline)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => formatShortDate(v)} tick={{ fill: "var(--subtle)", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={(v: number) => formatCompactINR(v).replace("₹", "")} tick={{ fill: "var(--subtle)", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ stroke: "var(--input)", strokeDasharray: "4 4" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="glass-strong rounded-xl px-3 py-2 text-xs">
                        <div className="mb-1 text-muted-foreground">{formatShortDate(String(label))}</div>
                        <div className="text-credit num">+{formatINR(Number(payload[0]?.value ?? 0))}</div>
                        <div className="text-debit num">−{formatINR(Number(payload[1]?.value ?? 0))}</div>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="credit" stroke="var(--credit)" strokeWidth={2.5} fill="url(#gCredit)" animationDuration={1600} animationEasing="ease-out" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }} />
                <Area type="monotone" dataKey="debit" stroke="var(--debit)" strokeWidth={2.5} fill="url(#gDebit)" animationDuration={1600} animationBegin={250} animationEasing="ease-out" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--background)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 w-full" transition={{ delay: 0.1 }}>
          <h3 className="font-semibold">Top debit titles</h3>
          <p className="text-xs text-muted-foreground">Last 120 days</p>
          <div className="mt-5 space-y-4">
            {d.topDebits.map(([title, v], i) => (
              <div key={title}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-foreground">{title}</span>
                  <span className="shrink-0 text-debit num">{formatINR(v.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-accent" style={tileVar(sector.color)}>
                  <motion.div className="h-full rounded-full bg-tile" initial={{ width: 0 }} viewport={{ once: true, margin: "-30px" }} whileInView={{ width: `${(v.amount / maxDebit) * 100}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8 }} />
                </div>
                <div className="mt-1 text-[11px] text-subtle num">{v.count} entries</div>
              </div>
            ))}
            {d.topDebits.length === 0 && <div className="text-sm text-subtle">No debits yet</div>}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-4 p-4 sm:p-5 w-full" transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Pending dues</h3>
            <p className="text-xs text-muted-foreground">Students whose {sector.name} balance is below zero</p>
          </div>
          <Link to="/m/$sectorSlug/ledger" params={{ sectorSlug: slug }} className="text-xs text-primary hover:underline">
            Open ledger →
          </Link>
        </div>
        {d.dues.length === 0 ? (
          <EmptyState icon={Wallet} title="No pending dues" body="Every student in this sector has a zero or positive balance." />
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 w-full">
            {d.dues.slice(0, 8).map((x) => (
              <li key={x.student.id} className="glass-inset flex items-center gap-3 p-3">
                <Avatar name={x.student.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{x.student.name}</div>
                  <div className="text-xs text-muted-foreground num">
                    {x.student.id} · {x.student.className}
                  </div>
                </div>
                <Amount value={x.balance} className="font-semibold" />
                <Btn
                  variant="credit"
                  size="sm"
                  onClick={() => {
                    setPreset({ studentId: x.student.id, type: "credit", amount: -x.balance, title: "Cash Deposit" });
                    setEntryOpen(true);
                  }}
                >
                  <HandCoins /> <span className="hidden sm:inline">Collect</span>
                </Btn>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <NewEntryDialog open={entryOpen} onOpenChange={setEntryOpen} sector={slug} preset={preset} />
    </div>
  );
}

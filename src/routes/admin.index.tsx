import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ScrollText, Upload, Users, Wallet } from "lucide-react";
import { AUDIT_ICON } from "@/components/khazna/audit-meta";
import { useMemo } from "react";
import { Btn } from "@/components/khazna/btn";
import { SectorTile } from "@/components/khazna/SectorTile";
import { Avatar, Chip, CountUp, GlassCard, PageHeader, ProgressRing, StatCard } from "@/components/khazna/primitives";
import { tileVar } from "@/components/khazna/sector-meta";
import { formatCompactINR, formatINR, timeAgo } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { inLastDays, pendingDues } from "@/lib/khazna/selectors";
import { useKhazna } from "@/lib/khazna/store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Khazna" },
      { name: "description", content: "College-wide balances, collections and sector activity for Islahul Uloom." },
      { property: "og:title", content: "Admin Dashboard — Khazna" },
      { property: "og:description", content: "College-wide balances, collections and sector activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});


function AdminDashboard() {
  const txs = useKhazna((s) => s.transactions);
  const sectors = useKhazna((s) => s.sectors);
  const students = useKhazna((s) => s.students);
  const audit = useKhazna((s) => s.audit);

  const stats = useMemo(() => {
    const all = totals(txs);
    const month = txs.filter((t) => inLastDays(t, 30));
    const m = totals(month);
    const dues = pendingDues(txs);
    const target = sectors.reduce((a, s) => a + s.target, 0);
    const perSector = sectors.map((s) => ({ sector: s, t: totals(txs, { sector: s.slug }), active: new Set(txs.filter((x) => x.sector === s.slug).map((x) => x.studentId)).size }));
    return { all, m, dues, target, perSector, monthCount: month.length };
  }, [txs, sectors]);

  const progress = stats.all.credit / stats.target;

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin · Dashboard"
        title={
          <>
            Assalamu Alaikum, <span className="text-gradient-primary">Abdulla</span>
          </>
        }
        description="Here's how money is moving across every sector of Islahul Uloom this term."
        actions={
          <>
            <Btn asChild variant="glass">
              <Link to="/admin/audit">
                <ScrollText /> Audit log
              </Link>
            </Btn>
            <Btn asChild variant="primary">
              <Link to="/admin/students/import">
                <Upload /> Import students
              </Link>
            </Btn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance held" icon={Wallet} value={<CountUp value={stats.all.balance} />} hint={<>Across {sectors.length} sectors</>} />
        <StatCard
          label="Collected · 30 days"
          icon={ArrowDownLeft}
          tone="credit"
          delay={0.05}
          value={<CountUp value={stats.m.credit} />}
          hint={<span className="num">{stats.monthCount} entries posted</span>}
        />
        <StatCard label="Students" icon={Users} tone="info" delay={0.1} value={<CountUp value={students.length} format={(n) => Math.round(n).toString()} />} hint="Active across 8 classes" />
        <StatCard
          label="Pending dues"
          icon={AlertTriangle}
          tone="debit"
          delay={0.15}
          value={<CountUp value={stats.dues.amount} />}
          hint={<span className="num">{stats.dues.count} student ledgers in the red</span>}
        />
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sectors</h2>
        <Link to="/admin/sectors" className="text-xs text-primary hover:underline">
          Manage sectors →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {stats.perSector.map(({ sector, t, active }, i) => (
          <Link key={sector.slug} to="/m/$sectorSlug" params={{ sectorSlug: sector.slug }} className="block">
            <SectorTile sector={sector} value={t.balance} delay={0.05 * i}>
              <div className="flex justify-between num">
                <span className="text-credit">+{formatCompactINR(t.credit)}</span>
                <span className="text-debit">−{formatCompactINR(t.debit)}</span>
              </div>
              <div className="mt-1.5">{active} students · {t.count} entries</div>
            </SectorTile>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Term collection</h3>
            <Chip tone="info">Term 2</Chip>
          </div>
          <div className="mt-6 flex justify-center">
            <ProgressRing value={progress} size={176} stroke={14}>
              <div>
                <div className="font-display text-3xl font-semibold text-foreground num">{Math.round(progress * 100)}%</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">of target</div>
              </div>
            </ProgressRing>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="glass-inset p-3">
              <div className="text-[11px] text-muted-foreground">Collected</div>
              <div className="font-semibold text-credit num">{formatCompactINR(stats.all.credit)}</div>
            </div>
            <div className="glass-inset p-3">
              <div className="text-[11px] text-muted-foreground">Target</div>
              <div className="font-semibold text-foreground num">{formatCompactINR(stats.target)}</div>
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            {stats.perSector.map(({ sector, t }) => {
              const p = Math.min(1, t.credit / sector.target);
              return (
                <div key={sector.slug} style={tileVar(sector.color)}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{sector.name}</span>
                    <span className="text-foreground num">{Math.round(p * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                    <motion.div className="h-full rounded-full bg-tile" initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6 lg:col-span-2" transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent activity</h3>
            <Link to="/admin/audit" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-hairline">
            {audit.slice(0, 8).map((a, i) => {
              const Icon = AUDIT_ICON[a.action];
              const tone = a.action.startsWith("VOID") ? "text-debit bg-debit/12" : a.action === "BULK_POST" || a.action === "CREATE_ENTRY" ? "text-credit bg-credit/12" : "text-info bg-info/12";
              return (
                <motion.li key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.04 }} className="flex items-center gap-3 py-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">
                      <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">· {a.action.replace(/_/g, " ").toLowerCase()} ·</span> {a.target}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{a.details}</div>
                  </div>
                  <span className="hidden shrink-0 text-xs text-subtle sm:block">{timeAgo(a.at)}</span>
                </motion.li>
              );
            })}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="mt-4 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center" transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-3">
          <Avatar name="Mujeeb Baqavi" />
          <div>
            <div className="text-sm font-medium text-foreground">Mujeeb Baqavi hasn't accepted his invite yet</div>
            <div className="text-xs text-muted-foreground">Invited to manage Office and Velitcham Welfare · {formatINR(0)} handled so far</div>
          </div>
        </div>
        <Btn asChild variant="soft" size="sm">
          <Link to="/admin/admins">
            Review admins <ArrowUpRight />
          </Link>
        </Btn>
      </GlassCard>
    </div>
  );
}

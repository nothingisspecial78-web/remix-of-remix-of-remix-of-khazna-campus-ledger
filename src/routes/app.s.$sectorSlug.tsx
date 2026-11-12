import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Download, Hash, ReceiptText } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Amount, Chip, CountUp, EmptyState, StatCard, TableShell } from "@/components/khazna/primitives";
import { sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { asSector } from "@/lib/khazna/data";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, TODAY } from "@/lib/khazna/format";
import { totals, withRunningBalance } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/app/s/$sectorSlug")({
  beforeLoad: ({ params }) => {
    if (!useKhazna.getState().sectors.some((s) => s.slug === params.sectorSlug)) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "My Sector Ledger — Khazna Student Portal" },
      { name: "description", content: "Every credit and debit in one Islahul Uloom sector with a running balance and downloadable statement." },
      { property: "og:title", content: "My Sector Ledger — Khazna Student Portal" },
      { property: "og:description", content: "Sector transactions with running balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentSectorLedger,
});

function StudentSectorLedger() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const meId = useKhazna((s) => s.meStudentId);
  const txs = useKhazna((s) => s.transactions);
  const Icon = sectorIcon(slug);

  const { rows, t } = useMemo(() => {
    const mine = txs.filter((x) => x.studentId === meId && x.sector === slug);
    return { rows: withRunningBalance(mine).reverse(), t: totals(mine) };
  }, [txs, meId, slug]);

  const download = () => {
    downloadCSV(`khazna-${meId}-${slug}-statement-${TODAY}.csv`, [
      ["Date", "Receipt", "Title", "Credit", "Debit", "Balance", "Status"],
      ...[...rows].reverse().map((r) => [r.date, r.receiptNo, r.title, r.type === "credit" ? r.amount : "", r.type === "debit" ? r.amount : "", r.running, r.voided ? "VOID" : "OK"]),
    ]);
    toast.success(`${sector.name} statement downloaded`);
  };

  return (
    <div>
      <Link to="/app" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> Overview
      </Link>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tile-glossy mb-6 p-6 md:p-8" style={tileVar(sector.color)}>
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <span className="tile-icon size-14">
              <Icon className="size-6" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-tile">My ledger</div>
              <h1 className="mt-1 text-3xl font-semibold">{sector.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{sector.description}</p>
            </div>
          </div>
          <div className="md:text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current balance</div>
            <div className={cn("font-display text-4xl font-semibold", t.balance < 0 ? "text-debit" : "text-foreground")}>
              <CountUp value={t.balance} />
            </div>
            <Btn variant="glass" size="sm" className="mt-3" onClick={download}>
              <Download /> Download statement
            </Btn>
          </div>
        </div>
      </motion.div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total credits" icon={ArrowDownLeft} tone="credit" value={<CountUp value={t.credit} />} />
        <StatCard label="Total debits" icon={ArrowUpRight} tone="debit" delay={0.05} value={<CountUp value={t.debit} />} />
        <StatCard label="Entries" icon={Hash} tone="info" delay={0.1} value={<CountUp value={t.count} format={(n) => String(Math.round(n))} />} />
      </div>

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No transactions yet" body="Entries posted by the sector will appear here." />
        ) : (
          <>
            {/* Mobile Aesthetic Transaction Cards (No horizontal side-scrolling) */}
            <div className="divide-y divide-hairline md:hidden">
              {rows.map((r, i) => (
                <motion.div
                  key={r.id}
                  {...reveal(0, 0, r.voided ? 0.55 : 1)}
                  className="p-3.5 space-y-2 transition-colors active:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium text-foreground truncate", r.voided && "line-through")}>
                        {r.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground num pt-0.5">
                        <span className="font-mono text-primary font-medium">{r.receiptNo}</span>
                        <span>•</span>
                        <span>{formatDate(r.date)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-sm font-semibold", r.voided && "line-through", r.type === "credit" ? "text-credit" : "text-debit")}>
                        {r.type === "credit" ? "+" : "−"}<Amount value={r.amount} />
                      </div>
                      <div className="text-[10px] text-muted-foreground num">
                        Bal: <Amount value={r.running} />
                      </div>
                    </div>
                  </div>
                  {r.voided ? (
                    <div className="text-xs text-debit bg-debit/10 rounded-lg p-2">
                      Voided · {r.voided.reason}
                    </div>
                  ) : r.reason ? (
                    <div className="text-xs text-muted-foreground">
                      {r.reason}
                    </div>
                  ) : null}
                </motion.div>
              ))}
            </div>

            {/* Desktop Tabular Model */}
            <div className="hidden md:block overflow-x-auto">
              <table className="k-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Receipt</th>
                    <th>Description</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Running balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <motion.tr {...reveal(0, 0, r.voided ? 0.55 : 1)} key={r.id}>
                      <td className="num text-muted-foreground">{formatDate(r.date)}</td>
                      <td className="font-mono text-xs text-muted-foreground">{r.receiptNo}</td>
                      <td>
                        <div className={cn("text-foreground", r.voided && "line-through")}>{r.title}</div>
                        {r.voided ? <div className="text-xs text-debit">Voided · {r.voided.reason}</div> : r.reason ? <div className="text-xs text-subtle">{r.reason}</div> : null}
                      </td>
                      <td className={cn("text-right text-credit num", r.voided && "line-through")}>{r.type === "credit" ? <Amount value={r.amount} /> : <span className="text-subtle">—</span>}</td>
                      <td className={cn("text-right text-debit num", r.voided && "line-through")}>{r.type === "debit" ? <Amount value={r.amount} /> : <span className="text-subtle">—</span>}</td>
                      <td className="text-right font-semibold">
                        {r.voided ? <Chip>Void</Chip> : <Amount value={r.running} />}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </TableShell>
    </div>
  );
}

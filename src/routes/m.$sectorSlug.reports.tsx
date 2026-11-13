import { motion } from "framer-motion";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileSpreadsheet, FileText, Loader2, Printer, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Amount, Avatar, EmptyState, Field, GlassCard, PageHeader, TableShell } from "@/components/khazna/primitives";
import { addDays, formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { asSector } from "@/lib/khazna/data";
import { downloadCSV } from "@/lib/khazna/download";
import { useKhazna } from "@/lib/khazna/store";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/m/$sectorSlug/reports")({
  head: () => ({
    meta: [
      { title: "Class-wise Reports — Khazna" },
      { name: "description", content: "Class-wise credit, debit and balance reports for an Islahul Uloom sector with PDF, Excel and CSV export." },
      { property: "og:title", content: "Class-wise Reports — Khazna" },
      { property: "og:description", content: "Class-wise sector reports with export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const students = useKhazna((s) => s.students);
  const txs = useKhazna((s) => s.transactions);
  const classes = useKhazna((s) => s.classes);
  const log = useKhazna((s) => s.log);
  const [cls, setCls] = useState("Fiqh 2");
  const [from, setFrom] = useState(addDays(TODAY, -120));
  const [to, setTo] = useState(TODAY);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = students.filter((s) => cls === "all" || s.className === cls);
    return list
      .map((s) => {
        let credit = 0;
        let debit = 0;
        for (const t of txs) {
          if (t.voided || t.sector !== slug || t.studentId !== s.id || t.date < from || t.date > to) continue;
          if (t.type === "credit") credit += t.amount;
          else debit += t.amount;
        }
        return { s, credit, debit, balance: credit - debit };
      })
      .sort((a, b) => a.s.name.localeCompare(b.s.name));
  }, [students, txs, slug, cls, from, to]);

  const sum = rows.reduce((a, r) => ({ credit: a.credit + r.credit, debit: a.debit + r.debit, balance: a.balance + r.balance }), { credit: 0, debit: 0, balance: 0 });
  const label = cls === "all" ? "All classes" : cls;

  const mockExport = (kind: string) => {
    setBusy(kind);
    setTimeout(() => {
      setBusy(null);
      log({ actor: sector.name, role: "manager", action: "EXPORT", target: `${label} report`, details: `Class-wise report exported as ${kind}`, sector: slug });
      toast.success(`${kind} ready`, { description: `${sector.name} · ${label} · ${rows.length} students` });
    }, 900);
  };

  const csv = () => {
    downloadCSV(`${slug}-${label.replace(/\s/g, "-").toLowerCase()}-report.csv`, [
      ["Student", "Ad.No", "Class", "Total Credit", "Total Debit", "Balance"],
      ...rows.map((r) => [r.s.name, r.s.id, r.s.className, r.credit, r.debit, r.balance]),
      ["TOTAL", "", "", sum.credit, sum.debit, sum.balance],
    ]);
    toast.success("CSV downloaded");
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${sector.name} · Reports`}
        title="Class-wise report"
        description={`${label} · ${formatDate(from)} – ${formatDate(to)}`}
        actions={
          <>
            <Btn variant="glass" onClick={() => mockExport("PDF")} disabled={!!busy}>
              {busy === "PDF" ? <Loader2 className="animate-spin" /> : <FileText />} PDF
            </Btn>
            <Btn variant="glass" onClick={() => mockExport("Excel")} disabled={!!busy}>
              {busy === "Excel" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
            </Btn>
            <Btn variant="glass" onClick={csv}>
              <FileDown /> CSV
            </Btn>
            <Btn variant="soft" onClick={() => window.print()}>
              <Printer /> Print
            </Btn>
          </>
        }
      />

      <GlassCard className="no-print mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 w-full">
        <Field label="Class">
          <select className="k-input" value={cls} onChange={(e) => setCls(e.target.value)}>
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" className="k-input num" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className="k-input num" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </GlassCard>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3 w-full">
        <motion.div {...reveal()} className="glass p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total credit</div>
          <div className="font-display text-xl font-semibold text-credit num">{formatINR(sum.credit)}</div>
        </motion.div>
        <motion.div {...reveal(1)} className="glass p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total debit</div>
          <div className="font-display text-xl font-semibold text-debit num">{formatINR(sum.debit)}</div>
        </motion.div>
        <motion.div {...reveal(2)} className="glass p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Net balance</div>
          <div className="font-display text-xl font-semibold">
            <Amount value={sum.balance} />
          </div>
        </motion.div>
      </div>

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState icon={Table2} title="No students in this class" />
        ) : (
          <>
            {/* Mobile Aesthetic Report Card Model (No horizontal side-scrolling) */}
            <div className="divide-y divide-hairline md:hidden">
              {rows.map((r, i) => (
                <motion.div key={r.s.id} {...reveal(i)} className="p-3.5 space-y-2.5 transition-colors active:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={r.s.name} size={34} />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-sm truncate">{r.s.name}</div>
                        <div className="text-xs text-muted-foreground num">{r.s.id} · {r.s.className}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Balance</div>
                      <div className="font-semibold text-sm">
                        <Amount value={r.balance} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-hairline/40">
                    <div className="rounded-lg bg-credit/10 p-2 border border-credit/20">
                      <div className="text-[10px] text-credit font-medium uppercase tracking-wider">Credit</div>
                      <div className="font-semibold text-credit num text-xs">+{formatINR(r.credit)}</div>
                    </div>
                    <div className="rounded-lg bg-debit/10 p-2 border border-debit/20">
                      <div className="text-[10px] text-debit font-medium uppercase tracking-wider">Debit</div>
                      <div className="font-semibold text-debit num text-xs">−{formatINR(r.debit)}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="p-4 bg-accent/40 rounded-b-xl border-t border-hairline space-y-1.5">
                <div className="flex justify-between items-center text-sm font-semibold text-foreground">
                  <span>Totals ({rows.length} students)</span>
                  <Amount value={sum.balance} />
                </div>
                <div className="flex justify-between text-xs num pt-1">
                  <span className="text-credit font-medium">Credits: +{formatINR(sum.credit)}</span>
                  <span className="text-debit font-medium">Debits: −{formatINR(sum.debit)}</span>
                </div>
              </div>
            </div>

            {/* Desktop Tabular Model */}
            <div className="hidden md:block overflow-x-auto">
              <table className="k-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Ad.No</th>
                    <th>Class</th>
                    <th className="text-right">Total credit</th>
                    <th className="text-right">Total debit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <motion.tr {...reveal()} key={r.s.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.s.name} size={28} />
                          <span className="text-foreground">{r.s.name}</span>
                        </div>
                      </td>
                      <td className="num text-muted-foreground">{r.s.id}</td>
                      <td className="text-muted-foreground">{r.s.className}</td>
                      <td className="text-right text-credit num">{formatINR(r.credit)}</td>
                      <td className="text-right text-debit num">{formatINR(r.debit)}</td>
                      <td className="text-right font-semibold">
                        <Amount value={r.balance} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <motion.tr {...reveal()} className="bg-accent">
                    <td colSpan={3} className="px-4 py-3 font-semibold text-foreground">
                      Totals · {rows.length} students
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-credit num">{formatINR(sum.credit)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-debit num">{formatINR(sum.debit)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <Amount value={sum.balance} />
                    </td>
                  </motion.tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </TableShell>
    </div>
  );
}

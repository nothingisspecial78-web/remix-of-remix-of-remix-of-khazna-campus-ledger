import { motion } from "framer-motion";
import { createFileRoute } from "@tanstack/react-router";
import { FileDown, FileSpreadsheet, FileText, Loader2, Printer, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Amount, Avatar, EmptyState, Field, GlassCard, PageHeader, TableShell } from "@/components/khazna/primitives";
import { addDays, formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { asSector } from "@/lib/khazna/data";
import { downloadCSVReport, downloadExcelReport } from "@/lib/khazna/export";
import { ExportPdfModal } from "@/components/khazna/ExportPdfModal";
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
  const college = useKhazna((s) => s.college);
  const log = useKhazna((s) => s.log);
  const [cls, setCls] = useState("Fiqh 2");
  const [from, setFrom] = useState(addDays(TODAY, -120));
  const [to, setTo] = useState(TODAY);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Compute student rows for current filter
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

  // Compute all students (unfiltered by class) for the PDF modal's full class selector
  const allClassRows = useMemo(() => {
    return students.map((s) => {
      let credit = 0;
      let debit = 0;
      for (const t of txs) {
        if (t.voided || t.sector !== slug || t.studentId !== s.id || t.date < from || t.date > to) continue;
        if (t.type === "credit") credit += t.amount;
        else debit += t.amount;
      }
      return {
        studentId: s.id,
        studentName: s.name,
        className: s.className,
        credit,
        debit,
        balance: credit - debit,
      };
    });
  }, [students, txs, slug, from, to]);

  const sum = rows.reduce((a, r) => ({ credit: a.credit + r.credit, debit: a.debit + r.debit, balance: a.balance + r.balance }), { credit: 0, debit: 0, balance: 0 });
  const label = cls === "all" ? "All classes" : cls;

  // Real Excel (.xlsx) Export
  const exportExcel = () => {
    if (rows.length === 0) {
      toast.error("No student records to export in the current filter");
      return;
    }
    setBusy("Excel");
    try {
      const cleanClass = label.replace(/\s+/g, "");
      const filename = `Khazna_${sector.name.replace(/\s+/g, "")}_${cleanClass}_Report_${from}_${to}.xlsx`;
      downloadExcelReport({
        filename,
        collegeName: college.name,
        sectorName: sector.name,
        className: label,
        dateRangeStr: `${formatDate(from)} – ${formatDate(to)}`,
        rows: rows.map((r) => ({
          studentName: r.s.name,
          studentId: r.s.id,
          className: r.s.className,
          credit: r.credit,
          debit: r.debit,
          balance: r.balance,
        })),
        totals: sum,
      });
      log({
        actor: sector.name,
        role: "manager",
        action: "EXPORT",
        target: `${label} Excel`,
        details: `Class-wise report exported as Excel (.xlsx)`,
        sector: slug,
      });
      toast.success("Excel (.xlsx) downloaded", { description: `${rows.length} students exported` });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate Excel file");
    } finally {
      setBusy(null);
    }
  };

  // Real CSV Export with UTF-8 BOM
  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("No student records to export in the current filter");
      return;
    }
    setBusy("CSV");
    try {
      const cleanClass = label.replace(/\s+/g, "");
      const filename = `Khazna_${sector.name.replace(/\s+/g, "")}_${cleanClass}_Report_${from}_${to}.csv`;
      downloadCSVReport({
        filename,
        collegeName: college.name,
        sectorName: sector.name,
        className: label,
        dateRangeStr: `${formatDate(from)} – ${formatDate(to)}`,
        rows: rows.map((r) => ({
          studentName: r.s.name,
          studentId: r.s.id,
          className: r.s.className,
          credit: r.credit,
          debit: r.debit,
          balance: r.balance,
        })),
        totals: sum,
      });
      log({
        actor: sector.name,
        role: "manager",
        action: "EXPORT",
        target: `${label} CSV`,
        details: `Class-wise report exported as CSV with UTF-8 BOM`,
        sector: slug,
      });
      toast.success("CSV file downloaded", { description: "UTF-8 BOM included for Excel compatibility" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate CSV file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={`${sector.name} · Reports`}
        title="Class-wise report"
        description={`${label} · ${formatDate(from)} – ${formatDate(to)}`}
        actions={
          <>
            <Btn variant="glass" onClick={() => setPdfModalOpen(true)}>
              <FileText /> PDF
            </Btn>
            <Btn variant="glass" onClick={exportExcel} disabled={busy === "Excel"}>
              {busy === "Excel" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} Excel
            </Btn>
            <Btn variant="glass" onClick={exportCsv} disabled={busy === "CSV"}>
              {busy === "CSV" ? <Loader2 className="animate-spin" /> : <FileDown />} CSV
            </Btn>
            <Btn variant="soft" onClick={() => window.print()}>
              <Printer /> Print
            </Btn>
          </>
        }
      />

      <ExportPdfModal
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        collegeName={college.name}
        sectorName={sector.name}
        classes={classes}
        initialClass={cls}
        initialFrom={from}
        initialTo={to}
        allItems={allClassRows}
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

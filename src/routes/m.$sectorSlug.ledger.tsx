import { motion } from "framer-motion";
import { createFileRoute } from "@tanstack/react-router";
import { Ban, Download, Layers, Plus, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { NewEntryDialog } from "@/components/khazna/NewEntryDialog";
import { Amount, Avatar, Chip, EmptyState, PageHeader, Pager, SearchInput, Segmented, TableShell } from "@/components/khazna/primitives";
import { VoidDialog } from "@/components/khazna/VoidDialog";
import { asSector } from "@/lib/khazna/data";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import type { Tx } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/m/$sectorSlug/ledger")({
  head: () => ({
    meta: [
      { title: "Sector Ledger — Khazna" },
      { name: "description", content: "Filter, post and void credit and debit entries in an Islahul Uloom sector ledger." },
      { property: "og:title", content: "Sector Ledger — Khazna" },
      { property: "og:description", content: "Filter, post and void sector ledger entries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

type TypeFilter = "all" | "credit" | "debit" | "void";
const PER_PAGE = 15;

function LedgerPage() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const txs = useKhazna((s) => s.transactions);
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const voidEntry = useKhazna((s) => s.voidEntry);
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [cls, setCls] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [entryOpen, setEntryOpen] = useState(false);
  const [voiding, setVoiding] = useState<Tx | null>(null);

  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return txs.filter((t) => {
      if (t.sector !== slug) return false;
      if (type === "void" ? !t.voided : type !== "all" && (t.type !== type || t.voided)) return false;
      const st = byId.get(t.studentId);
      if (cls !== "all" && st?.className !== cls) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (term && !`${st?.name} ${t.studentId} ${t.title} ${t.receiptNo}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [txs, slug, type, cls, from, to, q, byId]);

  const sum = totals(filtered);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const reset = () => setPage(1);

  return (
    <div>
      <PageHeader
        eyebrow={`${sector.name} · Ledger`}
        title="Transactions"
        description="Entries are permanent. Mistakes are corrected by voiding with a reason."
        actions={
          <>
            <Btn
              variant="glass"
              onClick={() => {
                downloadCSV(`${slug}-ledger-${TODAY}.csv`, [
                  ["Date", "Receipt", "Ad.No", "Student", "Title", "Type", "Amount", "Status"],
                  ...filtered.map((t) => [t.date, t.receiptNo, t.studentId, byId.get(t.studentId)?.name ?? "", t.title, t.type, t.amount, t.voided ? "VOID" : "OK"]),
                ]);
                toast.success(`Exported ${filtered.length} entries`);
              }}
            >
              <Download /> Export
            </Btn>
            <Btn variant="primary" onClick={() => setEntryOpen(true)}>
              <Plus /> New entry
            </Btn>
          </>
        }
      />

      <motion.div {...reveal()} className="glass mb-4 space-y-3 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); reset(); }} placeholder="Student, Ad.No, title or receipt…" className="lg:flex-1" />
          <Segmented
            value={type}
            onChange={(v) => { setType(v); reset(); }}
            options={[
              { value: "all", label: "All" },
              { value: "credit", label: "Credit" },
              { value: "debit", label: "Debit" },
              { value: "void", label: "Voided" },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="k-input" value={cls} onChange={(e) => { setCls(e.target.value); reset(); }}>
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input type="date" className="k-input num" value={from} max={to || TODAY} onChange={(e) => { setFrom(e.target.value); reset(); }} aria-label="From date" />
          <input type="date" className="k-input num" value={to} min={from} max={TODAY} onChange={(e) => { setTo(e.target.value); reset(); }} aria-label="To date" />
        </div>
      </motion.div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <motion.div {...reveal()} className="glass p-3 md:p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Credits</div>
          <div className="font-semibold text-credit num md:text-lg">{formatINR(sum.credit)}</div>
        </motion.div>
        <motion.div {...reveal(1)} className="glass p-3 md:p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Debits</div>
          <div className="font-semibold text-debit num md:text-lg">{formatINR(sum.debit)}</div>
        </motion.div>
        <motion.div {...reveal(2)} className="glass p-3 md:p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Net</div>
          <div className="font-semibold md:text-lg">
            <Amount value={sum.balance} />
          </div>
        </motion.div>
      </div>

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No entries match" body="Adjust the filters or post a new entry." />
        ) : (
          <table className="k-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt</th>
                <th>Student</th>
                <th>Title</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const st = byId.get(t.studentId);
                return (
                  <motion.tr {...reveal(0, 0, t.voided ? 0.55 : 1)} key={t.id}>
                    <td className="num text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="font-mono text-xs text-muted-foreground">{t.receiptNo}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={st?.name ?? "?"} size={28} />
                        <div>
                          <div className={cn("text-foreground", t.voided && "line-through")}>{st?.name}</div>
                          <div className="text-xs text-subtle num">
                            {t.studentId} · {st?.className}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={cn("text-foreground", t.voided && "line-through")}>{t.title}</div>
                      {t.voided ? (
                        <div className="max-w-[16rem] truncate text-xs text-debit" title={t.voided.reason}>
                          Void: {t.voided.reason}
                        </div>
                      ) : t.reason ? (
                        <div className="max-w-[16rem] truncate text-xs text-subtle">{t.reason}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {t.voided ? <Chip tone="neutral" icon={Ban}>Void</Chip> : t.type === "credit" ? <Chip tone="credit">Credit</Chip> : <Chip tone="debit">Debit</Chip>}
                        {t.batchId && <Chip tone="info" icon={Layers}>{t.batchId}</Chip>}
                      </div>
                    </td>
                    <td className={cn("text-right font-medium", t.voided && "line-through")}>
                      <Amount value={t.amount} type={t.type} />
                    </td>
                    <td className="text-right">
                      {!t.voided && (
                        <Btn variant="ghost" size="sm" onClick={() => setVoiding(t)}>
                          <Ban /> Void
                        </Btn>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pager page={page} pages={pages} onPage={setPage} total={filtered.length} label="entries" />
      </TableShell>

      <NewEntryDialog open={entryOpen} onOpenChange={setEntryOpen} sector={slug} />
      <VoidDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title="Void this entry?"
        summary={
          voiding && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{voiding.title}</div>
                <div className="text-xs text-muted-foreground">
                  {byId.get(voiding.studentId)?.name} · {voiding.receiptNo} · {formatDate(voiding.date)}
                </div>
              </div>
              <Amount value={voiding.amount} type={voiding.type} className="font-semibold" />
            </div>
          )
        }
        onConfirm={(reason) => {
          if (!voiding) return;
          voidEntry(voiding.id, reason);
          toast.success(`${voiding.receiptNo} voided`, { description: "Recorded in the audit log." });
        }}
      />
    </div>
  );
}

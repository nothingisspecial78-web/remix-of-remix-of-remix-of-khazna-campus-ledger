import { ArrowDownLeft, ArrowUpRight, Check, IndianRupee, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TODAY, formatINR } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import type { SectorSlug, TxType } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { Btn } from "./btn";
import { KDialog } from "./overlays";
import { Amount, Avatar, Field, Segmented } from "./primitives";

export interface EntryPreset {
  studentId?: string | undefined;
  type?: TxType | undefined;
  amount?: number | undefined;
  title?: string | undefined;
}

export function NewEntryDialog({ open, onOpenChange, sector, preset }: { open: boolean; onOpenChange: (o: boolean) => void; sector: SectorSlug; preset?: EntryPreset | undefined }) {
  const students = useKhazna((s) => s.students);
  const txs = useKhazna((s) => s.transactions);
  const sec = useKhazna((s) => s.sectors.find((x) => x.slug === sector)!);
  const addEntry = useKhazna((s) => s.addEntry);

  const nextReceipt = useMemo(() => {
    const nums = txs.filter((t) => t.sector === sector && t.receiptNo.startsWith(sec.receiptPrefix)).map((t) => Number(t.receiptNo.slice(sec.receiptPrefix.length)) || 0);
    return `${sec.receiptPrefix}${Math.max(0, ...nums) + 1}`;
  }, [txs, sector, sec.receiptPrefix]);

  const blank = { studentId: "", type: "credit" as TxType, title: "", reason: "", amount: "", date: TODAY, receipt: "" };
  const [form, setForm] = useState(blank);
  const [q, setQ] = useState("");
  const [touched, setTouched] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm({ ...blank, studentId: preset?.studentId ?? "", type: preset?.type ?? "credit", amount: preset?.amount ? String(preset.amount) : "", title: preset?.title ?? "" });
      setQ("");
      setTouched(false);
    }
  }

  const student = students.find((s) => s.id === form.studentId);
  const before = student ? totals(txs, { studentId: student.id, sector }).balance : 0;
  const amt = Number(form.amount) || 0;
  const after = before + (form.type === "credit" ? amt : -amt);
  const receipt = form.receipt || nextReceipt;

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return students.slice(0, 5);
    return students.filter((s) => s.name.toLowerCase().includes(t) || s.id.toLowerCase().includes(t) || s.className.toLowerCase().includes(t)).slice(0, 6);
  }, [q, students]);

  const errors = {
    student: !student ? "Choose a student" : "",
    title: form.title.trim().length < 3 ? "Title is required" : "",
    reason: form.type === "debit" && form.reason.trim().length < 5 ? "A reason is mandatory for debits" : "",
    amount: amt <= 0 ? "Enter an amount above ₹0" : amt > 200000 ? "Single entries are capped at ₹2,00,000" : "",
    receipt: txs.some((t) => t.receiptNo === receipt && t.sector === sector) ? "This receipt number is already used" : "",
  };
  const valid = Object.values(errors).every((e) => !e);
  const titles = form.type === "credit" ? sec.creditTitles : sec.debitTitles;

  const save = () => {
    setTouched(true);
    if (!valid || !student) return;
    addEntry({ sector, studentId: student.id, type: form.type, title: form.title.trim(), reason: form.type === "debit" ? form.reason.trim() : undefined, amount: amt, date: form.date, receiptNo: receipt });
    toast.success(`${form.type === "credit" ? "Credit" : "Debit"} of ${formatINR(amt)} posted`, { description: `${student.name} · ${receipt}` });
    onOpenChange(false);
  };

  return (
    <KDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-xl"
      title="New ledger entry"
      description={`${sec.name} · posted entries can only be voided, never edited.`}
      footer={
        <>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save}>
            <Check /> Post entry
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Student" required error={touched ? errors.student : ""}>
          {student ? (
            <div className="glass-inset flex items-center gap-3 p-2.5">
              <Avatar name={student.name} size={34} />
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{student.name}</div>
                <div className="text-xs text-muted-foreground num">
                  {student.id} · {student.className} · balance <Amount value={before} />
                </div>
              </div>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForm({ ...form, studentId: "" })}>
                Change
              </button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input className="k-input pl-9" placeholder="Search name, Ad.No or class…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
              </div>
              <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-hairline">
                {matches.map((s) => (
                  <button key={s.id} type="button" onClick={() => setForm({ ...form, studentId: s.id })} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent">
                    <Avatar name={s.name} size={26} />
                    <span className="flex-1 text-foreground">{s.name}</span>
                    <span className="text-xs text-muted-foreground num">
                      {s.id} · {s.className}
                    </span>
                  </button>
                ))}
                {matches.length === 0 && <div className="px-3 py-3 text-xs text-subtle">No students found</div>}
              </div>
            </div>
          )}
        </Field>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">Entry type</span>
          <Segmented
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v, title: "" })}
            options={[
              { value: "credit", label: <><ArrowDownLeft className="size-3.5 text-credit" /> Credit</>, activeClass: "bg-credit/15 border-credit/30" },
              { value: "debit", label: <><ArrowUpRight className="size-3.5 text-debit" /> Debit</>, activeClass: "bg-debit/15 border-debit/30" },
            ]}
          />
        </div>

        <Field label="Title" required error={touched ? errors.title : ""}>
          <input className="k-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.type === "credit" ? "e.g. Cash Deposit" : "e.g. Exam Fee"} aria-invalid={touched && !!errors.title} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {titles.map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, title: t })} className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", form.title === t ? "border-primary/50 bg-primary/15 text-primary" : "border-hairline bg-accent text-muted-foreground hover:text-foreground")}>
                {t}
              </button>
            ))}
          </div>
        </Field>

        {form.type === "debit" && (
          <Field label="Debit reason" required error={touched ? errors.reason : ""}>
            <textarea className="k-input h-20 py-2" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this amount being deducted?" aria-invalid={touched && !!errors.reason} />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Amount" required error={touched ? errors.amount : ""}>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <input className="k-input num pl-8" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} placeholder="500" aria-invalid={touched && !!errors.amount} />
            </div>
          </Field>
          <Field label="Date" required>
            <input type="date" className="k-input num" value={form.date} max={TODAY} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Receipt #" required error={touched ? errors.receipt : ""}>
            <input className="k-input num" value={form.receipt} placeholder={nextReceipt} onChange={(e) => setForm({ ...form, receipt: e.target.value.toUpperCase() })} />
          </Field>
        </div>

        {student && amt > 0 && (
          <div className="glass-inset flex items-center justify-between p-3 text-sm">
            <span className="text-muted-foreground">Balance after entry</span>
            <span className="flex items-center gap-2 num">
              <Amount value={before} className="text-muted-foreground" />
              <span className="text-subtle">→</span>
              <Amount value={after} className="font-semibold" />
            </span>
          </div>
        )}
      </div>
    </KDialog>
  );
}

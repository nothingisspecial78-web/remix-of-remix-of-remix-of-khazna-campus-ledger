import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Eye,
  IndianRupee,
  Rocket,
  Search,
  Sparkles,
  Users,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Stepper } from "@/components/khazna/Stepper";
import { Amount, Avatar, Chip, CountUp, Field, FilterChip, GlassCard, PageHeader, ProgressRing, Segmented, TableShell } from "@/components/khazna/primitives";
import { tileVar } from "@/components/khazna/sector-meta";
import { asSector } from "@/lib/khazna/data";
import { formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { previewAfter, receiptSeries } from "@/lib/khazna/ledger";
import { studentSectorBalances } from "@/lib/khazna/selectors";
import { useKhazna } from "@/lib/khazna/store";
import type { Batch, TxType } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/m/$sectorSlug/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Entry — Khazna" },
      { name: "description", content: "Post one fee or deposit to many students at once with a before-and-after balance preview." },
      { property: "og:title", content: "Bulk Entry — Khazna" },
      { property: "og:description", content: "Post one entry to many students with a live balance preview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkPage,
});

const STEPS = [
  { label: "Select students", icon: Users },
  { label: "Entry details", icon: ClipboardList },
  { label: "Preview", icon: Eye },
  { label: "Confirm", icon: Rocket },
];

const TEMPLATES: { title: string; type: TxType; amount: number; prefix: string }[] = [
  { title: "Study Tour Fee", type: "debit", amount: 500, prefix: "ST-" },
  { title: "Exam Fee", type: "debit", amount: 750, prefix: "EX-" },
  { title: "Kitab Purchase", type: "debit", amount: 850, prefix: "KP-" },
  { title: "Seminar Fee", type: "debit", amount: 300, prefix: "SM-" },
  { title: "Arts Fest Contribution", type: "debit", amount: 300, prefix: "AF-" },
  { title: "Hostel Mess Bill", type: "debit", amount: 2400, prefix: "MB-" },
  { title: "Scholarship Credit", type: "credit", amount: 1500, prefix: "SC-" },
  { title: "Cash Deposit", type: "credit", amount: 1000, prefix: "CD-" },
];

function BulkPage() {
  const slug = asSector(Route.useParams().sectorSlug);
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const txs = useKhazna((s) => s.transactions);
  const postBatch = useKhazna((s) => s.postBatch);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cls, setCls] = useState("Fiqh 2");
  const [q, setQ] = useState("");
  const [type, setType] = useState<TxType>("debit");
  const [title, setTitle] = useState("Study Tour Fee");
  const [reason, setReason] = useState("Ooty study tour — Term 2");
  const [amount, setAmount] = useState("500");
  const [date, setDate] = useState(TODAY);
  const [prefix, setPrefix] = useState("ST-");
  const [startOverride, setStartOverride] = useState<string>("");
  const [touched, setTouched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState<Batch | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const balances = useMemo(() => studentSectorBalances(txs, slug), [txs, slug]);
  const classCount = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => m.set(s.className, (m.get(s.className) ?? 0) + 1));
    return m;
  }, [students]);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return students.filter((s) => (cls === "All" || s.className === cls) && (!t || s.name.toLowerCase().includes(t) || s.id.toLowerCase().includes(t)));
  }, [students, cls, q]);
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) visible.forEach((s) => n.delete(s.id));
      else visible.forEach((s) => n.add(s.id));
      return n;
    });

  const chosen = students.filter((s) => selected.has(s.id));
  const amt = Number(amount) || 0;
  const suggestedStart = useMemo(() => {
    const p = prefix.toUpperCase();
    const nums = txs.filter((t) => t.sector === slug && t.receiptNo.startsWith(p)).map((t) => Number(t.receiptNo.slice(p.length)) || 0);
    return Math.max(0, ...nums) + 1;
  }, [txs, slug, prefix]);
  const start = Number(startOverride) || suggestedStart;
  const receipts = receiptSeries(prefix.toUpperCase(), start, chosen.length);

  const errors = {
    title: title.trim().length < 3 ? "Title is required" : "",
    reason: type === "debit" && reason.trim().length < 5 ? "A reason is mandatory for debits" : "",
    amount: amt <= 0 ? "Enter an amount above ₹0" : "",
    prefix: !/^[A-Za-z]{1,4}-?$/.test(prefix) ? "1–4 letters, e.g. ST-" : "",
  };
  const detailsValid = Object.values(errors).every((e) => !e);

  const preview = chosen.map((s, i) => {
    const before = balances.get(s.id)?.balance ?? 0;
    return { s, receipt: receipts[i] ?? "", before, after: previewAfter(before, type, amt) };
  });
  const batchTotal = amt * chosen.length;
  const goingNegative = preview.filter((p) => p.after < 0 && p.before >= 0).length;

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setTitle(t.title);
    setType(t.type);
    setAmount(String(t.amount));
    setPrefix(t.prefix);
    setStartOverride("");
    if (t.type === "debit" && !reason) setReason(`${t.title} — ${sector.name}`);
  };

  const runPost = () => {
    if (posting) return;
    setPosting(true);
    setProgress(0);
    const total = chosen.length;
    let done = 0;
    timer.current = setInterval(() => {
      done = Math.min(total, done + Math.max(1, Math.ceil(total / 18)));
      setProgress(done / total);
      if (done >= total) {
        if (timer.current) clearInterval(timer.current);
        const b = postBatch({
          sector: slug,
          studentIds: chosen.map((s) => s.id),
          type,
          title: title.trim(),
          reason: type === "debit" ? reason.trim() : undefined,
          amount: amt,
          date,
          receiptPrefix: prefix.toUpperCase(),
          receiptStart: start,
        });
        setTimeout(() => {
          setPosted(b);
          setPosting(false);
          toast.success(`Batch ${b.id} posted`, { description: `${total} entries · ${formatINR(batchTotal)}` });
        }, 450);
      }
    }, 90);
  };

  const restart = () => {
    setPosted(null);
    setProgress(0);
    setSelected(new Set());
    setStep(0);
    setTouched(false);
    setStartOverride("");
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3" /> {sector.name} · Bulk entry
          </span>
        }
        title="Post to many students at once"
        description="Pick a class, set one entry, preview every balance before anything is written."
      />
      <Stepper steps={STEPS} current={posted ? 4 : step} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {/* STEP 1 — SELECT */}
          {step === 0 && (
            <div>
              <div className="glass mb-4 space-y-3 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {["All", ...classes].map((c) => (
                    <FilterChip key={c} active={cls === c} onClick={() => setCls(c)}>
                      {c} <span className="ml-1 opacity-60 num">{c === "All" ? students.length : (classCount.get(c) ?? 0)}</span>
                    </FilterChip>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                    <input className="k-input pl-9" placeholder={`Search in ${cls === "All" ? "all classes" : cls}…`} value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <Btn variant={allVisibleSelected ? "soft" : "glass"} onClick={toggleAll} disabled={visible.length === 0}>
                    <span className={cn("grid size-4 place-items-center rounded border", allVisibleSelected ? "border-primary bg-primary text-primary-foreground" : "border-glass-border")}>{allVisibleSelected && <Check className="size-3" />}</span>
                    {allVisibleSelected ? "Deselect" : "Select"} all {visible.length}
                  </Btn>
                </div>
              </div>

              <div className="grid gap-2.5 pb-36 sm:grid-cols-2 sm:pb-12 xl:grid-cols-3 2xl:grid-cols-4">
                {visible.map((s, i) => {
                  const on = selected.has(s.id);
                  const bal = balances.get(s.id)?.balance ?? 0;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      layout
                      {...reveal(i)}
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                        on ? "border-primary/50 bg-primary/10 shadow-glow" : "border-glass-border bg-glass hover:bg-accent",
                      )}
                    >
                      <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-glass-border")}>
                        <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-3.5" /></motion.span>}</AnimatePresence>
                      </span>
                      <Avatar name={s.name} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{s.name}</span>
                        <span className="block text-xs text-muted-foreground num">
                          {s.id} · {s.className}
                        </span>
                      </span>
                      <Amount value={bal} className="text-xs" />
                    </motion.button>
                  );
                })}
              </div>
              {visible.length === 0 && <div className="glass p-10 text-center text-sm text-muted-foreground">No students in this filter.</div>}

              {/* sticky counter bar */}
              <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-3 sm:bottom-4 lg:pl-72">
                <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-strong pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl p-2.5 pl-4 shadow-xl">
                  <div className="flex -space-x-2">
                    {chosen.slice(0, 4).map((s) => (
                      <Avatar key={s.id} name={s.name} size={28} className="border-2 border-background" />
                    ))}
                  </div>
                  <div className="flex-1 text-sm">
                    <span className="font-display text-lg font-semibold text-foreground num">
                      <CountUp value={selected.size} duration={0.4} format={(n) => String(Math.round(n))} />
                    </span>{" "}
                    <span className="text-muted-foreground">student{selected.size === 1 ? "" : "s"} selected</span>
                  </div>
                  {selected.size > 0 && (
                    <Btn variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                      <X /> Clear
                    </Btn>
                  )}
                  <Btn variant="primary" disabled={selected.size === 0} onClick={() => setStep(1)}>
                    Continue <ArrowRight />
                  </Btn>
                </motion.div>
              </div>
            </div>
          )}

          {/* STEP 2 — DETAILS */}
          {step === 1 && (
            <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
              <GlassCard className="space-y-5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Entry details</h3>
                  <Segmented
                    value={type}
                    onChange={setType}
                    options={[
                      { value: "credit", label: <><ArrowDownLeft className="size-3.5 text-credit" /> Credit</>, activeClass: "bg-credit/15 border-credit/30" },
                      { value: "debit", label: <><ArrowUpRight className="size-3.5 text-debit" /> Debit</>, activeClass: "bg-debit/15 border-debit/30" },
                    ]}
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Templates</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
                          title === t.title ? "border-primary/50 bg-primary/15 text-primary" : "border-hairline bg-accent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", t.type === "credit" ? "bg-credit" : "bg-debit")} />
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Title" required error={touched ? errors.title : ""}>
                  <input className="k-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                {type === "debit" && (
                  <Field label="Debit reason" required error={touched ? errors.reason : ""}>
                    <textarea className="k-input h-20 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Shown on each student's statement" />
                  </Field>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount per student" required error={touched ? errors.amount : ""}>
                    <div className="relative">
                      <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
                      <input className="k-input num pl-8 text-base font-semibold" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      {[200, 500, 1000, 2500].map((v) => (
                        <button key={v} type="button" onClick={() => setAmount(String(v))} className={cn("rounded-full border px-2.5 py-0.5 text-[11px] num", amt === v ? "border-primary/50 bg-primary/15 text-primary" : "border-hairline bg-accent text-muted-foreground")}>
                          {formatINR(v)}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Date" required>
                    <input type="date" className="k-input num" value={date} max={TODAY} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                  <Field label="Receipt prefix" required error={touched ? errors.prefix : ""}>
                    <input className="k-input num uppercase" value={prefix} onChange={(e) => { setPrefix(e.target.value.toUpperCase()); setStartOverride(""); }} />
                  </Field>
                  <Field label="Starting number" hint={`Next free: ${String(suggestedStart).padStart(3, "0")}`}>
                    <input className="k-input num" inputMode="numeric" value={startOverride} placeholder={String(suggestedStart).padStart(3, "0")} onChange={(e) => setStartOverride(e.target.value.replace(/\D/g, ""))} />
                  </Field>
                </div>
              </GlassCard>

              <GlassCard className="h-fit p-6 lg:sticky lg:top-28" transition={{ delay: 0.1 }}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Batch summary</div>
                <div className="mt-3 flex items-center gap-2">
                  {type === "credit" ? <Chip tone="credit">Credit</Chip> : <Chip tone="debit">Debit</Chip>}
                  <span className="truncate font-medium text-foreground">{title || "Untitled"}</span>
                </div>
                <div className="mt-5 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Per student</span>
                  <span className="num">{formatINR(amt)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">Students</span>
                  <span className="num">× {chosen.length}</span>
                </div>
                <div className="my-4 h-px bg-hairline" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Batch total</span>
                  <span className={cn("font-display text-2xl font-semibold num", type === "credit" ? "text-credit" : "text-debit")}>{formatINR(type === "credit" ? batchTotal : -batchTotal, { sign: true })}</span>
                </div>
                <div className="glass-inset mt-4 p-3 text-xs text-muted-foreground">
                  Receipts <span className="font-mono text-foreground">{receipts[0]}</span> → <span className="font-mono text-foreground">{receipts[receipts.length - 1]}</span>
                  <br />
                  Dated {formatDate(date)}
                </div>
              </GlassCard>

              <div className="flex justify-between lg:col-span-2">
                <Btn variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft /> Students
                </Btn>
                <Btn
                  variant="primary"
                  onClick={() => {
                    setTouched(true);
                    if (detailsValid) setStep(2);
                  }}
                >
                  Preview balances <ArrowRight />
                </Btn>
              </div>
            </div>
          )}

          {/* STEP 3 — PREVIEW */}
          {step === 2 && (
            <div>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 w-full">
                <GlassCard className="p-4">
                  <div className="text-xs text-muted-foreground">Entries</div>
                  <div className="font-display text-2xl font-semibold num">{chosen.length}</div>
                </GlassCard>
                <GlassCard className="p-4" transition={{ delay: 0.05 }}>
                  <div className="text-xs text-muted-foreground">Batch total</div>
                  <div className={cn("font-display text-2xl font-semibold num", type === "credit" ? "text-credit" : "text-debit")}>{formatINR(type === "credit" ? batchTotal : -batchTotal, { sign: true })}</div>
                </GlassCard>
                <GlassCard className="p-4" transition={{ delay: 0.1 }}>
                  <div className="text-xs text-muted-foreground">Will go below zero</div>
                  <div className={cn("font-display text-2xl font-semibold num", goingNegative ? "text-debit" : "text-credit")}>{goingNegative}</div>
                </GlassCard>
              </div>
              {goingNegative > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
                  <AlertTriangle className="size-4" /> {goingNegative} student{goingNegative === 1 ? "" : "s"} will move into dues after this batch.
                </div>
              )}
              <TableShell className="w-full">
                {/* Mobile Aesthetic Bulk Preview Cards (No horizontal side-scrolling) */}
                <div className="divide-y divide-hairline md:hidden">
                  {preview.map((p, i) => (
                    <motion.div key={p.s.id} {...reveal(i)} className="p-3.5 space-y-2 transition-colors active:bg-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={p.s.name} size={32} />
                          <div className="min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">{p.s.name}</div>
                            <div className="text-xs text-muted-foreground num">{p.s.id} · {p.s.className}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold num", type === "credit" ? "border-credit/30 bg-credit/12 text-credit" : "border-debit/30 bg-debit/12 text-debit")}>
                            {formatINR(type === "credit" ? amt : -amt, { sign: true })}
                          </span>
                          <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.receipt}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-hairline/40 num">
                        <span className="text-muted-foreground">Before: <Amount value={p.before} /></span>
                        <span className="font-semibold text-foreground">After: <Amount value={p.after} /></span>
                      </div>
                    </motion.div>
                  ))}
                  <div className="p-3.5 bg-accent/40 rounded-b-xl border-t border-hairline flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Batch Total ({chosen.length} students)</span>
                    <span className={cn("font-bold num", type === "credit" ? "text-credit" : "text-debit")}>
                      {formatINR(type === "credit" ? batchTotal : -batchTotal, { sign: true })}
                    </span>
                  </div>
                </div>

                {/* Desktop Tabular Model */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Ad.No</th>
                        <th>Receipt</th>
                        <th className="text-right">Before</th>
                        <th className="text-center">Change</th>
                        <th className="text-right">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <motion.tr key={p.s.id} {...reveal(i)}>
                          <td className="num text-subtle">{i + 1}</td>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={p.s.name} size={28} />
                              <span className="text-foreground">{p.s.name}</span>
                            </div>
                          </td>
                          <td className="num text-muted-foreground">{p.s.id}</td>
                          <td className="font-mono text-xs text-muted-foreground">{p.receipt}</td>
                          <td className="text-right text-muted-foreground">
                            <Amount value={p.before} />
                          </td>
                          <td className="text-center">
                            <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold num", type === "credit" ? "border-credit/30 bg-credit/12 text-credit" : "border-debit/30 bg-debit/12 text-debit")}>
                              {formatINR(type === "credit" ? amt : -amt, { sign: true })}
                            </span>
                          </td>
                          <td className="text-right font-semibold">
                            <Amount value={p.after} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-accent">
                        <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-foreground">
                          Batch total · {chosen.length} students
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          <Amount value={preview.reduce((a, p) => a + p.before, 0)} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("font-semibold num", type === "credit" ? "text-credit" : "text-debit")}>{formatINR(type === "credit" ? batchTotal : -batchTotal, { sign: true })}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <Amount value={preview.reduce((a, p) => a + p.after, 0)} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </TableShell>
              <div className="mt-5 flex justify-between">
                <Btn variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft /> Edit details
                </Btn>
                <Btn variant="primary" onClick={() => setStep(3)}>
                  Looks right <ArrowRight />
                </Btn>
              </div>
            </div>
          )}

          {/* STEP 4 — CONFIRM */}
          {step === 3 && (
            <GlassCard className="relative overflow-hidden p-8 md:p-12">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <ProgressRing value={posted ? 1 : progress} size={190} stroke={14} color={posted ? "var(--credit)" : "var(--info)"} delay={0}>
                    <AnimatePresence mode="wait">
                      {posted ? (
                        <motion.div key="done" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
                          <CheckCircle2 className="size-16 text-credit" />
                        </motion.div>
                      ) : (
                        <motion.div key="pct" exit={{ opacity: 0, scale: 0.8 }}>
                          <div className="font-display text-4xl font-semibold num">{Math.round(progress * 100)}%</div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground num">
                            {Math.round(progress * chosen.length)} / {chosen.length} posted
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ProgressRing>
                  {posted && <Burst />}
                </div>

                {posted ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="mt-6 text-2xl font-semibold">Batch posted</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-mono text-foreground">{posted.id}</span> · {posted.studentIds.length} entries · {posted.title} ·{" "}
                      <span className={cn("num", posted.type === "credit" ? "text-credit" : "text-debit")}>{formatINR(posted.amount * posted.studentIds.length)}</span>
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      <Btn variant="glass" onClick={restart}>
                        New batch
                      </Btn>
                      <Btn asChild variant="glass">
                        <Link to="/m/$sectorSlug/ledger" params={{ sectorSlug: slug }}>
                          View ledger
                        </Link>
                      </Btn>
                      <Btn asChild variant="primary">
                        <Link to="/m/$sectorSlug/batches" params={{ sectorSlug: slug }}>
                          Batch history <ArrowRight />
                        </Link>
                      </Btn>
                    </div>
                  </motion.div>
                ) : (
                  <div>
                    <h3 className="mt-6 text-2xl font-semibold">{posting ? "Posting entries…" : "Ready to post"}</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      {chosen.length} × {formatINR(amt)} {type} for <span className="text-foreground">{title}</span> into {sector.name}. Each entry gets its own receipt and audit record.
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      <Btn variant="ghost" disabled={posting} onClick={() => setStep(2)}>
                        <ArrowLeft /> Back
                      </Btn>
                      <Btn variant="primary" size="lg" disabled={posting} onClick={runPost}>
                        <Rocket /> {posting ? "Posting…" : `Post ${chosen.length} entries`}
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const BURST_COLORS = ["var(--credit)", "var(--primary)", "var(--info)", "var(--sector-velitcham)", "var(--sector-civil)"];
function Burst() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const dist = 120 + (i % 3) * 22;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 size-2 rounded-full"
            style={tileVar(BURST_COLORS[i % BURST_COLORS.length]!)}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
          >
            <span className="block size-full rounded-full bg-tile" />
          </motion.span>
        );
      })}
    </div>
  );
}

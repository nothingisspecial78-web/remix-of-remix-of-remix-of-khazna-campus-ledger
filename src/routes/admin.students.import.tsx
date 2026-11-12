import { Link, createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, FileUp, GitCompareArrows, ShieldCheck, Sparkles, UploadCloud, XCircle } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Stepper } from "@/components/khazna/Stepper";
import { Chip, FilterChip, GlassCard, PageHeader, ProgressRing, TableShell } from "@/components/khazna/primitives";
import { TODAY } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Student } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/students/import")({
  head: () => ({
    meta: [
      { title: "Bulk Student Import — Khazna" },
      { name: "description", content: "Upload a CSV, map columns and validate rows before importing students into Khazna." },
      { property: "og:title", content: "Bulk Student Import — Khazna" },
      { property: "og:description", content: "Upload, map and validate a student CSV before import." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

const STEPS = [
  { label: "Upload CSV", icon: FileUp },
  { label: "Map columns", icon: GitCompareArrows },
  { label: "Validate", icon: ShieldCheck },
  { label: "Done", icon: Sparkles },
];

const FIELDS = [
  { key: "name", label: "Full name", required: true },
  { key: "id", label: "Ad.No", required: true },
  { key: "className", label: "Class", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "guardian", label: "Guardian", required: false },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

const SAMPLE = `Student Name,Admission No,Class,Mobile,Father
Muhammed Rayan,S0201,Thanawiyya 1,9847123401,Abdul Majeed
Aysha Mehrin,S0202,Thanawiyya 1,9847123402,Shoukath Ali
Fadil Hasan,S0203,Thanawiyya 1,9847123403,Hasan Kutty
Nashwa Fathima,S0204,Thanawiyya 1,98471234,Kunhalavi
Abdul Hadi,S0205,Thanawiyya 1,9847123405,Moosa Haji
Shaz Muhammed,S0125,Thanawiyya 1,9847123406,Rasheed P.
Hiba Nasreen,S0207,Thanawiyya 1,9847123407,Jaleel K.
Irshad Ali,S0208,Thanawiya 1,9847123408,Aboobacker
Muhammed Sahal,S0209,Thanawiyya 1,9847123409,Sainudheen
,S0210,Thanawiyya 1,9847123410,Unknown
Rifa Jabin,S0211,Thanawiyya 1,9847123411,Hamza M.
Ziyan Ahmed,S0212,Thanawiyya 1,9847123412,Ahmed Kabeer`;

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const headers = split(lines[0] ?? "");
  return { headers, rows: lines.slice(1).map(split) };
}

function guess(header: string): FieldKey | "" {
  const h = header.toLowerCase();
  if (h.includes("name") && !h.includes("father") && !h.includes("guardian")) return "name";
  if (h.includes("adm") || h.includes("ad.no") || h === "id") return "id";
  if (h.includes("class")) return "className";
  if (h.includes("mob") || h.includes("phone")) return "phone";
  if (h.includes("father") || h.includes("guardian") || h.includes("parent")) return "guardian";
  return "";
}

function ImportPage() {
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const importStudents = useKhazna((s) => s.importStudents);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, FieldKey | "">>({});
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [drag, setDrag] = useState(false);
  const [imported, setImported] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = (name: string, text: string) => {
    const parsed = parseCSV(text);
    if (parsed.headers.length < 2 || parsed.rows.length === 0) {
      toast.error("That file doesn't look like a CSV with a header row");
      return;
    }
    setFileName(name);
    setData(parsed);
    setMapping(Object.fromEntries(parsed.headers.map((h) => [h, guess(h)])));
    toast.success(`${parsed.rows.length} rows detected`, { description: name });
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    f.text().then((t) => load(f.name, t));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    onFile(e.dataTransfer.files[0]);
  };

  const missingRequired = FIELDS.filter((f) => f.required && !Object.values(mapping).includes(f.key));

  const validated = useMemo(() => {
    if (!data) return [];
    const colOf = (k: FieldKey) => data.headers.findIndex((h) => mapping[h] === k);
    const seen = new Set<string>();
    return data.rows.map((r, idx) => {
      const get = (k: FieldKey) => {
        const c = colOf(k);
        return c >= 0 ? (r[c] ?? "") : "";
      };
      const st: Student = { id: get("id").toUpperCase(), name: get("name"), className: get("className"), phone: get("phone"), guardian: get("guardian") || "—", joined: TODAY };
      const errors: string[] = [];
      if (st.name.length < 2) errors.push("Name missing");
      if (!/^S\d{4}$/.test(st.id)) errors.push("Bad Ad.No");
      else if (students.some((s) => s.id === st.id)) errors.push("Ad.No exists");
      else if (seen.has(st.id)) errors.push("Duplicate in file");
      if (!classes.includes(st.className)) errors.push("Unknown class");
      if (!/^\d{10}$/.test(st.phone)) errors.push("Phone must be 10 digits");
      seen.add(st.id);
      return { idx: idx + 1, student: st, errors };
    });
  }, [data, mapping, students, classes]);

  const validRows = validated.filter((v) => v.errors.length === 0);
  const invalidRows = validated.filter((v) => v.errors.length > 0);
  const shown = filter === "all" ? validated : filter === "valid" ? validRows : invalidRows;

  const doImport = () => {
    importStudents(validRows.map((v) => v.student));
    setImported(validRows.length);
    setStep(3);
    toast.success(`${validRows.length} students imported`);
  };

  const reset = () => {
    setStep(0);
    setData(null);
    setFileName("");
    setMapping({});
    setFilter("all");
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <Link to="/admin/students" className="inline-flex items-center gap-1 hover:underline">
            <ArrowLeft className="size-3" /> Student directory
          </Link>
        }
        title="Bulk student import"
        description="Bring a whole intake in at once. Rows are checked before anything is saved."
      />
      <Stepper steps={STEPS} current={step} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
          {step === 0 && (
            <GlassCard className="p-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all",
                  drag ? "border-primary bg-primary/10" : "border-glass-border hover:border-primary/50 hover:bg-accent",
                )}
              >
                <motion.div animate={{ y: drag ? -6 : 0 }} className="grid size-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <UploadCloud className="size-7" />
                </motion.div>
                <div className="mt-4 font-display text-lg font-semibold">Drop your CSV here</div>
                <div className="mt-1 text-sm text-muted-foreground">or click to browse · columns for name, Ad.No, class, phone</div>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
              <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
                {fileName ? (
                  <div className="glass-inset flex items-center gap-3 px-3 py-2 text-sm">
                    <FileSpreadsheet className="size-4 text-credit" />
                    <span className="text-foreground">{fileName}</span>
                    <Chip tone="credit">{data?.rows.length} rows</Chip>
                  </div>
                ) : (
                  <button className="text-sm text-primary hover:underline" onClick={() => load("thanawiyya-1-intake.csv", SAMPLE)}>
                    No file handy? Use the sample intake file →
                  </button>
                )}
                <Btn variant="primary" disabled={!data} onClick={() => setStep(1)}>
                  Continue <ArrowRight />
                </Btn>
              </div>
            </GlassCard>
          )}

          {step === 1 && data && (
            <GlassCard className="p-6">
              <h3 className="font-semibold">Match your columns</h3>
              <p className="text-sm text-muted-foreground">We guessed where we could. Fields marked * are required.</p>
              <div className="mt-5 space-y-2">
                {data.headers.map((h) => (
                  <div key={h} className="glass-inset grid items-center gap-3 p-3 sm:grid-cols-[1fr_auto_1fr]">
                    <div>
                      <div className="text-sm font-medium text-foreground">{h}</div>
                      <div className="truncate text-xs text-muted-foreground">e.g. {data.rows[0]?.[data.headers.indexOf(h)] || "—"}</div>
                    </div>
                    <ArrowRight className="hidden size-4 text-subtle sm:block" />
                    <select className="k-input" value={mapping[h] ?? ""} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as FieldKey | "" })}>
                      <option value="">Skip this column</option>
                      {FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {missingRequired.length > 0 && (
                <div className="mt-4 rounded-lg border border-debit/30 bg-debit/10 px-3 py-2 text-xs text-debit">Still needed: {missingRequired.map((f) => f.label).join(", ")}</div>
              )}
              <div className="mt-5 flex justify-between">
                <Btn variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft /> Back
                </Btn>
                <Btn variant="primary" disabled={missingRequired.length > 0} onClick={() => setStep(2)}>
                  Validate rows <ArrowRight />
                </Btn>
              </div>
            </GlassCard>
          )}

          {step === 2 && (
            <div>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <GlassCard className="p-4">
                  <div className="text-xs text-muted-foreground">Rows in file</div>
                  <div className="font-display text-2xl font-semibold num">{validated.length}</div>
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="text-xs text-muted-foreground">Ready to import</div>
                  <div className="font-display text-2xl font-semibold text-credit num">{validRows.length}</div>
                </GlassCard>
                <GlassCard className="p-4">
                  <div className="text-xs text-muted-foreground">Need fixing</div>
                  <div className="font-display text-2xl font-semibold text-debit num">{invalidRows.length}</div>
                </GlassCard>
              </div>
              <div className="mb-3 flex gap-1.5">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  All {validated.length}
                </FilterChip>
                <FilterChip active={filter === "valid"} onClick={() => setFilter("valid")}>
                  Valid {validRows.length}
                </FilterChip>
                <FilterChip active={filter === "invalid"} onClick={() => setFilter("invalid")}>
                  Invalid {invalidRows.length}
                </FilterChip>
              </div>
              <TableShell>
                <table className="k-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Status</th>
                      <th>Name</th>
                      <th>Ad.No</th>
                      <th>Class</th>
                      <th>Phone</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((v) => (
                      <tr key={v.idx} className={v.errors.length ? "bg-debit/[0.04]" : ""}>
                        <td className="num text-subtle">{v.idx}</td>
                        <td>
                          {v.errors.length ? (
                            <Chip tone="debit" icon={XCircle}>
                              Invalid
                            </Chip>
                          ) : (
                            <Chip tone="credit" icon={CheckCircle2}>
                              Valid
                            </Chip>
                          )}
                        </td>
                        <td className={v.student.name ? "text-foreground" : "italic text-subtle"}>{v.student.name || "missing"}</td>
                        <td className="num text-muted-foreground">{v.student.id}</td>
                        <td className="text-muted-foreground">{v.student.className}</td>
                        <td className="num text-muted-foreground">{v.student.phone}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {v.errors.map((e) => (
                              <Chip key={e} tone="debit">
                                {e}
                              </Chip>
                            ))}
                            {!v.errors.length && <span className="text-xs text-subtle">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
              <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row">
                <Btn variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft /> Back to mapping
                </Btn>
                <Btn variant="primary" disabled={validRows.length === 0} onClick={doImport}>
                  Import {validRows.length} valid students <ArrowRight />
                </Btn>
              </div>
            </div>
          )}

          {step === 3 && (
            <GlassCard className="flex flex-col items-center p-10 text-center">
              <ProgressRing value={1} size={140} color="var(--credit)">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: "spring" }}>
                  <CheckCircle2 className="size-12 text-credit" />
                </motion.div>
              </ProgressRing>
              <h3 className="mt-6 text-2xl font-semibold">{imported} students imported</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                They now appear in the directory with empty ledgers in every sector. {invalidRows.length > 0 && `${invalidRows.length} rows were skipped — fix and re-upload them anytime.`}
              </p>
              <div className="mt-6 flex gap-2">
                <Btn variant="glass" onClick={reset}>
                  Import another file
                </Btn>
                <Btn asChild variant="primary">
                  <Link to="/admin/students">View directory</Link>
                </Btn>
              </div>
            </GlassCard>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

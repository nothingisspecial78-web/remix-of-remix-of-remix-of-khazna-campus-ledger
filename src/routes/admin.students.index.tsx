import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Download, Phone, Plus, Upload, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Amount, Avatar, Chip, EmptyState, Field, FilterChip, PageHeader, Pager, SearchInput, TableShell } from "@/components/khazna/primitives";
import { SECTOR_ICON, tileVar } from "@/components/khazna/sector-meta";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import type { Student } from "@/lib/khazna/types";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/admin/students/")({
  head: () => ({
    meta: [
      { title: "Student Directory — Khazna" },
      { name: "description", content: "Search, filter and add Islahul Uloom students and see their combined balances." },
      { property: "og:title", content: "Student Directory — Khazna" },
      { property: "og:description", content: "Search, filter and add students with combined balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentsPage,
});

const PER_PAGE = 12;

function StudentsPage() {
  const students = useKhazna((s) => s.students);
  const txs = useKhazna((s) => s.transactions);
  const classes = useKhazna((s) => s.classes);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("All");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Student | null>(null);

  const balances = useMemo(() => {
    const m = new Map<string, { balance: number; sectors: Set<string> }>();
    for (const t of txs) {
      if (t.voided) continue;
      const cur = m.get(t.studentId) ?? { balance: 0, sectors: new Set<string>() };
      cur.balance += t.type === "credit" ? t.amount : -t.amount;
      cur.sectors.add(t.sector);
      m.set(t.studentId, cur);
    }
    return m;
  }, [txs]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students.filter((s) => (cls === "All" || s.className === cls) && (!term || s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term) || s.phone.includes(term)));
  }, [students, q, cls]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCsv = () => {
    downloadCSV(`khazna-students-${TODAY}.csv`, [
      ["Ad.No", "Name", "Class", "Phone", "Guardian", "Combined Balance"],
      ...filtered.map((s) => [s.id, s.name, s.className, s.phone, s.guardian, balances.get(s.id)?.balance ?? 0]),
    ]);
    toast.success(`Exported ${filtered.length} students`, { description: "CSV downloaded to your device." });
  };

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Student Directory"
        description={`${students.length} students enrolled across ${classes.length} classes.`}
        actions={
          <>
            <Btn variant="glass" onClick={exportCsv}>
              <Download /> Export
            </Btn>
            <Btn asChild variant="glass">
              <Link to="/admin/students/import">
                <Upload /> Bulk import
              </Link>
            </Btn>
            <Btn variant="primary" onClick={() => setAdding(true)}>
              <Plus /> Add student
            </Btn>
          </>
        }
      />

      <motion.div {...reveal()} className="glass mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, Ad.No or phone…" className="lg:w-80" />
        <div className="flex flex-wrap gap-1.5">
          {["All", ...classes].map((c) => (
            <FilterChip key={c} active={cls === c} onClick={() => { setCls(c); setPage(1); }}>
              {c}
            </FilterChip>
          ))}
        </div>
      </motion.div>

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No students match" body="Try a different name, Ad.No or class filter." />
        ) : (
          <table className="k-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Ad.No</th>
                <th>Class</th>
                <th>Phone</th>
                <th>Sectors</th>
                <th className="text-right">Combined balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
                const b = balances.get(s.id);
                return (
                  <motion.tr key={s.id} {...reveal(i)} className="cursor-pointer" onClick={() => setViewing(s)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} size={32} />
                        <div>
                          <div className="font-medium text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">c/o {s.guardian}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num text-muted-foreground">{s.id}</td>
                    <td>
                      <Chip>{s.className}</Chip>
                    </td>
                    <td className="num text-muted-foreground">{s.phone}</td>
                    <td className="num text-muted-foreground">{b?.sectors.size ?? 0}</td>
                    <td className="text-right font-medium">
                      <Amount value={b?.balance ?? 0} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pager page={page} pages={pages} onPage={setPage} total={filtered.length} label="students" />
      </TableShell>

      <AddStudentDrawer open={adding} onOpenChange={setAdding} />
      <StudentDrawer student={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function AddStudentDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const addStudent = useKhazna((s) => s.addStudent);
  const nextId = `S${String(Math.max(...students.map((s) => Number(s.id.slice(1)))) + 1).padStart(4, "0")}`;
  const [form, setForm] = useState({ name: "", id: "", className: classes[0] ?? "", phone: "", guardian: "" });
  const [touched, setTouched] = useState(false);
  const id = form.id || nextId;
  const errors = {
    name: form.name.trim().length < 3 ? "Enter the student's full name" : "",
    id: !/^S\d{4}$/.test(id) ? "Format: S followed by 4 digits" : students.some((s) => s.id === id) ? "This Ad.No already exists" : "",
    phone: !/^\d{10}$/.test(form.phone) ? "10-digit mobile number" : "",
  };
  const valid = !errors.name && !errors.id && !errors.phone;

  const save = () => {
    setTouched(true);
    if (!valid) return;
    addStudent({ id, name: form.name.trim(), className: form.className, phone: form.phone, guardian: form.guardian || "—", joined: TODAY });
    toast.success(`${form.name} added`, { description: `${id} · ${form.className}` });
    setForm({ name: "", id: "", className: classes[0] ?? "", phone: "", guardian: "" });
    setTouched(false);
    onOpenChange(false);
  };

  return (
    <KDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add student"
      description="New students get an empty ledger in every sector."
      footer={
        <>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save}>
            <UserPlus /> Add student
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required error={touched ? errors.name : ""}>
          <input className="k-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Muhammed Rayan" aria-invalid={touched && !!errors.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ad.No" required error={touched ? errors.id : ""} hint="Auto-assigned">
            <input className="k-input num" value={form.id} placeholder={nextId} onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Class" required>
            <select className="k-input" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}>
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Mobile" required error={touched ? errors.phone : ""}>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input className="k-input num pl-9" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="98470 00000" />
          </div>
        </Field>
        <Field label="Guardian name">
          <input className="k-input" value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} placeholder="e.g. Abdul Rahman" />
        </Field>
      </div>
    </KDrawer>
  );
}

function StudentDrawer({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const txs = useKhazna((s) => s.transactions);
  const sectors = useKhazna((s) => s.sectors);
  if (!student) return <KDrawer open={false} onOpenChange={onClose} title="" children={null} />;
  const all = totals(txs, { studentId: student.id });
  const recent = txs.filter((t) => t.studentId === student.id).slice(0, 6);
  return (
    <KDrawer open={!!student} onOpenChange={(o) => !o && onClose()} title={student.name} description={`${student.id} · ${student.className} · joined ${formatDate(student.joined)}`}>
      <div className="glass-inset p-4">
        <div className="text-xs text-muted-foreground">Combined balance</div>
        <div className="font-display text-3xl font-semibold">
          <Amount value={all.balance} />
        </div>
        <div className="mt-1 flex gap-4 text-xs num">
          <span className="text-credit">In {formatINR(all.credit)}</span>
          <span className="text-debit">Out {formatINR(all.debit)}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {sectors.map((s) => {
          const t = totals(txs, { studentId: student.id, sector: s.slug });
          const Icon = SECTOR_ICON[s.slug];
          return (
            <div key={s.slug} className="tile-glossy p-3" style={tileVar(s.color)}>
              <div className="relative flex items-center gap-2">
                <span className="tile-icon size-7">
                  <Icon className="size-3.5" />
                </span>
                <span className="truncate text-xs text-muted-foreground">{s.name}</span>
              </div>
              <div className="relative mt-2 text-sm font-semibold">
                <Amount value={t.balance} />
              </div>
            </div>
          );
        })}
      </div>
      <h4 className="mt-6 mb-2 text-sm font-semibold">Recent entries</h4>
      <ul className="divide-y divide-hairline">
        {recent.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
            <div>
              <div className={t.voided ? "text-muted-foreground line-through" : "text-foreground"}>{t.title}</div>
              <div className="text-xs text-muted-foreground">
                {sectors.find((s) => s.slug === t.sector)?.name} · {formatDate(t.date)}
              </div>
            </div>
            <Amount value={t.amount} type={t.type} className={t.voided ? "opacity-40 line-through" : ""} />
          </li>
        ))}
      </ul>
    </KDrawer>
  );
}

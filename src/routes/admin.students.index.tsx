import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Download, FileText, Pencil, Phone, Plus, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Amount, Avatar, Chip, EmptyState, Field, FilterChip, PageHeader, Pager, SearchInput, TableShell } from "@/components/khazna/primitives";
import { sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { StudentFormDrawer } from "@/components/khazna/StudentFormDrawer";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, formatINR, TODAY } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { generateStudentStatementPdf } from "@/lib/khazna/pdf-report";
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
  const deleteStudent = useKhazna((s) => s.deleteStudent);
  const addStudent = useKhazna((s) => s.addStudent);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("All");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);

  const handleDelete = (s: Student) => {
    if (confirm(`Are you sure you want to remove ${s.name} (${s.id})?`)) {
      deleteStudent(s.id);
      toast.success(`${s.name} removed`, {
        action: {
          label: "Undo",
          onClick: () => addStudent(s),
        },
      });
      if (viewing?.id === s.id) setViewing(null);
    }
  };

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

      <motion.div {...reveal()} className="glass mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center w-full">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by name, Ad.No or phone…" className="lg:w-80" />
        <div className="flex flex-wrap gap-1.5">
          {["All", ...classes].map((c) => (
            <FilterChip key={c} active={cls === c} onClick={() => { setCls(c); setPage(1); }}>
              {c}
            </FilterChip>
          ))}
        </div>
      </motion.div>

      <TableShell className="w-full">
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No students match" body="Try a different name, Ad.No or class filter." />
        ) : (
          <>
            {/* Mobile Aesthetic Card Model (No horizontal side-scrolling) */}
            <div className="divide-y divide-hairline md:hidden">
              {rows.map((s, i) => {
                const b = balances.get(s.id);
                return (
                  <motion.div
                    key={s.id}
                    {...reveal(i)}
                    className="flex flex-col gap-2.5 p-3.5 transition-colors active:bg-white/5 cursor-pointer"
                    onClick={() => setViewing(s)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={s.name} size={36} />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{s.name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground num">
                            <span className="font-semibold text-primary">{s.id}</span>
                            <span>•</span>
                            <Chip className="text-[10px] py-0 px-1.5">{s.className}</Chip>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">
                          <Amount value={b?.balance ?? 0} />
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {b?.sectors.size ?? 0} sector{b?.sectors.size === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    {(s.phone || s.guardian) && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground/80 pt-1 border-t border-hairline/40">
                        <span className="truncate">c/o {s.guardian}</span>
                        {s.phone && <span className="font-mono text-[11px] num">{s.phone}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-hairline/30">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStudent(s);
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s);
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-debit hover:bg-debit/10 transition-colors"
                      >
                        <Trash2 className="size-3" /> Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Desktop Tabular Model */}
            <div className="hidden md:block overflow-x-auto">
              <table className="k-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Ad.No</th>
                    <th>Class</th>
                    <th>Phone</th>
                    <th>Sectors</th>
                    <th className="text-right">Combined balance</th>
                    <th className="text-right">Actions</th>
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
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{s.name}</span>
                                {s.updatedAt && <Chip className="text-[9px] py-0 px-1">Edited</Chip>}
                              </div>
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
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudent(s);
                              }}
                              title="Edit student"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                            >
                              <Pencil className="size-3.5" /> Edit
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(s);
                              }}
                              title="Delete student"
                              className="h-7 px-2 text-xs text-debit hover:bg-debit/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Btn>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pager page={page} pages={pages} onPage={setPage} total={filtered.length} label="students" />
      </TableShell>

      <StudentFormDrawer
        open={adding || !!editingStudent}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditingStudent(null);
          }
        }}
        student={editingStudent}
      />
      <StudentDrawer
        student={viewing}
        onClose={() => setViewing(null)}
        onEdit={(s) => setEditingStudent(s)}
        onDelete={(s) => handleDelete(s)}
      />
    </div>
  );
}



function StudentDrawer({
  student,
  onClose,
  onEdit,
  onDelete,
}: {
  student: Student | null;
  onClose: () => void;
  onEdit?: (s: Student) => void;
  onDelete?: (s: Student) => void;
}) {
  const txs = useKhazna((s) => s.transactions);
  const sectors = useKhazna((s) => s.sectors);
  const college = useKhazna((s) => s.college);
  const [downloading, setDownloading] = useState(false);

  if (!student) return <KDrawer open={false} onOpenChange={onClose} title="" children={null} />;
  const all = totals(txs, { studentId: student.id });
  const recent = txs.filter((t) => t.studentId === student.id).slice(0, 6);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const studentTxs = txs.filter((t) => t.studentId === student.id);
      const sectorMap = new Map(sectors.map((s) => [s.slug, s.name]));
      const filename = await generateStudentStatementPdf({
        collegeName: college.name,
        student,
        transactions: studentTxs,
        sectorMap,
      });
      toast.success("Statement PDF downloaded", { description: filename });
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate statement PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <KDrawer
      open={!!student}
      onOpenChange={(o) => !o && onClose()}
      title={student.name}
      description={`${student.id} · ${student.className} · joined ${formatDate(student.joined)}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2 flex-wrap">
          {onDelete && (
            <Btn
              variant="danger"
              size="sm"
              onClick={() => onDelete(student)}
            >
              <Trash2 className="size-3.5" /> Delete
            </Btn>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <Btn
              variant="glass"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
              title="Download official PDF statement"
            >
              <FileText className="size-3.5 text-primary" /> {downloading ? "Preparing…" : "Statement PDF"}
            </Btn>
            {onEdit && (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(student);
                }}
              >
                <Pencil className="size-3.5" /> Edit
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={onClose}>
              Close
            </Btn>
          </div>
        </div>
      }
    >
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
          const Icon = sectorIcon(s.slug);
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

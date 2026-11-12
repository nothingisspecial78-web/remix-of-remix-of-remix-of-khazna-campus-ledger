import { create } from "zustand";
import { AUDIT, BATCHES, CLASSES, DEFAULT_MANAGER_SECTOR, MANAGERS, ME_STUDENT_ID, NOTICES, SECTORS, STUDENTS, SUPER_ADMIN, TRANSACTIONS, managerNameFor } from "./data";
import { NOW_ISO } from "./format";
import { receiptSeries } from "./ledger";
import type { AuditAction, AuditEntry, Batch, Manager, Notice, Role, Sector, SectorSlug, Student, Tx, TxType } from "./types";

let seq = 1;
const uid = (p: string) => `${p}${Date.now().toString(36).slice(-4).toUpperCase()}${seq++}`;
const nowIso = () => new Date().toISOString();

export interface NewEntryInput {
  sector: SectorSlug;
  studentId: string;
  type: TxType;
  title: string;
  reason?: string | undefined;
  amount: number;
  date: string;
  receiptNo: string;
}

export interface BatchInput {
  sector: SectorSlug;
  studentIds: string[];
  type: TxType;
  title: string;
  reason?: string | undefined;
  amount: number;
  date: string;
  receiptPrefix: string;
  receiptStart: number;
}

interface KhaznaState {
  sectors: Sector[];
  classes: string[];
  students: Student[];
  transactions: Tx[];
  batches: Batch[];
  audit: AuditEntry[];
  managers: Manager[];
  notices: Notice[];
  meStudentId: string;
  managerSector: SectorSlug;

  setManagerSector: (s: SectorSlug) => void;
  log: (e: { actor: string; role: Role; action: AuditAction; target: string; details: string; sector?: SectorSlug | undefined }) => void;
  addEntry: (input: NewEntryInput) => Tx;
  voidEntry: (id: string, reason: string) => void;
  postBatch: (input: BatchInput) => Batch;
  voidBatch: (id: string, reason: string) => void;
  addStudent: (s: Student) => void;
  importStudents: (list: Student[]) => void;
  assignSectors: (managerId: string, sectors: SectorSlug[]) => void;
  inviteManager: (m: Omit<Manager, "id" | "status" | "lastActive">) => void;
  updateSector: (slug: SectorSlug, patch: Partial<Pick<Sector, "description" | "target" | "receiptPrefix">>) => void;
  addClass: (c: string) => void;
  removeClass: (c: string) => void;
  updatePhone: (studentId: string, phone: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useKhazna = create<KhaznaState>((set, get) => ({
  sectors: SECTORS,
  classes: CLASSES,
  students: STUDENTS,
  transactions: TRANSACTIONS,
  batches: BATCHES,
  audit: AUDIT,
  managers: MANAGERS,
  notices: NOTICES,
  meStudentId: ME_STUDENT_ID,
  managerSector: DEFAULT_MANAGER_SECTOR,

  setManagerSector: (s) => set({ managerSector: s }),

  log: (e) =>
    set((st) => ({
      audit: [{ ...e, id: uid("AU"), at: nowIso(), ip: "10.0.4.12" }, ...st.audit],
    })),

  addEntry: (input) => {
    const tx: Tx = { ...input, id: uid("TX"), createdBy: managerNameFor(input.sector) };
    set((st) => ({ transactions: [tx, ...st.transactions] }));
    const student = get().students.find((s) => s.id === input.studentId);
    get().log({
      actor: managerNameFor(input.sector),
      role: "manager",
      action: "CREATE_ENTRY",
      target: `${input.studentId} · ${student?.name ?? ""}`,
      details: `${input.type === "credit" ? "Credit" : "Debit"} ₹${input.amount.toLocaleString("en-IN")} · ${input.title} · ${input.receiptNo}`,
      sector: input.sector,
    });
    return tx;
  },

  voidEntry: (id, reason) => {
    const tx = get().transactions.find((t) => t.id === id);
    if (!tx || tx.voided) return;
    const by = managerNameFor(tx.sector);
    set((st) => ({
      transactions: st.transactions.map((t) => (t.id === id ? { ...t, voided: { reason, by, at: nowIso() } } : t)),
    }));
    get().log({ actor: by, role: "manager", action: "VOID_ENTRY", target: tx.receiptNo, details: reason, sector: tx.sector });
  },

  postBatch: (input) => {
    const id = `B-${uid("").slice(0, 6)}`;
    const receipts = receiptSeries(input.receiptPrefix, input.receiptStart, input.studentIds.length);
    const by = managerNameFor(input.sector);
    const txs: Tx[] = input.studentIds.map((sid, i) => ({
      id: uid("TX"),
      sector: input.sector,
      studentId: sid,
      type: input.type,
      title: input.title,
      reason: input.reason,
      amount: input.amount,
      date: input.date,
      receiptNo: receipts[i]!,
      batchId: id,
      createdBy: by,
    }));
    const batch: Batch = {
      id,
      sector: input.sector,
      title: input.title,
      type: input.type,
      reason: input.reason,
      amount: input.amount,
      date: input.date,
      receiptPrefix: input.receiptPrefix,
      studentIds: input.studentIds,
      createdBy: by,
      createdAt: nowIso(),
    };
    set((st) => ({ transactions: [...txs, ...st.transactions], batches: [batch, ...st.batches] }));
    get().log({
      actor: by,
      role: "manager",
      action: "BULK_POST",
      target: id,
      details: `${input.title} · ₹${input.amount.toLocaleString("en-IN")} × ${input.studentIds.length} students`,
      sector: input.sector,
    });
    return batch;
  },

  voidBatch: (id, reason) => {
    const b = get().batches.find((x) => x.id === id);
    if (!b || b.voided) return;
    const v = { reason, by: b.createdBy, at: nowIso() };
    set((st) => ({
      batches: st.batches.map((x) => (x.id === id ? { ...x, voided: v } : x)),
      transactions: st.transactions.map((t) => (t.batchId === id && !t.voided ? { ...t, voided: v } : t)),
    }));
    get().log({ actor: b.createdBy, role: "manager", action: "VOID_BATCH", target: id, details: reason, sector: b.sector });
  },

  addStudent: (s) => {
    set((st) => ({ students: [...st.students, s] }));
    get().log({ actor: SUPER_ADMIN.name, role: "admin", action: "ADD_STUDENT", target: `${s.id} · ${s.name}`, details: `Added to ${s.className}` });
  },

  importStudents: (list) => {
    set((st) => ({ students: [...st.students, ...list] }));
    get().log({ actor: SUPER_ADMIN.name, role: "admin", action: "IMPORT_STUDENTS", target: "CSV import", details: `Imported ${list.length} students` });
  },

  assignSectors: (managerId, sectors) => {
    const m = get().managers.find((x) => x.id === managerId);
    set((st) => ({ managers: st.managers.map((x) => (x.id === managerId ? { ...x, sectors } : x)) }));
    const names = get().sectors.filter((s) => sectors.includes(s.slug)).map((s) => s.name);
    get().log({ actor: SUPER_ADMIN.name, role: "admin", action: "ASSIGN_SECTOR", target: m?.name ?? managerId, details: names.length ? `Assigned ${names.join(", ")}` : "All sectors removed" });
  },

  inviteManager: (m) => {
    set((st) => ({ managers: [...st.managers, { ...m, id: uid("M"), status: "invited", lastActive: NOW_ISO }] }));
    get().log({ actor: SUPER_ADMIN.name, role: "admin", action: "INVITE_ADMIN", target: m.name, details: `Invitation sent to ${m.email}` });
  },

  updateSector: (slug, patch) => {
    set((st) => ({ sectors: st.sectors.map((s) => (s.slug === slug ? { ...s, ...patch } : s)) }));
    const s = get().sectors.find((x) => x.slug === slug);
    get().log({ actor: SUPER_ADMIN.name, role: "admin", action: "UPDATE_SECTOR", target: s?.name ?? slug, details: "Sector settings updated" });
  },

  addClass: (c) => set((st) => (st.classes.includes(c) ? st : { classes: [...st.classes, c] })),
  removeClass: (c) => set((st) => ({ classes: st.classes.filter((x) => x !== c) })),

  updatePhone: (studentId, phone) => {
    set((st) => ({ students: st.students.map((s) => (s.id === studentId ? { ...s, phone } : s)) }));
    const s = get().students.find((x) => x.id === studentId);
    get().log({ actor: s?.name ?? studentId, role: "student", action: "UPDATE_PROFILE", target: studentId, details: "Phone number updated" });
  },

  markRead: (id) => set((st) => ({ notices: st.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((st) => ({ notices: st.notices.map((n) => ({ ...n, read: true })) })),
}));

export const useSector = (slug: SectorSlug) => useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);

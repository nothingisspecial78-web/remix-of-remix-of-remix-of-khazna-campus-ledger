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

export interface College {
  name: string;
  adminName: string;
  adminEmail: string;
  password: string;
  /** true while the seeded sample college is loaded */
  demo: boolean;
}

export const DEMO_PASSWORD = "khazna@2026";
const DEMO_COLLEGE: College = { name: "Islahul Uloom", adminName: SUPER_ADMIN.name, adminEmail: SUPER_ADMIN.email, password: DEMO_PASSWORD, demo: true };

export interface NewSectorInput {
  name: string;
  description: string;
  receiptPrefix: string;
  target: number;
  color: string;
}

export type ManagerInput = Omit<Manager, "id" | "status" | "lastActive">;

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sector";

/** Name of the manager assigned to a sector, falling back to the seeded demo names. */
export const managerNameIn = (st: { managers: Manager[] }, sector: SectorSlug) => st.managers.find((m) => m.sectors.includes(sector))?.name ?? managerNameFor(sector);

interface KhaznaState {
  college: College;
  signUpCollege: (input: { college: string; name: string; email: string; password: string }) => void;
  loadDemo: () => void;
  addSector: (input: NewSectorInput) => Sector;
  addManagers: (list: ManagerInput[]) => void;
  setMeStudent: (id: string) => void;

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

const DEMO_STATE = () => ({
  college: DEMO_COLLEGE,
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
});

export const useKhazna = create<KhaznaState>((set, get) => ({
  college: DEMO_COLLEGE,
  loadDemo: () => set(DEMO_STATE()),
  signUpCollege: ({ college, name, email, password }) => {
    set({
      college: { name: college, adminName: name, adminEmail: email.trim().toLowerCase(), password, demo: false },
      sectors: [],
      classes: [],
      students: [],
      transactions: [],
      batches: [],
      audit: [],
      managers: [],
      notices: [],
      meStudentId: "",
      managerSector: "",
    });
    get().log({ actor: name, role: "admin", action: "SIGN_UP", target: college, details: "College workspace created" });
  },
  addSector: (input) => {
    const base = slugify(input.name);
    let slug = base;
    for (let n = 2; get().sectors.some((x) => x.slug === slug); n++) slug = `${base}-${n}`;
    const short = input.name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "SC";
    const sector: Sector = { slug, short, creditTitles: ["Cash Deposit"], debitTitles: [], ...input };
    set((st) => ({ sectors: [...st.sectors, sector], managerSector: st.managerSector || slug }));
    get().log({ actor: get().college.adminName, role: "admin", action: "ADD_SECTOR", target: sector.name, details: `Receipts ${sector.receiptPrefix} · target ₹${sector.target.toLocaleString("en-IN")}` });
    return sector;
  },
  addManagers: (list) => {
    if (!list.length) return;
    set((st) => ({ managers: [...st.managers, ...list.map((m) => ({ ...m, id: uid("M"), status: "active" as const, lastActive: NOW_ISO }))] }));
    get().log({
      actor: get().college.adminName,
      role: "admin",
      action: "INVITE_ADMIN",
      target: list.length === 1 ? list[0]!.name : "Manager upload",
      details: list.length === 1 ? `Added ${list[0]!.email}` : `Added ${list.length} managers`,
    });
  },
  setMeStudent: (id) => set({ meStudentId: id }),
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
    const tx: Tx = { ...input, id: uid("TX"), createdBy: managerNameIn(get(), input.sector) };
    set((st) => ({ transactions: [tx, ...st.transactions] }));
    const student = get().students.find((s) => s.id === input.studentId);
    get().log({
      actor: managerNameIn(get(), input.sector),
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
    const by = managerNameIn(get(), tx.sector);
    set((st) => ({
      transactions: st.transactions.map((t) => (t.id === id ? { ...t, voided: { reason, by, at: nowIso() } } : t)),
    }));
    get().log({ actor: by, role: "manager", action: "VOID_ENTRY", target: tx.receiptNo, details: reason, sector: tx.sector });
  },

  postBatch: (input) => {
    const id = `B-${uid("").slice(0, 6)}`;
    const receipts = receiptSeries(input.receiptPrefix, input.receiptStart, input.studentIds.length);
    const by = managerNameIn(get(), input.sector);
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
    get().log({ actor: get().college.adminName, role: "admin", action: "ADD_STUDENT", target: `${s.id} · ${s.name}`, details: `Added to ${s.className}` });
  },

  importStudents: (list) => {
    set((st) => ({ students: [...st.students, ...list], classes: [...st.classes, ...[...new Set(list.map((s) => s.className))].filter((c) => !st.classes.includes(c))] }));
    get().log({ actor: get().college.adminName, role: "admin", action: "IMPORT_STUDENTS", target: "CSV import", details: `Imported ${list.length} students` });
  },

  assignSectors: (managerId, sectors) => {
    const m = get().managers.find((x) => x.id === managerId);
    set((st) => ({ managers: st.managers.map((x) => (x.id === managerId ? { ...x, sectors } : x)) }));
    const names = get().sectors.filter((s) => sectors.includes(s.slug)).map((s) => s.name);
    get().log({ actor: get().college.adminName, role: "admin", action: "ASSIGN_SECTOR", target: m?.name ?? managerId, details: names.length ? `Assigned ${names.join(", ")}` : "All sectors removed" });
  },

  inviteManager: (m) => {
    set((st) => ({ managers: [...st.managers, { ...m, id: uid("M"), status: "invited", lastActive: NOW_ISO }] }));
    get().log({ actor: get().college.adminName, role: "admin", action: "INVITE_ADMIN", target: m.name, details: `Invitation sent to ${m.email}` });
  },

  updateSector: (slug, patch) => {
    set((st) => ({ sectors: st.sectors.map((s) => (s.slug === slug ? { ...s, ...patch } : s)) }));
    const s = get().sectors.find((x) => x.slug === slug);
    get().log({ actor: get().college.adminName, role: "admin", action: "UPDATE_SECTOR", target: s?.name ?? slug, details: "Sector settings updated" });
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

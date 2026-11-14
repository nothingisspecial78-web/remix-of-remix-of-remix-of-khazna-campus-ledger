import { create } from "zustand";
import { AUDIT, BATCHES, CLASSES, DEFAULT_MANAGER_SECTOR, MANAGERS, ME_STUDENT_ID, NOTICES, SECTORS, STUDENTS, SUPER_ADMIN, TRANSACTIONS, managerNameFor } from "./data";
import { NOW_ISO } from "./format";
import { receiptSeries } from "./ledger";
import type {
  AuditAction,
  AuditEntry,
  Batch,
  InstitutionProfile,
  Manager,
  Notice,
  ReportExport,
  Role,
  Sector,
  SectorSlug,
  Signatory,
  SignatoryRole,
  SignatureSlotConfig,
  Student,
  Tx,
  TxType,
} from "./types";

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
  id: string;
  name: string;
  adminName: string;
  adminEmail: string;
  password?: string;
  /** true while the seeded sample college is loaded */
  demo: boolean;
}

export interface OrgSummary {
  id: string;
  name: string;
  adminEmail: string;
  demo: boolean;
  createdAt: string;
}

export const DEMO_PASSWORD = "khazna@2026";
export const DEMO_ORG_ID = "demo";

const DEMO_COLLEGE: College = {
  id: DEMO_ORG_ID,
  name: "Islahul Uloom",
  adminName: SUPER_ADMIN.name,
  adminEmail: SUPER_ADMIN.email,
  password: DEMO_PASSWORD,
  demo: true,
};

export interface NewSectorInput {
  name: string;
  description: string;
  receiptPrefix: string;
  target: number;
  color: string;
}

export type ManagerInput = Omit<Manager, "id" | "status" | "lastActive">;

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sector";

export const DEFAULT_SLOTS: SignatureSlotConfig = {
  slot1: { label: "Prepared by", role: "accounts_officer" },
  slot2: { label: "Verified by (HOD)", role: "hod" },
  slot3: { label: "Approved by (Principal)", role: "principal" },
};

export const DEMO_INSTITUTION_PROFILE: InstitutionProfile = {
  name: "Islahul Uloom Arabic College",
  short_name: "IUAC",
  tagline: "Affiliated to University of Calicut · Established 1970",
  reg_no: "IUAC/REG/1970/KL",
  established_year: "1970",
  address_line1: "Islahul Uloom Campus, Post Box 12",
  address_line2: "P.O. Tanur",
  city: "Malappuram",
  district: "Malappuram",
  state: "Kerala",
  pincode: "676302",
  phone: "+91 494 242 2234",
  email: "accounts@islahululoom.edu.in",
  website: "https://islahululoom.edu.in",
  logo_path: "/apple-touch-icon.png",
  logo_version: 1,
  seal_path: "",
  seal_version: 1,
  verify_expiry: "never",
  verify_mask_names: false,
};

export const DEMO_SIGNATORIES: Signatory[] = [
  {
    id: "sig_accounts",
    org_id: DEMO_ORG_ID,
    full_name: "K. Mohammed Kutty",
    designation: "Chief Accounts Officer",
    role: "accounts_officer",
    active: true,
    signature_version: 1,
    authorised_at: "2026-11-12T00:00:00.000Z",
    authorised_by: "Abdulla K.",
  },
  {
    id: "sig_hod_fiqh",
    org_id: DEMO_ORG_ID,
    full_name: "Dr. Hamza Saqafi",
    designation: "Head of Department, Fiqh",
    role: "hod",
    sector_id: "fiqh",
    active: true,
    signature_version: 1,
    authorised_at: "2026-11-12T00:00:00.000Z",
    authorised_by: "Abdulla K.",
  },
  {
    id: "sig_hod_civil",
    org_id: DEMO_ORG_ID,
    full_name: "Anees Rahman",
    designation: "Head of Department, Civil",
    role: "hod",
    sector_id: "civil",
    active: true,
    signature_version: 1,
    authorised_at: "2026-11-12T00:00:00.000Z",
    authorised_by: "Abdulla K.",
  },
  {
    id: "sig_principal",
    org_id: DEMO_ORG_ID,
    full_name: "Prof. Sayyid Munavvar Ali",
    designation: "Principal & Head of Institution",
    role: "principal",
    active: true,
    signature_version: 1,
    authorised_at: "2026-11-12T00:00:00.000Z",
    authorised_by: "Abdulla K.",
  },
];

export function checkSignatoryUniqueness(
  signatories: Signatory[],
  candidate: { id?: string; role: SignatoryRole; sector_id?: string; class_id?: string; active: boolean }
): { valid: boolean; error?: string } {
  if (!candidate.active) return { valid: true };
  const duplicate = signatories.find(
    (s) =>
      s.active &&
      s.id !== candidate.id &&
      s.role === candidate.role &&
      (s.sector_id || "") === (candidate.sector_id || "") &&
      (s.class_id || "") === (candidate.class_id || "")
  );
  if (duplicate) {
    const scopeLabel = candidate.sector_id
      ? ` for sector "${candidate.sector_id}"`
      : candidate.class_id
        ? ` for class "${candidate.class_id}"`
        : "";
    return {
      valid: false,
      error: `An active signatory (${duplicate.full_name}) already exists for role "${candidate.role}"${scopeLabel}. Deactivate or reassign them first.`,
    };
  }
  return { valid: true };
}

export interface OrgStatePayload {
  college: College;
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
  institutionProfile: InstitutionProfile;
  signatories: Signatory[];
  signatureSlots: SignatureSlotConfig;
  reportExports: ReportExport[];
}

export const DEMO_STATE = (): OrgStatePayload => ({
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
  institutionProfile: DEMO_INSTITUTION_PROFILE,
  signatories: DEMO_SIGNATORIES,
  signatureSlots: DEFAULT_SLOTS,
  reportExports: [],
});

/** Create an isolated clean-slate dataset for a new organization (zero demo data). */
export const createEmptyOrgData = (input: { id?: string; name: string; adminName: string; adminEmail: string; password?: string }): OrgStatePayload => {
  const orgId = input.id || `org_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const cleanEmail = input.adminEmail.trim().toLowerCase();
  return {
    college: {
      id: orgId,
      name: input.name,
      adminName: input.adminName,
      adminEmail: cleanEmail,
      password: input.password || "",
      demo: false,
    },
    sectors: [],
    classes: [],
    students: [],
    transactions: [],
    batches: [],
    audit: [
      {
        id: uid("AU"),
        actor: input.adminName,
        role: "admin",
        action: "SIGN_UP",
        target: input.name,
        details: "Organization workspace initialized",
        at: nowIso(),
        ip: "127.0.0.1",
      },
    ],
    managers: [],
    notices: [
      {
        id: uid("N"),
        title: `Welcome to ${input.name}`,
        body: "Your organization workspace is ready. Start by adding sectors and importing students.",
        read: false,
        at: nowIso(),
      },
    ],
    meStudentId: "",
    managerSector: "",
    institutionProfile: {
      name: input.name,
      short_name: input.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 8)
        .toUpperCase(),
      logo_version: 1,
      seal_version: 1,
      verify_expiry: "never",
      verify_mask_names: false,
    },
    signatories: [],
    signatureSlots: DEFAULT_SLOTS,
    reportExports: [],
  };
};

// Storage keys
const STORAGE_ORGS_KEY = "khazna_organizations_v1";
const STORAGE_ACTIVE_ORG_KEY = "khazna_active_org_id_v1";
const STORAGE_CURRENT_ROLE_KEY = "khazna_current_role_v1";
const storageOrgDataKey = (id: string) => `khazna_org_data_v1_${id}`;

const loadStoredOrgs = (): OrgSummary[] => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [{ id: DEMO_ORG_ID, name: DEMO_COLLEGE.name, adminEmail: DEMO_COLLEGE.adminEmail, demo: true, createdAt: "2026-11-12T00:00:00.000Z" }];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_ORGS_KEY);
    if (!raw) {
      const initial: OrgSummary[] = [{ id: DEMO_ORG_ID, name: DEMO_COLLEGE.name, adminEmail: DEMO_COLLEGE.adminEmail, demo: true, createdAt: "2026-11-12T00:00:00.000Z" }];
      window.localStorage.setItem(STORAGE_ORGS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // fallback
  }
  return [{ id: DEMO_ORG_ID, name: DEMO_COLLEGE.name, adminEmail: DEMO_COLLEGE.adminEmail, demo: true, createdAt: "2026-11-12T00:00:00.000Z" }];
};

const saveStoredOrgs = (orgs: OrgSummary[]) => {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_ORGS_KEY, JSON.stringify(orgs));
    } catch (e) {
      console.warn("Failed to persist orgs list", e);
    }
  }
};

const loadOrgData = (id: string): OrgStatePayload => {
  if (id === DEMO_ORG_ID) return DEMO_STATE();
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(storageOrgDataKey(id));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.college) {
          if (!parsed.institutionProfile) {
            parsed.institutionProfile = {
              name: parsed.college.name || "Organization",
              logo_version: 1,
              seal_version: 1,
              verify_expiry: "never",
              verify_mask_names: false,
            };
          }
          if (!parsed.signatories) parsed.signatories = [];
          if (!parsed.signatureSlots) parsed.signatureSlots = DEFAULT_SLOTS;
          if (!parsed.reportExports) parsed.reportExports = [];
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Failed to read stored data for org ${id}`, e);
    }
  }
  return createEmptyOrgData({ id, name: "Organization", adminName: "Admin", adminEmail: "admin@college.edu" });
};

const saveOrgData = (data: OrgStatePayload) => {
  if (typeof window !== "undefined" && window.localStorage && data.college?.id) {
    try {
      window.localStorage.setItem(storageOrgDataKey(data.college.id), JSON.stringify(data));
      window.localStorage.setItem(STORAGE_ACTIVE_ORG_KEY, data.college.id);
    } catch (e) {
      console.warn(`Failed to persist data for org ${data.college.id}`, e);
    }
  }
};

export const managerNameIn = (st: { managers: Manager[] }, sector: SectorSlug) => st.managers.find((m) => m.sectors.includes(sector))?.name ?? managerNameFor(sector);

interface KhaznaState extends OrgStatePayload {
  // Role & Session
  currentRole: Role;
  setCurrentRole: (r: Role) => void;

  // Multi-organization management
  organizations: OrgSummary[];
  activeOrgId: string;
  switchOrg: (id: string) => void;
  createOrg: (input: { name: string; adminName: string; adminEmail: string; password?: string }) => College;
  deleteOrg: (id: string) => void;

  signUpCollege: (input: { college: string; name: string; email: string; password: string }) => void;
  loadDemo: () => void;
  addSector: (input: NewSectorInput) => Sector;
  addManagers: (list: ManagerInput[]) => void;
  setMeStudent: (id: string) => void;
  setManagerSector: (s: SectorSlug) => void;
  log: (e: { actor: string; role: Role; action: AuditAction; target: string; details: string; sector?: SectorSlug | undefined }) => void;
  addEntry: (input: NewEntryInput) => Tx;
  voidEntry: (id: string, reason: string) => void;
  postBatch: (input: BatchInput) => Batch;
  voidBatch: (id: string, reason: string) => void;
  editBatch: (id: string, patch: { title?: string; date?: string }) => void;
  deleteBatch: (id: string) => void;
  addStudent: (s: Student) => void;
  editStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  importStudents: (list: Student[]) => void;
  assignSectors: (managerId: string, sectors: SectorSlug[]) => void;
  inviteManager: (m: Omit<Manager, "id" | "status" | "lastActive">) => void;
  editManager: (id: string, patch: Partial<Manager>) => void;
  deleteManager: (id: string) => void;
  toggleManagerStatus: (id: string) => void;
  updateSector: (slug: SectorSlug, patch: Partial<Pick<Sector, "description" | "target" | "receiptPrefix">>) => void;
  addClass: (c: string) => void;
  editClass: (oldName: string, newName: string) => void;
  removeClass: (c: string) => void;
  editEntry: (id: string, patch: Partial<NewEntryInput>) => void;
  deleteEntry: (id: string) => void;
  updatePhone: (studentId: string, phone: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;

  // Institution Profile, Signatories & Reports (Part A & C)
  updateInstitutionProfile: (patch: Partial<InstitutionProfile>) => void;
  addSignatory: (sig: Omit<Signatory, "id" | "org_id" | "updated_at">) => { success: boolean; error?: string };
  editSignatory: (id: string, patch: Partial<Signatory>) => { success: boolean; error?: string };
  deleteSignatory: (id: string) => void;
  toggleSignatoryActive: (id: string) => { success: boolean; error?: string };
  updateSignatureSlots: (slots: SignatureSlotConfig) => void;
  createReportExport: (exp: ReportExport) => void;
  revokeReportExport: (id: string, reason: string) => void;
  extendReportExport: (id: string, newExpiry: string) => void;
}

// Initial hydration
const initialOrgs = loadStoredOrgs();
const initialActiveOrgId = (typeof window !== "undefined" && window.localStorage?.getItem(STORAGE_ACTIVE_ORG_KEY)) || DEMO_ORG_ID;
const initialRole = (typeof window !== "undefined" && (window.localStorage?.getItem(STORAGE_CURRENT_ROLE_KEY) as Role)) || "manager";
const initialData = loadOrgData(initialActiveOrgId);

export const useKhazna = create<KhaznaState>((set, get) => {
  // Helper to persist current org state automatically
  const persist = (patch?: Partial<OrgStatePayload>) => {
    const cur = get();
    const data: OrgStatePayload = {
      college: patch?.college ?? cur.college,
      sectors: patch?.sectors ?? cur.sectors,
      classes: patch?.classes ?? cur.classes,
      students: patch?.students ?? cur.students,
      transactions: patch?.transactions ?? cur.transactions,
      batches: patch?.batches ?? cur.batches,
      audit: patch?.audit ?? cur.audit,
      managers: patch?.managers ?? cur.managers,
      notices: patch?.notices ?? cur.notices,
      meStudentId: patch?.meStudentId ?? cur.meStudentId,
      managerSector: patch?.managerSector ?? cur.managerSector,
      institutionProfile: patch?.institutionProfile ?? cur.institutionProfile,
      signatories: patch?.signatories ?? cur.signatories,
      signatureSlots: patch?.signatureSlots ?? cur.signatureSlots,
      reportExports: patch?.reportExports ?? cur.reportExports,
    };
    saveOrgData(data);
  };

  return {
    ...initialData,
    organizations: initialOrgs,
    activeOrgId: initialData.college.id,
    currentRole: initialRole,

    setCurrentRole: (r: Role) => {
      set({ currentRole: r });
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_CURRENT_ROLE_KEY, r);
        } catch {}
      }
    },

    switchOrg: (id: string) => {
      // Save current state first
      persist();
      const nextData = loadOrgData(id);
      set({
        ...nextData,
        activeOrgId: id,
      });
      saveOrgData(nextData);
    },

    createOrg: (input) => {
      // Save current state first
      persist();
      const newOrgData = createEmptyOrgData(input);
      const newSummary: OrgSummary = {
        id: newOrgData.college.id,
        name: newOrgData.college.name,
        adminEmail: newOrgData.college.adminEmail,
        demo: false,
        createdAt: nowIso(),
      };
      const updatedOrgs = [...get().organizations.filter((o) => o.id !== newSummary.id), newSummary];
      saveStoredOrgs(updatedOrgs);
      saveOrgData(newOrgData);
      set({
        ...newOrgData,
        organizations: updatedOrgs,
        activeOrgId: newOrgData.college.id,
      });
      return newOrgData.college;
    },

    deleteOrg: (id: string) => {
      if (id === DEMO_ORG_ID) return; // Prevent deleting demo
      const remainingOrgs = get().organizations.filter((o) => o.id !== id);
      saveStoredOrgs(remainingOrgs);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(storageOrgDataKey(id));
      }
      set({ organizations: remainingOrgs });
      if (get().activeOrgId === id) {
        get().switchOrg(DEMO_ORG_ID);
      }
    },

    loadDemo: () => {
      get().switchOrg(DEMO_ORG_ID);
    },

    signUpCollege: ({ college, name, email, password }) => {
      get().createOrg({ name: college, adminName: name, adminEmail: email, password });
    },

    addSector: (input) => {
      const base = slugify(input.name);
      let slug = base;
      for (let n = 2; get().sectors.some((x) => x.slug === slug); n++) slug = `${base}-${n}`;
      const short = input.name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "SC";
      const sector: Sector = { slug, short, creditTitles: ["Cash Deposit"], debitTitles: [], ...input };
      const nextSectors = [...get().sectors, sector];
      const nextManagerSector = get().managerSector || slug;
      set({ sectors: nextSectors, managerSector: nextManagerSector });
      get().log({ actor: get().college.adminName, role: "admin", action: "ADD_SECTOR", target: sector.name, details: `Receipts ${sector.receiptPrefix} · target ₹${sector.target.toLocaleString("en-IN")}` });
      persist({ sectors: nextSectors, managerSector: nextManagerSector });
      return sector;
    },

    addManagers: (list) => {
      if (!list.length) return;
      const nextManagers = [...get().managers, ...list.map((m) => ({ ...m, id: uid("M"), status: "active" as const, lastActive: NOW_ISO }))];
      set({ managers: nextManagers });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "INVITE_ADMIN",
        target: list.length === 1 ? list[0]!.name : "Manager upload",
        details: list.length === 1 ? `Added ${list[0]!.email}` : `Added ${list.length} managers`,
      });
      persist({ managers: nextManagers });
    },

    setMeStudent: (id) => {
      set({ meStudentId: id });
      persist({ meStudentId: id });
    },

    setManagerSector: (s) => {
      set({ managerSector: s });
      persist({ managerSector: s });
    },

    log: (e) => {
      const nextAudit = [{ ...e, id: uid("AU"), at: nowIso(), ip: "10.0.4.12" }, ...get().audit];
      set({ audit: nextAudit });
      persist({ audit: nextAudit });
    },

    addEntry: (input) => {
      const tx: Tx = { ...input, id: uid("TX"), createdBy: managerNameIn(get(), input.sector) };
      const nextTxs = [tx, ...get().transactions];
      set({ transactions: nextTxs });
      const student = get().students.find((s) => s.id === input.studentId);
      get().log({
        actor: managerNameIn(get(), input.sector),
        role: "manager",
        action: "CREATE_ENTRY",
        target: `${input.studentId} · ${student?.name ?? ""}`,
        details: `${input.type === "credit" ? "Credit" : "Debit"} ₹${input.amount.toLocaleString("en-IN")} · ${input.title} · ${input.receiptNo}`,
        sector: input.sector,
      });
      persist({ transactions: nextTxs });
      return tx;
    },

    voidEntry: (id, reason) => {
      const tx = get().transactions.find((t) => t.id === id);
      if (!tx || tx.voided) return;
      const by = managerNameIn(get(), tx.sector);
      const nextTxs = get().transactions.map((t) => (t.id === id ? { ...t, voided: { reason, by, at: nowIso() } } : t));
      set({ transactions: nextTxs });
      get().log({ actor: by, role: "manager", action: "VOID_ENTRY", target: tx.receiptNo, details: reason, sector: tx.sector });
      persist({ transactions: nextTxs });
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
      const nextTxs = [...txs, ...get().transactions];
      const nextBatches = [batch, ...get().batches];
      set({ transactions: nextTxs, batches: nextBatches });
      get().log({
        actor: by,
        role: "manager",
        action: "BULK_POST",
        target: id,
        details: `${input.title} · ₹${input.amount.toLocaleString("en-IN")} × ${input.studentIds.length} students`,
        sector: input.sector,
      });
      persist({ transactions: nextTxs, batches: nextBatches });
      return batch;
    },

    voidBatch: (id, reason) => {
      const b = get().batches.find((x) => x.id === id);
      if (!b || b.voided) return;
      const v = { reason, by: b.createdBy, at: nowIso() };
      const nextBatches = get().batches.map((x) => (x.id === id ? { ...x, voided: v } : x));
      const nextTxs = get().transactions.map((t) => (t.batchId === id && !t.voided ? { ...t, voided: v } : t));
      set({ batches: nextBatches, transactions: nextTxs });
      get().log({ actor: b.createdBy, role: "manager", action: "VOID_BATCH", target: id, details: reason, sector: b.sector });
      persist({ batches: nextBatches, transactions: nextTxs });
    },

    editBatch: (id, patch) => {
      const b = get().batches.find((x) => x.id === id);
      if (!b) return;
      const updated: Batch = {
        ...b,
        ...(patch.title ? { title: patch.title.trim() } : {}),
        ...(patch.date ? { date: patch.date } : {}),
        updatedAt: nowIso(),
        updatedBy: b.createdBy,
      };
      const nextBatches = get().batches.map((x) => (x.id === id ? updated : x));
      const nextTxs = get().transactions.map((t) => {
        if (t.batchId === id) {
          return {
            ...t,
            ...(patch.title ? { title: patch.title.trim() } : {}),
            ...(patch.date ? { date: patch.date } : {}),
            updatedAt: nowIso(),
            updatedBy: b.createdBy,
          };
        }
        return t;
      });
      set({ batches: nextBatches, transactions: nextTxs });
      get().log({
        actor: b.createdBy,
        role: "manager",
        action: "EDIT_BATCH",
        target: id,
        details: `Updated batch ${id}: ${patch.title ?? b.title}`,
        sector: b.sector,
      });
      persist({ batches: nextBatches, transactions: nextTxs });
    },

    deleteBatch: (id) => {
      const b = get().batches.find((x) => x.id === id);
      if (!b) return;
      const nextBatches = get().batches.filter((x) => x.id !== id);
      const nextTxs = get().transactions.filter((t) => t.batchId !== id);
      set({ batches: nextBatches, transactions: nextTxs });
      get().log({
        actor: b.createdBy,
        role: "manager",
        action: "DELETE_BATCH",
        target: id,
        details: `Deleted batch ${id} and reversed ${b.studentIds.length} entries`,
        sector: b.sector,
      });
      persist({ batches: nextBatches, transactions: nextTxs });
    },

    addStudent: (s) => {
      const nextStudents = [...get().students, s];
      set({ students: nextStudents });
      get().log({ actor: get().college.adminName, role: "admin", action: "ADD_STUDENT", target: `${s.id} · ${s.name}`, details: `Added to ${s.className}` });
      persist({ students: nextStudents });
    },

    editStudent: (id, patch) => {
      const s = get().students.find((x) => x.id === id);
      if (!s) return;
      const updated: Student = {
        ...s,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: get().college.adminName,
      };
      const nextStudents = get().students.map((x) => (x.id === id ? updated : x));
      set({ students: nextStudents });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EDIT_STUDENT",
        target: `${updated.id} · ${updated.name}`,
        details: `Updated details: ${Object.keys(patch).join(", ")}`,
      });
      persist({ students: nextStudents });
    },

    deleteStudent: (id) => {
      const s = get().students.find((x) => x.id === id);
      if (!s) return;
      const nextStudents = get().students.filter((x) => x.id !== id);
      set({ students: nextStudents });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "DELETE_STUDENT",
        target: `${s.id} · ${s.name}`,
        details: `Removed student from ${s.className}`,
      });
      persist({ students: nextStudents });
    },

    editEntry: (id, patch) => {
      const tx = get().transactions.find((t) => t.id === id);
      if (!tx) return;
      const actor = managerNameIn(get(), patch.sector ?? tx.sector);
      const updated: Tx = {
        ...tx,
        ...patch,
        updatedAt: nowIso(),
        updatedBy: actor,
      };
      const nextTxs = get().transactions.map((t) => (t.id === id ? updated : t));
      set({ transactions: nextTxs });
      get().log({
        actor,
        role: "manager",
        action: "EDIT_ENTRY",
        target: updated.receiptNo,
        details: `Updated entry: ${updated.title} · ${updated.type} ₹${updated.amount.toLocaleString("en-IN")}`,
        sector: updated.sector,
      });
      persist({ transactions: nextTxs });
    },

    deleteEntry: (id) => {
      const tx = get().transactions.find((t) => t.id === id);
      if (!tx) return;
      const actor = managerNameIn(get(), tx.sector);
      const nextTxs = get().transactions.filter((t) => t.id !== id);
      set({ transactions: nextTxs });
      get().log({
        actor,
        role: "manager",
        action: "DELETE_ENTRY",
        target: tx.receiptNo,
        details: `Deleted entry: ${tx.title} · ₹${tx.amount.toLocaleString("en-IN")}`,
        sector: tx.sector,
      });
      persist({ transactions: nextTxs });
    },

    importStudents: (list) => {
      const nextStudents = [...get().students, ...list];
      const nextClasses = [...get().classes, ...[...new Set(list.map((s) => s.className))].filter((c) => !get().classes.includes(c))];
      set({ students: nextStudents, classes: nextClasses });
      get().log({ actor: get().college.adminName, role: "admin", action: "IMPORT_STUDENTS", target: "CSV import", details: `Imported ${list.length} students` });
      persist({ students: nextStudents, classes: nextClasses });
    },

    assignSectors: (managerId, sectors) => {
      const m = get().managers.find((x) => x.id === managerId);
      const nextManagers = get().managers.map((x) => (x.id === managerId ? { ...x, sectors } : x));
      set({ managers: nextManagers });
      const names = get().sectors.filter((s) => sectors.includes(s.slug)).map((s) => s.name);
      get().log({ actor: get().college.adminName, role: "admin", action: "ASSIGN_SECTOR", target: m?.name ?? managerId, details: names.length ? `Assigned ${names.join(", ")}` : "All sectors removed" });
      persist({ managers: nextManagers });
    },

    inviteManager: (m) => {
      const nextManagers = [...get().managers, { ...m, id: uid("M"), status: "invited", lastActive: NOW_ISO }];
      set({ managers: nextManagers });
      get().log({ actor: get().college.adminName, role: "admin", action: "INVITE_ADMIN", target: m.name, details: `Invitation sent to ${m.email}` });
      persist({ managers: nextManagers });
    },

    editManager: (id, patch) => {
      const m = get().managers.find((x) => x.id === id);
      if (!m) return;
      const updated: Manager = { ...m, ...patch };
      const nextManagers = get().managers.map((x) => (x.id === id ? updated : x));
      set({ managers: nextManagers });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EDIT_ADMIN",
        target: updated.name,
        details: `Updated manager details for ${updated.email}`,
      });
      persist({ managers: nextManagers });
    },

    deleteManager: (id) => {
      const m = get().managers.find((x) => x.id === id);
      if (!m) return;
      const nextManagers = get().managers.filter((x) => x.id !== id);
      set({ managers: nextManagers });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "DELETE_ADMIN",
        target: m.name,
        details: `Removed manager ${m.email}`,
      });
      persist({ managers: nextManagers });
    },

    toggleManagerStatus: (id) => {
      const m = get().managers.find((x) => x.id === id);
      if (!m) return;
      const newStatus = m.status === "active" ? "inactive" : "active";
      const updated: Manager = { ...m, status: newStatus };
      const nextManagers = get().managers.map((x) => (x.id === id ? updated : x));
      set({ managers: nextManagers });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EDIT_ADMIN",
        target: m.name,
        details: `Status changed to ${newStatus}`,
      });
      persist({ managers: nextManagers });
    },

    updateSector: (slug, patch) => {
      const nextSectors = get().sectors.map((s) => (s.slug === slug ? { ...s, ...patch } : s));
      set({ sectors: nextSectors });
      const s = get().sectors.find((x) => x.slug === slug);
      get().log({ actor: get().college.adminName, role: "admin", action: "UPDATE_SECTOR", target: s?.name ?? slug, details: "Sector settings updated" });
      persist({ sectors: nextSectors });
    },

    addClass: (c) => {
      if (get().classes.includes(c)) return;
      const nextClasses = [...get().classes, c];
      set({ classes: nextClasses });
      persist({ classes: nextClasses });
    },

    editClass: (oldName, newName) => {
      if (!newName.trim() || oldName === newName) return;
      const nextClasses = get().classes.map((c) => (c === oldName ? newName.trim() : c));
      const nextStudents = get().students.map((s) => (s.className === oldName ? { ...s, className: newName.trim() } : s));
      set({ classes: nextClasses, students: nextStudents });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EDIT_CLASS",
        target: `${oldName} → ${newName}`,
        details: `Renamed class and updated students`,
      });
      persist({ classes: nextClasses, students: nextStudents });
    },

    removeClass: (c) => {
      const nextClasses = get().classes.filter((x) => x !== c);
      set({ classes: nextClasses });
      persist({ classes: nextClasses });
    },

    updatePhone: (studentId, phone) => {
      const nextStudents = get().students.map((s) => (s.id === studentId ? { ...s, phone } : s));
      set({ students: nextStudents });
      const s = get().students.find((x) => x.id === studentId);
      get().log({ actor: s?.name ?? studentId, role: "student", action: "UPDATE_PROFILE", target: studentId, details: "Phone number updated" });
      persist({ students: nextStudents });
    },

    markRead: (id) => {
      const nextNotices = get().notices.map((n) => (n.id === id ? { ...n, read: true } : n));
      set({ notices: nextNotices });
      persist({ notices: nextNotices });
    },

    markAllRead: () => {
      const nextNotices = get().notices.map((n) => ({ ...n, read: true }));
      set({ notices: nextNotices });
      persist({ notices: nextNotices });
    },

    updateInstitutionProfile: (patch) => {
      const cur = get().institutionProfile;
      const nextProfile: InstitutionProfile = {
        ...cur,
        ...patch,
        updated_at: nowIso(),
        updated_by: get().college.adminName,
      };
      set({ institutionProfile: nextProfile });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "UPDATE_INSTITUTION_PROFILE",
        target: nextProfile.name,
        details: "Institution profile updated",
      });
      persist({ institutionProfile: nextProfile });
    },

    addSignatory: (sig) => {
      const check = checkSignatoryUniqueness(get().signatories, sig);
      if (!check.valid) {
        return { success: false, error: check.error };
      }
      const newSig: Signatory = {
        ...sig,
        id: uid("SIG_"),
        org_id: get().college.id,
        signature_version: 1,
        updated_at: nowIso(),
        updated_by: get().college.adminName,
      };
      const nextSignatories = [...get().signatories, newSig];
      set({ signatories: nextSignatories });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "ADD_SIGNATORY",
        target: `${newSig.full_name} (${newSig.role})`,
        details: `Added signatory ${newSig.designation}`,
      });
      persist({ signatories: nextSignatories });
      return { success: true };
    },

    editSignatory: (id, patch) => {
      const cur = get().signatories.find((s) => s.id === id);
      if (!cur) return { success: false, error: "Signatory not found" };

      const candidate = {
        id,
        role: patch.role ?? cur.role,
        sector_id: patch.sector_id !== undefined ? patch.sector_id : cur.sector_id,
        class_id: patch.class_id !== undefined ? patch.class_id : cur.class_id,
        active: patch.active !== undefined ? patch.active : cur.active,
      };
      const check = checkSignatoryUniqueness(get().signatories, candidate);
      if (!check.valid) {
        return { success: false, error: check.error };
      }

      const nextSignatories = get().signatories.map((s) => {
        if (s.id !== id) return s;
        const sigVersion =
          patch.signature_path && patch.signature_path !== s.signature_path
            ? s.signature_version + 1
            : s.signature_version;
        return {
          ...s,
          ...patch,
          signature_version: sigVersion,
          updated_at: nowIso(),
          updated_by: get().college.adminName,
        };
      });
      set({ signatories: nextSignatories });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EDIT_SIGNATORY",
        target: cur.full_name,
        details: `Updated signatory details`,
      });
      persist({ signatories: nextSignatories });
      return { success: true };
    },

    deleteSignatory: (id) => {
      const cur = get().signatories.find((s) => s.id === id);
      const nextSignatories = get().signatories.filter((s) => s.id !== id);
      set({ signatories: nextSignatories });
      if (cur) {
        get().log({
          actor: get().college.adminName,
          role: "admin",
          action: "DELETE_SIGNATORY",
          target: cur.full_name,
          details: `Deleted signatory ${cur.designation}`,
        });
      }
      persist({ signatories: nextSignatories });
    },

    toggleSignatoryActive: (id) => {
      const cur = get().signatories.find((s) => s.id === id);
      if (!cur) return { success: false, error: "Signatory not found" };

      const targetActive = !cur.active;
      if (targetActive) {
        const check = checkSignatoryUniqueness(get().signatories, {
          id,
          role: cur.role,
          sector_id: cur.sector_id,
          class_id: cur.class_id,
          active: true,
        });
        if (!check.valid) {
          return { success: false, error: check.error };
        }
      }

      const nextSignatories = get().signatories.map((s) =>
        s.id === id ? { ...s, active: targetActive, updated_at: nowIso(), updated_by: get().college.adminName } : s
      );
      set({ signatories: nextSignatories });
      persist({ signatories: nextSignatories });
      return { success: true };
    },

    updateSignatureSlots: (slots) => {
      set({ signatureSlots: slots });
      persist({ signatureSlots: slots });
    },

    createReportExport: (exp) => {
      const nextExports = [exp, ...get().reportExports.filter((r) => r.id !== exp.id)];
      set({ reportExports: nextExports });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EXPORT",
        target: exp.ref,
        details: `Issued verified report for ${exp.sector_id} (${exp.mode}) with QR verification`,
      });
      persist({ reportExports: nextExports });
    },

    revokeReportExport: (id, reason) => {
      const exp = get().reportExports.find((r) => r.id === id || r.token === id || r.ref === id);
      if (!exp) return;
      const nextExports = get().reportExports.map((r) =>
        r.id === exp.id
          ? { ...r, revoked_at: nowIso(), revoked_by: get().college.adminName }
          : r
      );
      set({ reportExports: nextExports });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "REVOKE_REPORT",
        target: exp.ref,
        details: `Revoked report QR verification. Reason: ${reason || "Revoked by admin"}`,
      });
      persist({ reportExports: nextExports });
    },

    extendReportExport: (id, newExpiry) => {
      const nextExports = get().reportExports.map((r) =>
        r.id === id ? { ...r, expires_at: newExpiry } : r
      );
      set({ reportExports: nextExports });
      get().log({
        actor: get().college.adminName,
        role: "admin",
        action: "EXTEND_REPORT",
        target: id,
        details: `Extended report expiry to ${newExpiry}`,
      });
      persist({ reportExports: nextExports });
    },
  };
});

export const useSector = (slug: SectorSlug) => useKhazna((s) => s.sectors.find((x) => x.slug === slug)!);

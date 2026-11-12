export type SectorSlug = "office" | "ihsan-union" | "velitcham-welfare" | "dept-fiqh" | "dept-civil";
export type TxType = "credit" | "debit";
export type Role = "admin" | "manager" | "student";

export interface Sector {
  slug: SectorSlug;
  name: string;
  short: string;
  description: string;
  /** CSS custom property holding the sector color, e.g. var(--sector-office) */
  color: string;
  receiptPrefix: string;
  target: number;
  creditTitles: string[];
  debitTitles: string[];
}

export interface Student {
  id: string; // Ad.No e.g. S0125
  name: string;
  className: string;
  phone: string;
  guardian: string;
  joined: string; // YYYY-MM-DD
}

export interface VoidInfo {
  reason: string;
  by: string;
  at: string;
}

export interface Tx {
  id: string;
  sector: SectorSlug;
  studentId: string;
  type: TxType;
  title: string;
  reason?: string | undefined;
  amount: number;
  date: string; // YYYY-MM-DD
  receiptNo: string;
  batchId?: string | undefined;
  createdBy: string;
  voided?: VoidInfo | undefined;
}

export interface Batch {
  id: string;
  sector: SectorSlug;
  title: string;
  type: TxType;
  reason?: string | undefined;
  amount: number;
  date: string;
  receiptPrefix: string;
  studentIds: string[];
  createdBy: string;
  createdAt: string;
  voided?: VoidInfo | undefined;
}

export type AuditAction =
  | "LOGIN"
  | "CREATE_ENTRY"
  | "VOID_ENTRY"
  | "BULK_POST"
  | "VOID_BATCH"
  | "ADD_STUDENT"
  | "IMPORT_STUDENTS"
  | "ASSIGN_SECTOR"
  | "INVITE_ADMIN"
  | "UPDATE_SECTOR"
  | "UPDATE_PROFILE"
  | "EXPORT";

export interface AuditEntry {
  id: string;
  at: string; // ISO datetime
  actor: string;
  role: Role;
  action: AuditAction;
  target: string;
  details: string;
  sector?: SectorSlug | undefined;
  ip: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  sectors: SectorSlug[];
  status: "active" | "invited";
  lastActive: string;
}

export interface Notice {
  id: string;
  kind: "credit" | "debit" | "info" | "due";
  title: string;
  body: string;
  at: string;
  read: boolean;
  sector?: SectorSlug | undefined;
}

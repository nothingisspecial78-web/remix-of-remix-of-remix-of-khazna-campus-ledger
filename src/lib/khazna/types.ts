/** Sector id — seeded demo sectors use fixed slugs; sectors a new college adds get generated ones. */
export type SectorSlug = string;
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
  status?: "active" | "inactive" | undefined;
  updatedAt?: string | undefined;
  updatedBy?: string | undefined;
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
  updatedAt?: string | undefined;
  updatedBy?: string | undefined;
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
  updatedAt?: string | undefined;
  updatedBy?: string | undefined;
}

export type AuditAction =
  | "LOGIN"
  | "CREATE_ENTRY"
  | "EDIT_ENTRY"
  | "VOID_ENTRY"
  | "DELETE_ENTRY"
  | "BULK_POST"
  | "EDIT_BATCH"
  | "VOID_BATCH"
  | "DELETE_BATCH"
  | "ADD_STUDENT"
  | "EDIT_STUDENT"
  | "DELETE_STUDENT"
  | "IMPORT_STUDENTS"
  | "ASSIGN_SECTOR"
  | "INVITE_ADMIN"
  | "EDIT_ADMIN"
  | "DELETE_ADMIN"
  | "UPDATE_SECTOR"
  | "UPDATE_PROFILE"
  | "ADD_SECTOR"
  | "EDIT_CLASS"
  | "DELETE_CLASS"
  | "SIGN_UP"
  | "EXPORT"
  | "UPDATE_INSTITUTION_PROFILE"
  | "ADD_SIGNATORY"
  | "EDIT_SIGNATORY"
  | "DELETE_SIGNATORY"
  | "REVOKE_REPORT"
  | "EXTEND_REPORT";

export interface InstitutionProfile {
  name: string;
  short_name?: string;
  tagline?: string;
  reg_no?: string;
  established_year?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_path?: string;
  logo_version: number;
  seal_path?: string;
  seal_version: number;
  verify_expiry: "never" | "1y" | "90d";
  verify_mask_names: boolean;
  updated_by?: string;
  updated_at?: string;
}

export type SignatoryRole =
  | "principal"
  | "accounts_officer"
  | "hod"
  | "sector_manager"
  | "class_teacher"
  | "other";

export interface Signatory {
  id: string;
  org_id: string;
  full_name: string;
  designation: string;
  role: SignatoryRole;
  sector_id?: string;
  class_id?: string;
  signature_path?: string;
  signature_version: number;
  active: boolean;
  authorised_at?: string;
  authorised_by?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface SignatureSlotConfig {
  slot1: { label: string; role: SignatoryRole };
  slot2: { label: string; role: SignatoryRole };
  slot3: { label: string; role: SignatoryRole };
}

export interface ReportExport {
  id: string;
  org_id: string;
  sector_id: string;
  class_id?: string | null;
  ref: string;
  token: string;
  storage_path: string;
  sha256: string;
  mode: "debit" | "credit" | "all";
  period_from: string;
  period_to: string;
  student_count: number;
  totals: {
    credit: number;
    debit: number;
    net: number;
  };
  names_masked: boolean;
  pdf_base64?: string; // Cache data URL for instant client offline access / preview
  generated_by: string;
  generated_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  view_count: number;
  last_viewed_at?: string | null;
}

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
  status: "active" | "invited" | "inactive";
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

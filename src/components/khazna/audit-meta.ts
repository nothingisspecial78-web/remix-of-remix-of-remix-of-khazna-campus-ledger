import { ArrowDownLeft, Ban, Building2, FileDown, Layers, LogIn, Upload, UserPlus, Users, type LucideIcon } from "lucide-react";
import type { AuditAction } from "@/lib/khazna/types";

export const AUDIT_ICON: Record<AuditAction, LucideIcon> = {
  LOGIN: LogIn,
  CREATE_ENTRY: ArrowDownLeft,
  VOID_ENTRY: Ban,
  BULK_POST: Layers,
  VOID_BATCH: Ban,
  ADD_STUDENT: UserPlus,
  IMPORT_STUDENTS: Upload,
  ASSIGN_SECTOR: Users,
  INVITE_ADMIN: UserPlus,
  UPDATE_SECTOR: Layers,
  UPDATE_PROFILE: Users,
  EXPORT: FileDown,
  ADD_SECTOR: Layers,
  SIGN_UP: Building2,
};

export const auditTone = (a: AuditAction): "debit" | "credit" | "neutral" | "info" =>
  a.startsWith("VOID") ? "debit" : a === "BULK_POST" || a === "CREATE_ENTRY" ? "credit" : a === "LOGIN" || a === "EXPORT" ? "neutral" : "info";

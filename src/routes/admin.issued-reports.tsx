import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MoreVertical,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Field, GlassCard, PageHeader } from "@/components/khazna/primitives";
import { formatPdfDateWithYear } from "@/lib/khazna/pdf-report";
import { useKhazna } from "@/lib/khazna/store";
import type { ReportExport } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/issued-reports")({
  beforeLoad: () => {
    const role = useKhazna.getState().currentRole;
    if (role !== "admin") {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [
      { title: "Issued Reports — Khazna" },
      { name: "description", content: "Audit and verify all officially issued reports and QR codes." },
    ],
  }),
  component: IssuedReportsPage,
});

function IssuedReportsPage() {
  const reports = useKhazna((s) => s.reportExports);
  const sectors = useKhazna((s) => s.sectors);
  const classes = useKhazna((s) => s.classes);
  const revokeReport = useKhazna((s) => s.revokeReportExport);
  const extendReport = useKhazna((s) => s.extendReportExport);

  // Filters
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "revoked">("all");

  // Revoke modal
  const [revokeTarget, setRevokeTarget] = useState<ReportExport | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Extend modal
  const [extendTarget, setExtendTarget] = useState<ReportExport | null>(null);
  const [extendChoice, setExtendChoice] = useState<"never" | "30d" | "1y">("30d");

  const filteredReports = useMemo(() => {
    const now = new Date().getTime();
    return reports.filter((rep) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesRef = rep.ref.toLowerCase().includes(q);
        const matchesSec = rep.sector_id.toLowerCase().includes(q);
        const matchesGen = rep.generated_by.toLowerCase().includes(q);
        if (!matchesRef && !matchesSec && !matchesGen) return false;
      }
      if (sectorFilter !== "all" && rep.sector_id !== sectorFilter) return false;
      if (classFilter !== "all" && rep.class_id !== classFilter) return false;

      const isRevoked = !!rep.revoked_at;
      const isExpired = rep.expires_at ? new Date(rep.expires_at).getTime() < now : false;
      const isActive = !isRevoked && !isExpired;

      if (statusFilter === "revoked" && !isRevoked) return false;
      if (statusFilter === "expired" && (!isExpired || isRevoked)) return false;
      if (statusFilter === "active" && !isActive) return false;

      return true;
    });
  }, [reports, search, sectorFilter, classFilter, statusFilter]);

  const handleCopyLink = (token: string, ref: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/v/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(`Verification link copied for ${ref}`);
  };

  const handleConfirmRevoke = () => {
    if (!revokeTarget) return;
    revokeReport(revokeTarget.id, revokeReason.trim() || "Revoked by Super Admin");
    toast.success(`Report ${revokeTarget.ref} revoked. QR code deactivated immediately.`);
    setRevokeTarget(null);
    setRevokeReason("");
  };

  const handleConfirmExtend = () => {
    if (!extendTarget) return;
    let newExpiry: string | null = null;
    if (extendChoice === "30d") {
      newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (extendChoice === "1y") {
      newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    extendReport(extendTarget.id, newExpiry || "");
    toast.success(`Report ${extendTarget.ref} expiry updated`);
    setExtendTarget(null);
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow="Overview"
        title="Issued Reports & Verification"
        description="Every officially exported statement is recorded as an immutable snapshot with public QR verification and instant revocation safety valve."
      />

      {/* Filter and Search Bar */}
      <GlassCard className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, sector, author..."
              className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-3 py-2 text-xs outline-none focus:border-primary"
            />
          </div>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All Sectors</option>
            {sectors.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-input bg-background/50 px-3 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (QR Working)</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked (Safety Valve)</option>
          </select>
        </div>
      </GlassCard>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-2">
          <QrCode className="mx-auto size-10 text-muted-foreground/50" />
          <h4 className="text-sm font-semibold text-foreground">No Issued Reports Found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {reports.length === 0
              ? "Reports exported from the Class Reports page with QR verification enabled will appear here automatically."
              : "No reports match your current filter criteria."}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((rep) => {
            const now = Date.now();
            const isRevoked = !!rep.revoked_at;
            const isExpired = rep.expires_at ? new Date(rep.expires_at).getTime() < now : false;
            const isActive = !isRevoked && !isExpired;

            return (
              <GlassCard key={rep.id} className="p-5 transition hover:shadow-lg">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-bold tracking-tight text-primary">
                        {rep.ref}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> Active QR
                        </span>
                      )}
                      {isRevoked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600">
                          <Ban className="size-3" /> Revoked
                        </span>
                      )}
                      {isExpired && !isRevoked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600">
                          <Clock className="size-3" /> Expired
                        </span>
                      )}
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase font-semibold text-muted-foreground">
                        {rep.mode} statement
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Sector: <strong className="text-foreground">{rep.sector_id}</strong>
                      </span>
                      <span>
                        Class: <strong className="text-foreground">{rep.class_id || "All Classes"}</strong>
                      </span>
                      <span>
                        Period:{" "}
                        <strong className="text-foreground">
                          {formatPdfDateWithYear(rep.period_from)} – {formatPdfDateWithYear(rep.period_to)}
                        </strong>
                      </span>
                      <span>
                        Students: <strong className="text-foreground">{rep.student_count}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle">
                      <span>Generated by {rep.generated_by} · {new Date(rep.generated_at).toLocaleString("en-IN")}</span>
                      <span>Views: <strong className="text-foreground">{rep.view_count}</strong></span>
                      {rep.last_viewed_at && (
                        <span>Last scanned: {new Date(rep.last_viewed_at).toLocaleDateString("en-IN")}</span>
                      )}
                      <span className="font-mono">
                        SHA-256: <span className="text-muted-foreground">{rep.sha256.slice(0, 8)}...</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-hairline lg:border-t-0 lg:pt-0">
                    <a
                      href={`/v/${rep.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition"
                    >
                      <Eye className="size-3.5 text-primary" /> Open View
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(rep.token, rep.ref)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition"
                    >
                      <Copy className="size-3.5" /> Copy Link
                    </button>

                    {!isRevoked && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevokeTarget(rep);
                          setRevokeReason("");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                      >
                        <Ban className="size-3.5" /> Revoke
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setExtendTarget(rep);
                        setExtendChoice("30d");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition"
                    >
                      <Clock className="size-3.5" /> Expiry
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* REVOKE CONFIRMATION MODAL */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="glass-strong max-w-md w-full space-y-4 rounded-3xl border border-white/60 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="size-6" />
              <h3 className="text-base font-bold text-foreground">Revoke Official Report</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Revoking <strong className="text-foreground">{revokeTarget.ref}</strong> will immediately deactivate its QR verification code. Anyone scanning the QR code on printed copies will see the plain "This document is not available" screen.
            </p>
            <Field label="Revocation Reason (Recorded in Audit Log) *">
              <input
                type="text"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Issued with outdated fee revision"
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-rose-500"
              />
            </Field>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setRevokeTarget(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={handleConfirmRevoke}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Revocation
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND EXPIRY MODAL */}
      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="glass-strong max-w-md w-full space-y-4 rounded-3xl border border-white/60 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-primary">
              <Clock className="size-6" />
              <h3 className="text-base font-bold text-foreground">Adjust Verification Expiry</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Modify the retention and verification period for report{" "}
              <strong className="text-foreground">{extendTarget.ref}</strong>.
            </p>
            <Field label="Select New Expiry">
              <select
                value={extendChoice}
                onChange={(e) => setExtendChoice(e.target.value as any)}
                className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="30d">Extend by 30 days</option>
                <option value="1y">Extend by 1 year</option>
                <option value="never">Never expire (Permanent)</option>
              </select>
            </Field>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setExtendTarget(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={handleConfirmExtend}>
                Save Expiry
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

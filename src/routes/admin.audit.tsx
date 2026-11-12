import { createFileRoute } from "@tanstack/react-router";
import { Download, Lock, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AUDIT_ICON, auditTone } from "@/components/khazna/audit-meta";
import { Btn } from "@/components/khazna/btn";
import { Chip, EmptyState, PageHeader, Pager, SearchInput, TableShell } from "@/components/khazna/primitives";
import { downloadCSV } from "@/lib/khazna/download";
import { formatDate, formatTime, TODAY } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { AuditAction, Role } from "@/lib/khazna/types";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Khazna" },
      { name: "description", content: "Append-only record of every entry, void, import and access change in Khazna." },
      { property: "og:title", content: "Audit Log — Khazna" },
      { property: "og:description", content: "Append-only record of every change in Khazna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

const ACTIONS: AuditAction[] = ["LOGIN", "CREATE_ENTRY", "VOID_ENTRY", "BULK_POST", "VOID_BATCH", "ADD_STUDENT", "IMPORT_STUDENTS", "ASSIGN_SECTOR", "INVITE_ADMIN", "UPDATE_SECTOR", "UPDATE_PROFILE", "EXPORT"];
const ROLE_LABEL: Record<Role, string> = { admin: "Super Admin", manager: "Manager", student: "Student" };
const PER_PAGE = 12;

function AuditPage() {
  const audit = useKhazna((s) => s.audit);
  const sectors = useKhazna((s) => s.sectors);
  const [q, setQ] = useState("");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [role, setRole] = useState<Role | "all">("all");
  const [sector, setSector] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return audit.filter(
      (a) =>
        (action === "all" || a.action === action) &&
        (role === "all" || a.role === role) &&
        (sector === "all" || a.sector === sector) &&
        (!term || `${a.actor} ${a.target} ${a.details}`.toLowerCase().includes(term)),
    );
  }, [audit, q, action, role, sector]);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Audit log"
        description="Every action is recorded here permanently. Entries can't be edited or deleted — not even by the Super Admin."
        actions={
          <Btn
            variant="glass"
            onClick={() => {
              downloadCSV(`khazna-audit-${TODAY}.csv`, [["Time", "Actor", "Role", "Action", "Target", "Details", "Sector", "IP"], ...filtered.map((a) => [a.at, a.actor, a.role, a.action, a.target, a.details, a.sector ?? "", a.ip])]);
              toast.success(`Exported ${filtered.length} audit records`);
            }}
          >
            <Download /> Export
          </Btn>
        }
      />

      <div className="glass mb-4 grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto]">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search actor, target or details…" />
        <select className="k-input xl:w-48" value={action} onChange={(e) => { setAction(e.target.value as AuditAction | "all"); setPage(1); }}>
          <option value="all">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>
        <select className="k-input xl:w-40" value={role} onChange={(e) => { setRole(e.target.value as Role | "all"); setPage(1); }}>
          <option value="all">All roles</option>
          <option value="admin">Super Admin</option>
          <option value="manager">Manager</option>
          <option value="student">Student</option>
        </select>
        <select className="k-input xl:w-44" value={sector} onChange={(e) => { setSector(e.target.value); setPage(1); }}>
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5 text-credit" /> Append-only · tamper-evident · {audit.length} records
      </div>

      <TableShell>
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No records match these filters" />
        ) : (
          <table className="k-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
                <th>Sector</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const Icon = AUDIT_ICON[a.action];
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="text-foreground num">{formatDate(a.at)}</div>
                      <div className="text-xs text-subtle num">{formatTime(a.at)}</div>
                    </td>
                    <td>
                      <div className="text-foreground">{a.actor}</div>
                      <div className="text-xs text-muted-foreground">{ROLE_LABEL[a.role]}</div>
                    </td>
                    <td>
                      <Chip tone={auditTone(a.action)} icon={Icon}>
                        {a.action.replace(/_/g, " ")}
                      </Chip>
                    </td>
                    <td className="text-foreground">{a.target}</td>
                    <td className="max-w-xs truncate text-muted-foreground">{a.details}</td>
                    <td className="text-muted-foreground">{sectors.find((s) => s.slug === a.sector)?.name ?? "—"}</td>
                    <td className="font-mono text-xs text-subtle">{a.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pager page={page} pages={pages} onPage={setPage} total={filtered.length} label="records" />
      </TableShell>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Clock, Download, FileSpreadsheet, Mail, Pencil, Phone, Plus, Settings2, ShieldCheck, Trash2, UploadCloud, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Avatar, Chip, Field, PageHeader } from "@/components/khazna/primitives";
import { sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { timeAgo } from "@/lib/khazna/format";
import { downloadCSV, parseCSV } from "@/lib/khazna/download";
import { useKhazna } from "@/lib/khazna/store";
import type { Manager, SectorSlug } from "@/lib/khazna/types";
import type { ManagerInput } from "@/lib/khazna/store";
import { cn } from "@/lib/utils";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [
      { title: "Admins & Sector Managers — Khazna" },
      { name: "description", content: "Invite sector managers and assign which Islahul Uloom sectors each one can post to." },
      { property: "og:title", content: "Admins & Sector Managers — Khazna" },
      { property: "og:description", content: "Invite managers and assign sector access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminsPage,
});

function AdminsPage() {
  const managers = useKhazna((s) => s.managers);
  const sectors = useKhazna((s) => s.sectors);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [inviting, setInviting] = useState(false);
  const [bulk, setBulk] = useState(false);
  const college = useKhazna((s) => s.college);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Admins & sector managers"
        description="Managers can only post and void entries in the sectors assigned to them."
        actions={
          <>
            <Btn variant="glass" onClick={() => setBulk(true)}>
              <UploadCloud /> Bulk upload
            </Btn>
            <Btn variant="primary" onClick={() => setInviting(true)}>
              <UserPlus /> Add manager
            </Btn>
          </>
        }
      />

      <motion.div {...reveal()} className="glass mb-6 flex items-center gap-4 p-4">
        <div className="grid size-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-foreground">{college.adminName} · Super Admin</div>
          <div className="text-xs text-muted-foreground">Full access to every sector, student and audit record. Cannot be reassigned from here.</div>
        </div>
        <Chip tone="primary">Owner</Chip>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 w-full">
        {managers.map((m, i) => (
          <motion.div key={m.id} {...reveal(i)} className="glass hover-lift flex flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar name={m.name} size={46} />
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background", m.status === "active" ? "bg-credit" : "bg-primary")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{m.name}</div>
                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="size-3" /> {m.email}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground num">
                  <Phone className="size-3" /> {m.phone}
                </div>
              </div>
              {m.status === "active" ? (
                <Chip tone="credit">Active</Chip>
              ) : m.status === "inactive" ? (
                <Chip tone="neutral">Inactive</Chip>
              ) : (
                <Chip tone="primary">Invited</Chip>
              )}
            </div>
            <div className="mt-4 flex min-h-[2rem] flex-wrap gap-1.5">
              {m.sectors.length === 0 && <span className="text-xs text-subtle">No sectors assigned</span>}
              {m.sectors.map((slug) => {
                const s = sectors.find((x) => x.slug === slug);
                if (!s) return null;
                const Icon = sectorIcon(slug);
                return (
                  <span key={slug} className="inline-flex items-center gap-1.5 rounded-full border border-tile bg-tile-soft px-2.5 py-1 text-xs text-foreground" style={tileVar(s.color)}>
                    <Icon className="size-3 text-tile" /> {s.name}
                  </span>
                );
              })}
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-hairline pt-4">
              <span className="flex items-center gap-1 text-xs text-subtle">
                <Clock className="size-3" /> {m.status === "invited" ? "Invite pending" : `Active ${timeAgo(m.lastActive)}`}
              </span>
              <Btn variant="soft" size="sm" onClick={() => setEditing(m)}>
                <Pencil className="size-3.5" /> Edit details
              </Btn>
            </div>
          </motion.div>
        ))}
        <button onClick={() => setInviting(true)} className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-6" />
          <span className="text-sm font-medium">{managers.length ? "Add another manager" : "Add your first manager"}</span>
        </button>
      </div>

      <EditManagerDrawer manager={editing} onClose={() => setEditing(null)} />
      <InviteDrawer open={inviting} onOpenChange={setInviting} />
      <BulkManagersDrawer open={bulk} onOpenChange={setBulk} />
    </div>
  );
}

function SectorPicker({ value, onChange }: { value: SectorSlug[]; onChange: (v: SectorSlug[]) => void }) {
  const sectors = useKhazna((s) => s.sectors);
  return (
    <div className="space-y-2">
      {sectors.map((s) => {
        const on = value.includes(s.slug);
        const Icon = sectorIcon(s.slug);
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== s.slug) : [...value, s.slug])}
            className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", on ? "tile-glossy" : "border-hairline bg-accent hover:bg-muted")}
            style={tileVar(s.color)}
          >
            <span className="tile-icon relative size-9">
              <Icon className="size-4" />
            </span>
            <span className="relative flex-1">
              <span className="block text-sm font-medium text-foreground">{s.name}</span>
              <span className="block text-xs text-muted-foreground">{s.description}</span>
            </span>
            <span className={cn("relative grid size-5 place-items-center rounded-md border", on ? "border-tile bg-tile text-primary-foreground" : "border-glass-border")}>{on && <Check className="size-3.5" />}</span>
          </button>
        );
      })}
    </div>
  );
}

function EditManagerDrawer({ manager, onClose }: { manager: Manager | null; onClose: () => void }) {
  const assign = useKhazna((s) => s.assignSectors);
  const editManager = useKhazna((s) => s.editManager);
  const deleteManager = useKhazna((s) => s.deleteManager);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "invited">("active");
  const [sel, setSel] = useState<SectorSlug[]>([]);
  const [forId, setForId] = useState<string | null>(null);

  if (manager && forId !== manager.id) {
    setForId(manager.id);
    setName(manager.name);
    setEmail(manager.email);
    setPhone(manager.phone);
    setStatus(manager.status);
    setSel(manager.sectors);
  }

  const handleSave = () => {
    if (!manager) return;
    if (!name.trim()) {
      toast.error("Please enter a manager name.");
      return;
    }
    editManager(manager.id, {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
    });
    assign(manager.id, sel);
    toast.success("Manager details and access updated");
    onClose();
    setForId(null);
  };

  const handleDelete = () => {
    if (!manager) return;
    deleteManager(manager.id);
    toast.success(`Removed manager ${manager.name}`);
    onClose();
    setForId(null);
  };

  return (
    <KDrawer
      open={!!manager}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setForId(null);
        }
      }}
      title={manager ? `Edit Manager · ${manager.name}` : "Edit Manager"}
      description="Update manager profile, status, and sector permissions."
      footer={
        <div className="flex w-full items-center justify-between">
          <Btn variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="size-3.5" /> Remove
          </Btn>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleSave}>
              <Check /> Save Changes
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-subtle">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-glass-border bg-accent/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-subtle">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-glass-border bg-accent/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-subtle">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-glass-border bg-accent/40 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-subtle">Account Status</label>
          <div className="flex rounded-xl border border-glass-border bg-accent/40 p-1 gap-1">
            {(["active", "inactive", "invited"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all",
                  status === st ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-subtle">Assigned Sector Ledgers</label>
          <SectorPicker value={sel} onChange={setSel} />
        </div>
      </div>
    </KDrawer>
  );
}

function InviteDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addManagers = useKhazna((s) => s.addManagers);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [sel, setSel] = useState<SectorSlug[]>([]);
  const [touched, setTouched] = useState(false);
  const errors = {
    name: form.name.trim().length < 3 ? "Enter a name" : "",
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? "Enter a valid email" : "",
    sectors: sel.length === 0 ? "Pick at least one sector" : "",
  };
  const ok = !errors.name && !errors.email && !errors.sectors;
  return (
    <KDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add a sector manager"
      description="They sign in with this email and only see the sectors you assign."
      footer={
        <>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (!ok) return;
              addManagers([{ name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone || "—", sectors: sel }]);
              toast.success(`${form.name.trim()} added`, { description: "They can now sign in with this email." });
              setForm({ name: "", email: "", phone: "" });
              setSel([]);
              setTouched(false);
              onOpenChange(false);
            }}
          >
            <Check /> Add manager
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required error={touched ? errors.name : ""}>
          <input className="k-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ustad Nizar Hudawi" />
        </Field>
        <Field label="Email" required error={touched ? errors.email : ""}>
          <input className="k-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@islahululoom.edu.in" />
        </Field>
        <Field label="Phone">
          <input className="k-input num" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} />
        </Field>
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Sectors <span className="text-primary">*</span>
          </div>
          <SectorPicker value={sel} onChange={setSel} />
          {touched && errors.sectors && <div className="mt-1 text-xs text-debit">{errors.sectors}</div>}
        </div>
      </div>
    </KDrawer>
  );
}

const MANAGER_TEMPLATE_HEADERS = ["Name", "Email", "Phone Number", "Sectors"];

function BulkManagersDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const sectors = useKhazna((s) => s.sectors);
  const managers = useKhazna((s) => s.managers);
  const addManagers = useKhazna((s) => s.addManagers);
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<{ m: ManagerInput; errors: string[] }[]>([]);

  const template = () =>
    downloadCSV("managers-template.csv", [
      MANAGER_TEMPLATE_HEADERS,
      ["Ustad Nizar Hudawi", "nizar@college.edu", "9847000001", sectors.slice(0, 2).map((s) => s.name).join("; ") || "Office"],
    ]);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    f.text().then((text) => {
      const { headers, rows: raw } = parseCSV(text);
      const col = (re: RegExp) => headers.findIndex((h) => re.test(h.toLowerCase()));
      const [ni, ei, pi, si] = [col(/name/), col(/mail/), col(/phone|mobile/), col(/sector/)];
      if (ni < 0 || ei < 0) {
        toast.error("The file needs Name and Email columns", { description: "Download the template to see the format." });
        return;
      }
      const seen = new Set<string>();
      setFile(f.name);
      setRows(
        raw.map((r) => {
          const email = (r[ei] ?? "").toLowerCase();
          const wanted = (si >= 0 ? (r[si] ?? "") : "").split(/[;|]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
          const matched = sectors.filter((s) => wanted.includes(s.name.toLowerCase()) || wanted.includes(s.slug));
          const errors: string[] = [];
          if ((r[ni] ?? "").length < 3) errors.push("Name missing");
          if (!/^\S+@\S+\.\S+$/.test(email)) errors.push("Bad email");
          else if (managers.some((m) => m.email.toLowerCase() === email) || seen.has(email)) errors.push("Email already added");
          if (matched.length < wanted.length) errors.push("Unknown sector");
          seen.add(email);
          return { m: { name: r[ni] ?? "", email, phone: (pi >= 0 && r[pi]) || "—", sectors: matched.map((s) => s.slug) }, errors };
        }),
      );
    });
  };

  const valid = rows.filter((r) => r.errors.length === 0);
  const close = () => {
    setRows([]);
    setFile("");
    onOpenChange(false);
  };

  return (
    <KDrawer
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title="Bulk upload managers"
      description="Fill the template in Excel or Google Sheets, save as CSV and upload it here."
      footer={
        <>
          <Btn variant="ghost" onClick={close}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={valid.length === 0}
            onClick={() => {
              addManagers(valid.map((r) => r.m));
              toast.success(`${valid.length} manager${valid.length === 1 ? "" : "s"} added`);
              close();
            }}
          >
            <Check /> Add {valid.length || ""} manager{valid.length === 1 ? "" : "s"}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <div className="glass-inset flex items-center justify-between gap-3 p-3">
          <div className="text-sm">
            <div className="font-medium text-foreground">Template</div>
            <div className="text-xs text-muted-foreground">Name, Email, Phone Number (optional), Sectors separated by “;”</div>
          </div>
          <Btn variant="soft" size="sm" onClick={template}>
            <Download /> Download
          </Btn>
        </div>
        {sectors.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Sector names you can use: <span className="text-foreground">{sectors.map((s) => s.name).join(", ")}</span>
          </div>
        )}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border p-6 text-center text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <UploadCloud className="size-6" />
          <span className="text-sm font-medium">{file || "Choose a CSV file"}</span>
          <input type="file" accept=".csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2 text-xs">
              <Chip tone="credit">{valid.length} ready</Chip>
              {rows.length - valid.length > 0 && <Chip tone="debit">{rows.length - valid.length} with problems</Chip>}
            </div>
            {rows.map((r, i) => (
              <div key={i} className="glass-inset flex items-center gap-3 p-2.5 text-sm">
                <FileSpreadsheet className={cn("size-4 shrink-0", r.errors.length ? "text-debit" : "text-credit")} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{r.m.name || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.m.email}</div>
                </div>
                <span className={cn("text-xs", r.errors.length ? "text-debit" : "text-muted-foreground")}>{r.errors.length ? r.errors.join(", ") : `${r.m.sectors.length} sector${r.m.sectors.length === 1 ? "" : "s"}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </KDrawer>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Clock, Mail, Phone, Plus, Settings2, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Avatar, Chip, Field, PageHeader } from "@/components/khazna/primitives";
import { SECTOR_ICON, tileVar } from "@/components/khazna/sector-meta";
import { timeAgo } from "@/lib/khazna/format";
import { useKhazna } from "@/lib/khazna/store";
import type { Manager, SectorSlug } from "@/lib/khazna/types";
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

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Admins & sector managers"
        description="Managers can only post and void entries in the sectors assigned to them."
        actions={
          <Btn variant="primary" onClick={() => setInviting(true)}>
            <UserPlus /> Invite manager
          </Btn>
        }
      />

      <motion.div {...reveal()} className="glass mb-6 flex items-center gap-4 p-4">
        <div className="grid size-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <ShieldCheck className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-foreground">Abdulla K. · Super Admin</div>
          <div className="text-xs text-muted-foreground">Full access to every sector, student and audit record. Cannot be reassigned from here.</div>
        </div>
        <Chip tone="primary">Owner</Chip>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              {m.status === "active" ? <Chip tone="credit">Active</Chip> : <Chip tone="primary">Invited</Chip>}
            </div>
            <div className="mt-4 flex min-h-[2rem] flex-wrap gap-1.5">
              {m.sectors.length === 0 && <span className="text-xs text-subtle">No sectors assigned</span>}
              {m.sectors.map((slug) => {
                const s = sectors.find((x) => x.slug === slug)!;
                const Icon = SECTOR_ICON[slug];
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
                <Settings2 /> Assign sectors
              </Btn>
            </div>
          </motion.div>
        ))}
        <button onClick={() => setInviting(true)} className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-6" />
          <span className="text-sm font-medium">Invite another manager</span>
        </button>
      </div>

      <AssignDrawer manager={editing} onClose={() => setEditing(null)} />
      <InviteDrawer open={inviting} onOpenChange={setInviting} />
    </div>
  );
}

function SectorPicker({ value, onChange }: { value: SectorSlug[]; onChange: (v: SectorSlug[]) => void }) {
  const sectors = useKhazna((s) => s.sectors);
  return (
    <div className="space-y-2">
      {sectors.map((s) => {
        const on = value.includes(s.slug);
        const Icon = SECTOR_ICON[s.slug];
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

function AssignDrawer({ manager, onClose }: { manager: Manager | null; onClose: () => void }) {
  const assign = useKhazna((s) => s.assignSectors);
  const [sel, setSel] = useState<SectorSlug[]>([]);
  const [forId, setForId] = useState<string | null>(null);
  if (manager && forId !== manager.id) {
    setForId(manager.id);
    setSel(manager.sectors);
  }
  return (
    <KDrawer
      open={!!manager}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setForId(null);
        }
      }}
      title={manager ? `Sector access · ${manager.name}` : "Sector access"}
      description="Changes are written to the audit log."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              if (!manager) return;
              assign(manager.id, sel);
              toast.success("Sector access updated", { description: `${manager.name} · ${sel.length} sector${sel.length === 1 ? "" : "s"}` });
              onClose();
              setForId(null);
            }}
          >
            <Check /> Save access
          </Btn>
        </>
      }
    >
      <SectorPicker value={sel} onChange={setSel} />
    </KDrawer>
  );
}

function InviteDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useKhazna((s) => s.inviteManager);
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
      title="Invite a sector manager"
      description="They'll receive an email to set their password."
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
              invite({ name: form.name.trim(), email: form.email, phone: form.phone || "—", sectors: sel });
              toast.success(`Invite sent to ${form.email}`);
              setForm({ name: "", email: "", phone: "" });
              setSel([]);
              setTouched(false);
              onOpenChange(false);
            }}
          >
            <Mail /> Send invite
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

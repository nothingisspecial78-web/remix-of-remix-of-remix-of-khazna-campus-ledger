import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, GraduationCap, Pencil, Plus, Save, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { KDrawer } from "@/components/khazna/overlays";
import { Amount, Avatar, Field, GlassCard, PageHeader } from "@/components/khazna/primitives";
import { SECTOR_COLOR_CHOICES, sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { formatCompactINR } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import { cn } from "@/lib/utils";
import type { Sector } from "@/lib/khazna/types";
import { reveal } from "@/components/khazna/motion";

export const Route = createFileRoute("/admin/sectors")({
  head: () => ({
    meta: [
      { title: "Sectors & Classes — Khazna" },
      { name: "description", content: "Create and manage your college's finance sectors, targets and class list." },
      { property: "og:title", content: "Sectors & Classes — Khazna" },
      { property: "og:description", content: "Manage finance sectors, targets and classes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SectorsPage,
});

function SectorsPage() {
  const sectors = useKhazna((s) => s.sectors);
  const txs = useKhazna((s) => s.transactions);
  const managers = useKhazna((s) => s.managers);
  const students = useKhazna((s) => s.students);
  const classes = useKhazna((s) => s.classes);
  const addClass = useKhazna((s) => s.addClass);
  const removeClass = useKhazna((s) => s.removeClass);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [newClass, setNewClass] = useState("");
  const [adding, setAdding] = useState(false);

  const classCounts = useMemo(() => {
    const m = new Map<string, number>();
    students.forEach((s) => m.set(s.className, (m.get(s.className) ?? 0) + 1));
    return m;
  }, [students]);

  return (
    <div>
      <PageHeader
        eyebrow="Structure"
        title="Sectors & classes"
        description="Each sector keeps its own ledger, receipt series and collection target."
        actions={
          <Btn variant="primary" onClick={() => setAdding(true)}>
            <Plus /> Add sector
          </Btn>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 w-full">
        {sectors.map((s, i) => {
          const t = totals(txs, { sector: s.slug });
          const p = Math.min(1, t.credit / s.target);
          const Icon = sectorIcon(s.slug);
          const mgrs = managers.filter((m) => m.sectors.includes(s.slug));
          return (
            <motion.div key={s.slug} {...reveal(i)} className="glass hover-lift overflow-hidden" style={tileVar(s.color)}>
              <div className="tile-glossy rounded-none border-0 border-b p-5">
                <div className="relative flex items-start justify-between">
                  <span className="tile-icon size-12">
                    <Icon className="size-5" />
                  </span>
                  <Btn variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                    <Pencil />
                  </Btn>
                </div>
                <div className="relative mt-4 font-display text-xl font-semibold">{s.name}</div>
                <div className="relative text-xs text-muted-foreground">{s.description}</div>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="glass-inset p-2">
                    <div className="text-[10px] uppercase text-subtle">Balance</div>
                    <div className="text-sm font-semibold">
                      <Amount value={t.balance} />
                    </div>
                  </div>
                  <div className="glass-inset p-2">
                    <div className="text-[10px] uppercase text-subtle">Entries</div>
                    <div className="text-sm font-semibold num">{t.count}</div>
                  </div>
                  <div className="glass-inset p-2">
                    <div className="text-[10px] uppercase text-subtle">Receipts</div>
                    <div className="text-sm font-semibold num">{s.receiptPrefix}</div>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Target {formatCompactINR(s.target)}</span>
                    <span className="text-tile num">{Math.round(p * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent">
                    <motion.div className="h-full rounded-full bg-tile" initial={{ width: 0 }} viewport={{ once: true, margin: "-30px" }} whileInView={{ width: `${p * 100}%` }} transition={{ duration: 1, delay: 0.2 }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {mgrs.map((m) => (
                      <Avatar key={m.id} name={m.name} size={26} className="border-2 border-background" />
                    ))}
                  </div>
                  <span className="truncate text-xs text-muted-foreground">{mgrs.map((m) => m.name).join(", ") || "No manager"}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        <button onClick={() => setAdding(true)} className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-glass-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
          <Plus className="size-6" />
          <span className="text-sm font-medium">{sectors.length ? "Add another sector" : "Add your first sector"}</span>
          <span className="text-xs text-subtle">e.g. Office, Students' Union, a department</span>
        </button>
      </div>

      <GlassCard className="mt-8 p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <GraduationCap className="size-4 text-primary" /> Classes
            </h3>
            <p className="text-sm text-muted-foreground">Used for filters, bulk entry and class-wise reports.</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const c = newClass.trim();
              if (!c) return;
              if (classes.includes(c)) {
                toast.error(`${c} already exists`);
                return;
              }
              addClass(c);
              setNewClass("");
              toast.success(`Class ${c} added`);
            }}
          >
            <input className="k-input w-48" placeholder="e.g. Civil 3" value={newClass} onChange={(e) => setNewClass(e.target.value)} />
            <Btn variant="soft" type="submit">
              <Plus /> Add
            </Btn>
          </form>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {classes.map((c) => {
            const n = classCounts.get(c) ?? 0;
            return (
              <div key={c} className="glass-inset group flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{c}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground num">
                    <Users className="size-3" /> {n} students
                  </div>
                </div>
                <button
                  className="rounded-md p-1 text-subtle opacity-0 transition-opacity hover:text-debit group-hover:opacity-100"
                  aria-label={`Remove ${c}`}
                  onClick={() => {
                    if (n > 0) {
                      toast.error(`Move ${n} students out of ${c} first`);
                      return;
                    }
                    removeClass(c);
                    toast(`Class ${c} removed`);
                  }}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <AddSectorDrawer open={adding} onOpenChange={setAdding} />
      <EditSectorDrawer sector={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditSectorDrawer({ sector, onClose }: { sector: Sector | null; onClose: () => void }) {
  const update = useKhazna((s) => s.updateSector);
  const [form, setForm] = useState({ description: "", target: "", receiptPrefix: "" });
  const [forSlug, setForSlug] = useState<string | null>(null);
  if (sector && forSlug !== sector.slug) {
    setForSlug(sector.slug);
    setForm({ description: sector.description, target: String(sector.target), receiptPrefix: sector.receiptPrefix });
  }
  const close = () => {
    onClose();
    setForSlug(null);
  };
  return (
    <KDrawer
      open={!!sector}
      onOpenChange={(o) => !o && close()}
      title={sector ? `Edit ${sector.name}` : "Edit sector"}
      footer={
        <>
          <Btn variant="ghost" onClick={close}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              if (!sector) return;
              const target = Number(form.target);
              if (!target || target < 1000) {
                toast.error("Target must be at least ₹1,000");
                return;
              }
              update(sector.slug, { description: form.description, target, receiptPrefix: form.receiptPrefix.toUpperCase() });
              toast.success(`${sector.name} updated`);
              close();
            }}
          >
            <Save /> Save changes
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Description">
          <textarea className="k-input h-24 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Term collection target (₹)">
          <input className="k-input num" inputMode="numeric" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Receipt prefix" hint="Used for single entries, e.g. OF-1042">
          <input className="k-input num" value={form.receiptPrefix} onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })} />
        </Field>
      </div>
    </KDrawer>
  );
}

function AddSectorDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addSector = useKhazna((s) => s.addSector);
  const sectors = useKhazna((s) => s.sectors);
  const empty = { name: "", description: "", target: "", receiptPrefix: "", color: SECTOR_COLOR_CHOICES[0]!.value };
  const [form, setForm] = useState(empty);
  const [touched, setTouched] = useState(false);
  const errors = {
    name: form.name.trim().length < 2 ? "Enter a sector name" : sectors.some((s) => s.name.toLowerCase() === form.name.trim().toLowerCase()) ? "A sector with this name exists" : "",
    target: Number(form.target) < 1000 ? "Target must be at least ₹1,000" : "",
  };
  const ok = !errors.name && !errors.target;
  const autoPrefix = form.name.trim().split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 3).toUpperCase();
  return (
    <KDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Add a sector"
      description="A sector has its own ledger, receipts and manager."
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
              const prefix = (form.receiptPrefix.trim() || `${autoPrefix}-`).toUpperCase();
              const s = addSector({ name: form.name.trim(), description: form.description.trim() || `${form.name.trim()} ledger`, target: Number(form.target), receiptPrefix: prefix, color: form.color });
              toast.success(`${s.name} created`, { description: "Next, add a manager for it on the Admins page." });
              setForm(empty);
              setTouched(false);
              onOpenChange(false);
            }}
          >
            <Check /> Create sector
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Sector name" required error={touched ? errors.name : ""}>
          <input className="k-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Students' Union" />
        </Field>
        <Field label="Description">
          <textarea className="k-input h-20 py-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this sector collects for" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Term target (₹)" required error={touched ? errors.target : ""}>
            <input className="k-input num" inputMode="numeric" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 250000" />
          </Field>
          <Field label="Receipt prefix">
            <input className="k-input num" value={form.receiptPrefix} onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })} placeholder={autoPrefix ? `${autoPrefix}-` : "SU-"} />
          </Field>
        </div>
        <Field label="Colour">
          <div className="flex gap-2">
            {SECTOR_COLOR_CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                onClick={() => setForm({ ...form, color: c.value })}
                className={cn("grid size-9 place-items-center rounded-full bg-tile text-primary-foreground ring-offset-2 ring-offset-background transition-all", form.color === c.value && "ring-2 ring-tile")}
                style={tileVar(c.value)}
              >
                {form.color === c.value && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </KDrawer>
  );
}

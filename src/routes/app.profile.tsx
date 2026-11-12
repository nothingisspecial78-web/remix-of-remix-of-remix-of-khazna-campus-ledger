import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, KeyRound, Pencil, Phone, ShieldCheck, Wallet, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { SectorTile } from "@/components/khazna/SectorTile";
import { Avatar, Chip, Field, GlassCard, PageHeader } from "@/components/khazna/primitives";
import { formatDate, formatINR } from "@/lib/khazna/format";
import { totals } from "@/lib/khazna/ledger";
import { useKhazna } from "@/lib/khazna/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Khazna Student Portal" },
      { name: "description", content: "Your Islahul Uloom student details, phone number and password." },
      { property: "og:title", content: "My Profile — Khazna Student Portal" },
      { property: "og:description", content: "Student details, phone and password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function ProfilePage() {
  const me = useKhazna((s) => s.students.find((x) => x.id === s.meStudentId)!);
  const updatePhone = useKhazna((s) => s.updatePhone);
  const txs = useKhazna((s) => s.transactions);
  const sectors = useKhazna((s) => s.sectors);
  const perSector = useMemo(() => sectors.map((sec) => ({ sector: sec, t: totals(txs, { studentId: me.id, sector: sec.slug }) })), [txs, sectors, me.id]);
  const combined = useMemo(() => totals(txs, { studentId: me.id }), [txs, me.id]);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(me.phone);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwTouched, setPwTouched] = useState(false);
  const sc = strength(pw.next);
  const pwErr = {
    current: pw.current.length < 6 ? "Enter your current password" : "",
    next: sc < 3 ? "Use 8+ characters with a capital, a number or a symbol" : "",
    confirm: pw.confirm !== pw.next ? "Passwords don't match" : "",
  };

  const rows: [string, string][] = [
    ["Admission No", me.id],
    ["Class", me.className],
    ["Guardian", me.guardian],
    ["Joined", formatDate(me.joined)],
  ];

  return (
    <div>
      <PageHeader eyebrow="Account" title="My profile" />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <GlassCard className="p-6 text-center">
          <div className="mx-auto w-fit rounded-full bg-gradient-primary p-1 shadow-glow">
            <Avatar name={me.name} size={96} className="border-4 border-background" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{me.name}</h2>
          <div className="mt-1 flex justify-center gap-2">
            <Chip tone="primary">{me.className}</Chip>
            <Chip tone="credit" icon={ShieldCheck}>Verified</Chip>
          </div>
          <dl className="mt-6 space-y-2 text-left">
            {rows.map(([k, v]) => (
              <div key={k} className="glass-inset flex justify-between p-3 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-foreground num">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-6" transition={{ delay: 0.05 }}>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold"><Phone className="size-4 text-primary" /> Mobile number</h3>
              {!editing && (
                <Btn variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Btn>
              )}
            </div>
            {editing ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input className="k-input num" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} aria-invalid={phone.length !== 10} />
                <Btn variant="primary" disabled={phone.length !== 10} onClick={() => { updatePhone(me.id, phone); setEditing(false); toast.success("Phone number updated"); }}><Check /> Save</Btn>
                <Btn variant="ghost" onClick={() => { setPhone(me.phone); setEditing(false); }}><X /> Cancel</Btn>
              </div>
            ) : (
              <div className="mt-3 font-display text-2xl font-semibold num">+91 {me.phone.slice(0, 5)} {me.phone.slice(5)}</div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Used for payment SMS alerts from the college office.</p>
          </GlassCard>

          <GlassCard className="p-6" transition={{ delay: 0.1 }}>
            <h3 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-primary" /> Change password</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Current" required error={pwTouched ? pwErr.current : ""}>
                <input type="password" className="k-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </Field>
              <Field label="New" required error={pwTouched ? pwErr.next : ""}>
                <input type="password" className="k-input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </Field>
              <Field label="Confirm" required error={pwTouched ? pwErr.confirm : ""}>
                <input type="password" className="k-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </Field>
            </div>
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < sc ? (sc >= 3 ? "bg-credit" : "bg-primary") : "bg-accent")} />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Btn variant="primary" onClick={() => { setPwTouched(true); if (pwErr.current || pwErr.next || pwErr.confirm) return; setPw({ current: "", next: "", confirm: "" }); setPwTouched(false); toast.success("Password changed"); }}>
                Update password
              </Btn>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="size-4 text-primary" /> Sector balances</h2>
          <p className="text-sm text-muted-foreground">Open any sector to see its full ledger.</p>
        </div>
        <div className="glass-inset px-3 py-2 text-sm">
          <span className="text-muted-foreground">Combined </span>
          <span className={cn("font-semibold num", combined.balance < 0 ? "text-debit" : "text-foreground")}>{formatINR(combined.balance)}</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {perSector.map((p, i) => (
          <Link key={p.sector.slug} to="/app/s/$sectorSlug" params={{ sectorSlug: p.sector.slug }} className="block" aria-label={`Open ${p.sector.name} ledger`}>
            <SectorTile sector={p.sector} value={p.t.balance} delay={0.15 + 0.05 * i}>
              <div className="flex items-center justify-between">
                <span className="num">{p.t.count} entries</span>
                <span className="inline-flex items-center gap-1 text-tile">View ledger <ArrowRight className="size-3" /></span>
              </div>
            </SectorTile>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, GraduationCap, KeyRound, Loader2, Lock, ShieldCheck, User, UserCog } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Logo } from "@/components/khazna/Logo";
import { Field } from "@/components/khazna/primitives";
import { SECTOR_ICON, tileVar } from "@/components/khazna/sector-meta";
import { SECTORS } from "@/lib/khazna/data";
import { useKhazna } from "@/lib/khazna/store";
import type { Role } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Khazna · Islahul Uloom" },
      { name: "description", content: "Sign in to Khazna, the Islahul Uloom cash ledger, as an admin, sector manager or student." },
      { property: "og:title", content: "Sign in — Khazna · Islahul Uloom" },
      { property: "og:description", content: "Sign in to the Islahul Uloom cash ledger and finance portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const DEMO: Record<Role, { label: string; icon: typeof ShieldCheck; user: string; hint: string }> = {
  admin: { label: "Super Admin", icon: ShieldCheck, user: "principal@islahululoom.edu.in", hint: "Full college overview" },
  manager: { label: "Sector Manager", icon: UserCog, user: "jaseel@islahululoom.edu.in", hint: "Dept Fiqh ledger" },
  student: { label: "Student", icon: GraduationCap, user: "S0125", hint: "Safwan K. · Fiqh 2" },
};

function LoginPage() {
  const navigate = useNavigate();
  const managerSector = useKhazna((s) => s.managerSector);
  const [role, setRole] = useState<Role>("admin");
  const [user, setUser] = useState(DEMO.admin.user);
  const [pass, setPass] = useState("khazna@2026");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const choose = (r: Role) => {
    setRole(r);
    setUser(DEMO[r].user);
    setPass("khazna@2026");
    setError("");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!user.trim() || pass.length < 6) {
      setError("Enter your Ad.No / email and a password of at least 6 characters.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      toast.success(`Welcome back — signed in as ${DEMO[role].label}`);
      if (role === "admin") navigate({ to: "/admin" });
      else if (role === "manager") navigate({ to: "/m/$sectorSlug", params: { sectorSlug: managerSector } });
      else navigate({ to: "/app" });
    }, 750);
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <Logo size="lg" />
        <div className="relative max-w-lg">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="font-arabic text-5xl text-primary/90">خزنة</div>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] text-foreground">
              Every rupee,
              <br />
              <span className="text-gradient-primary">accounted for.</span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground">
              One transparent ledger for the office, the union, welfare and every department of Islahul Uloom — with append-only audit trails.
            </p>
          </motion.div>
          <div className="mt-10 grid grid-cols-5 gap-3">
            {SECTORS.map((s, i) => {
              const Icon = SECTOR_ICON[s.slug];
              return (
                <motion.div
                  key={s.slug}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: [0, -6, 0] }}
                  transition={{ opacity: { delay: 0.2 + i * 0.08 }, y: { duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } }}
                  className="tile-glossy aspect-square p-3"
                  style={tileVar(s.color)}
                >
                  <div className="relative flex h-full flex-col justify-between">
                    <span className="tile-icon size-8">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight text-foreground">{s.name}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <div>
            <div className="font-display text-2xl font-semibold text-foreground num">56</div>students
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-foreground num">5</div>sectors
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-foreground num">100%</div>audited
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="glass w-full max-w-md p-6 sm:p-8">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick a demo role to preview, or use your credentials.</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {(Object.keys(DEMO) as Role[]).map((r) => {
              const D = DEMO[r];
              const active = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => choose(r)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all",
                    active ? "border-primary/50 bg-primary/10 text-foreground shadow-glow" : "border-hairline bg-accent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <D.icon className={cn("size-5", active && "text-primary")} />
                  <span className="text-xs font-medium">{D.label}</span>
                  <span className="text-[10px] leading-tight text-subtle">{D.hint}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label={role === "student" ? "Admission number" : "Email"}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input value={user} onChange={(e) => setUser(e.target.value)} className="k-input pl-9" autoComplete="username" />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <input value={pass} onChange={(e) => setPass(e.target.value)} type={show ? "text" : "password"} className="k-input px-9" autoComplete="current-password" />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-foreground" aria-label="Toggle password">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-lg border border-debit/30 bg-debit/10 px-3 py-2 text-xs text-debit">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" defaultChecked className="accent-primary" /> Keep me signed in
              </label>
              <button type="button" className="text-primary hover:underline" onClick={() => toast("Reset link sent", { description: "Check the email registered with the college office." })}>
                Forgot password?
              </button>
            </div>
            <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {loading ? "Signing in…" : `Continue as ${DEMO[role].label}`}
              {!loading && <ArrowRight />}
            </Btn>
          </form>
          <p className="mt-6 text-center text-[11px] text-subtle">Demo preview · all data is sample data stored in your browser session.</p>
        </motion.div>
      </div>
    </div>
  );
}

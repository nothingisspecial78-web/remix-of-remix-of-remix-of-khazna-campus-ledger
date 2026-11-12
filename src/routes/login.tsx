import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Check, Eye, EyeOff, GraduationCap, Hash, KeyRound, Loader2, Lock, Mail, PlayCircle, ShieldCheck, User, UserCog } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Btn } from "@/components/khazna/btn";
import { Logo } from "@/components/khazna/Logo";
import { Field } from "@/components/khazna/primitives";
import { sectorIcon, tileVar } from "@/components/khazna/sector-meta";
import { DEFAULT_MANAGER_SECTOR, SECTORS } from "@/lib/khazna/data";
import { markSignInTransition } from "@/lib/khazna/sign-in-transition";
import { useKhazna } from "@/lib/khazna/store";
import type { Role } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in or create your college — Khazna" },
      { name: "description", content: "Create your college on Khazna or sign in as a Super Admin, sector manager or student." },
      { property: "og:title", content: "Sign in or create your college — Khazna" },
      { property: "og:description", content: "Create your college finance portal or sign in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const DEMO: Record<Role, { label: string; icon: typeof ShieldCheck; hint: string }> = {
  admin: { label: "Super Admin", icon: ShieldCheck, hint: "Full college overview" },
  manager: { label: "Sector Manager", icon: UserCog, hint: "Dept Fiqh ledger" },
  student: { label: "Student", icon: GraduationCap, hint: "Safwan K. · S0125" },
};

type Dest = { to: "/admin" } | { to: "/app" } | { to: "/m/$sectorSlug"; params: { sectorSlug: string } };

function LoginPage() {
  const navigate = useNavigate();
  const store = useKhazna;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("admin");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [su, setSu] = useState({ college: "", name: "", email: "", password: "", confirm: "" });
  // idle → loading (button pulses) → leaving (card zooms out, glow hand-off) → navigate
  const [phase, setPhase] = useState<"idle" | "loading" | "leaving">("idle");
  const loading = phase === "loading";
  const leaving = phase === "leaving";
  const [error, setError] = useState("");

  const choose = (r: Role) => {
    setRole(r);
    setUser("");
    setPass("");
    setError("");
  };

  const go = (dest: Dest, message: string, before?: () => void) => {
    setError("");
    setPhase("loading");
    setTimeout(() => {
      before?.();
      setPhase("leaving");
      markSignInTransition();
      setTimeout(() => {
        toast.success(message);
        navigate(dest);
      }, 720);
    }, 800);
  };

  const tryDemo = (r: Role) => {
    if (phase !== "idle") return;
    const dest: Dest = r === "admin" ? { to: "/admin" } : r === "manager" ? { to: "/m/$sectorSlug", params: { sectorSlug: DEFAULT_MANAGER_SECTOR } } : { to: "/app" };
    go(dest, `Demo opened as ${DEMO[r].label}`, () => store.getState().loadDemo());
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (phase !== "idle") return;
    const st = store.getState();
    if (mode === "signup") {
      if (su.college.trim().length < 3) return setError("Enter your college name.");
      if (su.name.trim().length < 3) return setError("Enter your full name.");
      if (!/^\S+@\S+\.\S+$/.test(su.email)) return setError("Enter a valid email address.");
      if (su.password.length < 8) return setError("Password must be at least 8 characters.");
      if (su.password !== su.confirm) return setError("Passwords don't match.");
      go({ to: "/admin" }, `${su.college.trim()} is ready — start by adding sectors`, () =>
        st.signUpCollege({ college: su.college.trim(), name: su.name.trim(), email: su.email, password: su.password }),
      );
      return;
    }
    const id = user.trim();
    if (role === "student") {
      const s = st.students.find((x) => x.id.toLowerCase() === id.toLowerCase());
      if (!s) return setError("No student found with that admission number.");
      go({ to: "/app" }, `Welcome, ${s.name}`, () => st.setMeStudent(s.id));
      return;
    }
    if (!id || pass.length < 6) return setError("Enter your email and password.");
    if (role === "admin") {
      if (id.toLowerCase() !== st.college.adminEmail.toLowerCase() || pass !== st.college.password) return setError("Email or password is incorrect.");
      go({ to: "/admin" }, `Welcome back, ${st.college.adminName}`);
      return;
    }
    const m = st.managers.find((x) => x.email.toLowerCase() === id.toLowerCase());
    if (!m) return setError("No sector manager with that email. Ask your Super Admin to add you.");
    const sector = m.sectors.find((x) => st.sectors.some((s) => s.slug === x));
    if (!sector) return setError("You haven't been assigned a sector yet.");
    go({ to: "/m/$sectorSlug", params: { sectorSlug: sector } }, `Welcome back, ${m.name}`, () => st.setManagerSector(sector));
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <motion.div
        initial={false}
        animate={leaving ? { opacity: 0, x: -48, filter: "blur(10px)" } : { opacity: 1, x: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
      >
        <Logo size="lg" tagline="College finance portal" />
        <div className="relative max-w-lg">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="font-display text-5xl font-semibold text-primary/90">Khazna</div>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.05] text-foreground">
              Every rupee,
              <br />
              <span className="text-gradient-primary">accounted for.</span>
            </h1>
            <p className="mt-5 text-base text-muted-foreground">
              One transparent ledger for your college office, unions, welfare wings and every department — with append-only audit trails.
            </p>
          </motion.div>
          <div className="mt-10 grid grid-cols-5 gap-3">
            {SECTORS.map((s, i) => {
              const Icon = sectorIcon(s.slug);
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
            <div className="font-display text-2xl font-semibold text-foreground num">Any</div>college
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-foreground num">∞</div>sectors
          </div>
          <div>
            <div className="font-display text-2xl font-semibold text-foreground num">100%</div>audited
          </div>
        </div>
      </motion.div>

      {/* Form side */}
      <div className="flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={leaving ? { opacity: 0, scale: 1.08, y: -10, filter: "blur(14px)" } : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={leaving ? { duration: 0.65, ease: [0.65, 0, 0.35, 1] } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn("glass w-full max-w-md p-6 sm:p-8 transition-shadow duration-500", phase !== "idle" && "shadow-glow")}
          aria-busy={phase !== "idle"}
        >
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-hairline bg-accent p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn("relative rounded-lg py-2 text-sm font-medium transition-colors", mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className="relative">{m === "signin" ? "Sign in" : "Create college"}</span>
              </button>
            ))}
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-foreground">{mode === "signin" ? "Welcome back" : "Set up your college"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Choose who you are and sign in." : "Create the Super Admin account. You'll add sectors, managers and students next."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signin" ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(DEMO) as Role[]).map((r) => {
                    const D = DEMO[r];
                    const active = r === role;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => choose(r)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all",
                          active ? "border-primary/50 bg-primary/10 text-foreground shadow-glow" : "border-hairline bg-accent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <D.icon className={cn("size-5", active && "text-primary")} />
                        <span className="text-xs font-medium">{D.label}</span>
                      </button>
                    );
                  })}
                </div>
                {role === "student" ? (
                  <Field label="Admission number">
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                      <input value={user} onChange={(e) => setUser(e.target.value)} className="k-input pl-9 uppercase" placeholder="e.g. S0125" autoComplete="username" />
                    </div>
                  </Field>
                ) : (
                  <>
                    <Field label="Email">
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                        <input value={user} onChange={(e) => setUser(e.target.value)} type="email" className="k-input pl-9" placeholder="you@college.edu" autoComplete="username" />
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
                  </>
                )}
              </>
            ) : (
              <>
                <Field label="College name">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                    <input value={su.college} onChange={(e) => setSu({ ...su, college: e.target.value })} className="k-input pl-9" placeholder="e.g. Al Noor Arts College" />
                  </div>
                </Field>
                <Field label="Your full name">
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                    <input value={su.name} onChange={(e) => setSu({ ...su, name: e.target.value })} className="k-input pl-9" placeholder="Principal or accounts head" />
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                    <input value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })} type="email" className="k-input pl-9" placeholder="you@college.edu" autoComplete="email" />
                  </div>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Password">
                    <input value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })} type="password" className="k-input" placeholder="8+ characters" autoComplete="new-password" />
                  </Field>
                  <Field label="Confirm password">
                    <input value={su.confirm} onChange={(e) => setSu({ ...su, confirm: e.target.value })} type="password" className="k-input" autoComplete="new-password" />
                  </Field>
                </div>
              </>
            )}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-lg border border-debit/30 bg-debit/10 px-3 py-2 text-xs text-debit">
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative">
              <AnimatePresence>
                {phase !== "idle" &&
                  [0, 1, 2].map((k) => (
                    <motion.span
                      key={k}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-xl border border-primary"
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.25 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.3, delay: k * 0.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  ))}
              </AnimatePresence>
              <Btn type="submit" variant="primary" size="lg" className={cn("relative w-full overflow-hidden", phase !== "idle" && "brightness-110")}>
                {phase !== "idle" && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent"
                    initial={{ x: "0%" }}
                    animate={{ x: "400%" }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={phase} className="relative inline-flex items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                    {loading ? <Loader2 className="animate-spin" /> : leaving ? <Check /> : <KeyRound />}
                    {loading ? "Verifying…" : leaving ? "Opening your dashboard" : mode === "signup" ? "Create college account" : `Sign in as ${DEMO[role].label}`}
                    {phase === "idle" && <ArrowRight />}
                  </motion.span>
                </AnimatePresence>
              </Btn>
            </div>
          </form>

          <div className="mt-6 border-t border-hairline pt-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <PlayCircle className="size-4 text-primary" /> Try the demo — sample college, no sign-up
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(DEMO) as Role[]).map((r) => {
                const D = DEMO[r];
                return (
                  <button key={r} type="button" onClick={() => tryDemo(r)} className="hover-lift flex flex-col items-center gap-1 rounded-xl border border-hairline bg-accent px-2 py-2.5 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <D.icon className="size-4" />
                    <span className="text-[11px] font-medium">{D.label}</span>
                    <span className="text-[10px] leading-tight text-subtle">{D.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-5 text-center text-[11px] text-subtle">Preview · everything is kept in this browser tab and resets on refresh.</p>
        </motion.div>
      </div>

      <AnimatePresence>
        {leaving && (
          <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-50 grid place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <div className="signin-glow absolute inset-0" />
            {[0, 1].map((k) => (
              <motion.span
                key={k}
                className="absolute size-40 rounded-full border-2 border-primary shadow-glow"
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 7, opacity: 0 }}
                transition={{ duration: 0.9, delay: k * 0.18, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
            <motion.span
              className="relative grid size-20 place-items-center rounded-full border border-primary/50 bg-primary/15 text-primary shadow-glow backdrop-blur-xl"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
            >
              <Check className="size-9" strokeWidth={2.5} />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import * as Dialog from "@radix-ui/react-dialog";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronDown,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  UserCog,
  Users,
  UserRound,
  BarChart3,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { Sector, Student } from "@/lib/khazna/types";

const NO_STUDENT: Student = { id: "—", name: "Student", className: "—", phone: "", guardian: "—", joined: "" };
const NO_SECTOR: Sector = { slug: "", name: "No sector yet", short: "—", description: "", color: "var(--sector-office)", receiptPrefix: "", target: 1, creditTitles: [], debitTitles: [] };
import { clearSignInTransition, isSignInTransitionPending } from "@/lib/khazna/sign-in-transition";
import { managerNameIn, useKhazna } from "@/lib/khazna/store";
import type { Role, SectorSlug } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./primitives";
import { KMenu, KMenuItem } from "./overlays";
import { sectorIcon, tileVar } from "./sector-meta";
import { Logo } from "./Logo";

const ROLE_META: Record<Role, { label: string; icon: LucideIcon }> = {
  admin: { label: "Super Admin", icon: ShieldCheck },
  manager: { label: "Sector Manager", icon: UserCog },
  student: { label: "Student", icon: GraduationCap },
};

type LinkRenderProps = { className: string; onClick: () => void; children: (s: { isActive: boolean }) => ReactNode };
interface NavItem {
  label: string;
  icon: LucideIcon;
  badge?: string | undefined;
  render: (p: LinkRenderProps) => ReactNode;
  tile?: string | undefined;
}

function useNav(role: Role, sectorSlug: SectorSlug): { title: string; items: NavItem[] }[] {
  const sectors = useKhazna((s) => s.sectors);
  const unread = useKhazna((s) => s.notices.filter((n) => !n.read).length);
  if (role === "admin") {
    return [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, render: (p) => <Link to="/admin" activeOptions={{ exact: true }} {...p} /> },
          { label: "Audit Log", icon: ScrollText, render: (p) => <Link to="/admin/audit" {...p} /> },
        ],
      },
      {
        title: "People",
        items: [
          { label: "Student Directory", icon: Users, render: (p) => <Link to="/admin/students" activeOptions={{ exact: true }} {...p} /> },
          { label: "Bulk Import", icon: Upload, render: (p) => <Link to="/admin/students/import" {...p} /> },
          { label: "Admins", icon: UserCog, render: (p) => <Link to="/admin/admins" {...p} /> },
        ],
      },
      { title: "Structure", items: [{ label: "Sectors & Classes", icon: Layers, render: (p) => <Link to="/admin/sectors" {...p} /> }] },
    ];
  }
  if (role === "manager") {
    const p = { sectorSlug };
    return [
      {
        title: "Sector",
        items: [
          { label: "Overview", icon: LayoutDashboard, render: (lp) => <Link to="/m/$sectorSlug" params={p} activeOptions={{ exact: true }} {...lp} /> },
          { label: "Ledger", icon: ReceiptText, render: (lp) => <Link to="/m/$sectorSlug/ledger" params={p} {...lp} /> },
          { label: "Bulk Entry", icon: ListChecks, badge: "New", render: (lp) => <Link to="/m/$sectorSlug/bulk" params={p} {...lp} /> },
        ],
      },
      {
        title: "Records",
        items: [
          { label: "Class Reports", icon: BarChart3, render: (lp) => <Link to="/m/$sectorSlug/reports" params={p} {...lp} /> },
          { label: "Batches", icon: FileSpreadsheet, render: (lp) => <Link to="/m/$sectorSlug/batches" params={p} {...lp} /> },
        ],
      },
    ];
  }
  return [
    { title: "Me", items: [{ label: "Overview", icon: LayoutDashboard, render: (p) => <Link to="/app" activeOptions={{ exact: true }} {...p} /> }] },
    {
      title: "My Ledgers",
      items: sectors.map((s) => ({
        label: s.name,
        icon: sectorIcon(s.slug),
        tile: s.color,
        render: (p: LinkRenderProps) => <Link to="/app/s/$sectorSlug" params={{ sectorSlug: s.slug }} {...p} />,
      })),
    },
    {
      title: "Account",
      items: [
        { label: "Notifications", icon: Bell, badge: unread ? String(unread) : undefined, render: (p) => <Link to="/app/notifications" {...p} /> },
        { label: "Profile", icon: UserRound, render: (p) => <Link to="/app/profile" {...p} /> },
      ],
    },
  ];
}

function NavList({ role, sectorSlug, onNavigate }: { role: Role; sectorSlug: SectorSlug; onNavigate?: (() => void) | undefined }) {
  const groups = useNav(role, sectorSlug);
  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">{g.title}</div>
          <div className="space-y-0.5">
            {g.items.map((it) => (
              <div key={it.label}>
                {it.render({
                  onClick: () => onNavigate?.(),
                  className:
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground",
                  children: ({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-active" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />}
                      {it.tile ? (
                        <span className="tile-icon size-6" style={tileVar(it.tile)}>
                          <it.icon className="size-3.5" />
                        </span>
                      ) : (
                        <it.icon className={cn("size-4", isActive && "text-primary")} />
                      )}
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{it.badge}</span>}
                    </>
                  ),
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ContextCard({ role, sectorSlug }: { role: Role; sectorSlug: SectorSlug }) {
  const sector = useKhazna((s) => s.sectors.find((x) => x.slug === sectorSlug)) ?? NO_SECTOR;
  const managerName = useKhazna((s) => managerNameIn(s, sectorSlug));
  const collegeName = useKhazna((s) => s.college.name);
  const me = useKhazna((s) => s.students.find((x) => x.id === s.meStudentId)) ?? NO_STUDENT;
  if (role === "manager") {
    const Icon = sectorIcon(sector.slug);
    return (
      <div className="tile-glossy mb-5 p-3.5" style={tileVar(sector.color)}>
        <div className="relative flex items-center gap-3">
          <span className="tile-icon size-9">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{sector.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">Managed by {managerName}</div>
          </div>
        </div>
      </div>
    );
  }
  if (role === "student") {
    return (
      <div className="glass-inset mb-5 flex items-center gap-3 p-3">
        <Avatar name={me.name} size={36} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{me.name}</div>
          <div className="text-[11px] text-muted-foreground num">
            {me.id} · {me.className}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="glass-inset mb-5 p-3">
      <div className="text-[11px] uppercase tracking-wider text-subtle">Academic year</div>
      <div className="text-sm font-semibold text-foreground">2026–27 · Term 2</div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{collegeName}</div>
    </div>
  );
}

export function AppShell({ role, sectorSlug, children }: { role: Role; sectorSlug?: SectorSlug | undefined; children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const managerSector = useKhazna((s) => s.managerSector);
  const setManagerSector = useKhazna((s) => s.setManagerSector);
  const sectors = useKhazna((s) => s.sectors);
  const unread = useKhazna((s) => s.notices.filter((n) => !n.read).length);
  const me = useKhazna((s) => s.students.find((x) => x.id === s.meStudentId)) ?? NO_STUDENT;
  const [mobileOpen, setMobileOpen] = useState(false);
  // Arriving straight from the login hand-off: play a one-time blur-to-sharp reveal.
  const [entering, setEntering] = useState(isSignInTransitionPending);
  useEffect(() => {
    clearSignInTransition();
  }, []);
  const slug = sectorSlug ?? managerSector;
  const current = sectors.find((s) => s.slug === slug) ?? NO_SECTOR;
  const college = useKhazna((s) => s.college);
  const currentManager = useKhazna((s) => managerNameIn(s, slug));
  const RoleIcon = ROLE_META[role].icon;

  const switchRole = (r: Role) => {
    if (r === "admin") navigate({ to: "/admin" });
    else if (r === "manager") {
      const target = sectors.find((s) => s.slug === managerSector)?.slug ?? sectors[0]?.slug;
      if (!target) {
        toast("Add a sector first", { description: "Sector managers appear once a sector exists." });
        navigate({ to: "/admin/sectors" });
      } else navigate({ to: "/m/$sectorSlug", params: { sectorSlug: target } });
    } else if (me === NO_STUDENT) {
      toast("No students yet", { description: "Upload students first, then they can sign in with their admission number." });
      navigate({ to: "/admin/students/import" });
    } else navigate({ to: "/app" });
  };

  const switchSector = (s: SectorSlug) => {
    setManagerSector(s);
    const sub = pathname.split("/")[3];
    const params = { sectorSlug: s };
    if (sub === "ledger") navigate({ to: "/m/$sectorSlug/ledger", params });
    else if (sub === "bulk") navigate({ to: "/m/$sectorSlug/bulk", params });
    else if (sub === "reports") navigate({ to: "/m/$sectorSlug/reports", params });
    else if (sub === "batches") navigate({ to: "/m/$sectorSlug/batches", params });
    else navigate({ to: "/m/$sectorSlug", params });
  };

  const user =
    role === "admin"
      ? { name: college.adminName, sub: "Super Admin" }
      : role === "manager"
        ? { name: currentManager, sub: `${current.name} manager` }
        : { name: me.name, sub: `${me.id} · ${me.className}` };

  return (
    <div className="min-h-screen">
      {entering && <motion.div aria-hidden className="signin-glow pointer-events-none fixed inset-0 z-[70]" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />}
      <motion.header
        initial={entering ? { opacity: 0, y: -18 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="no-print sticky top-0 z-40 px-2 pt-2 md:px-4 md:pt-3"
      >
        <div className="glass-strong mx-auto flex h-16 max-w-[1440px] items-center gap-2 rounded-2xl px-3 md:gap-3 md:px-4">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon className="size-5" />
          </button>
          <Logo />

          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            <span className="hidden text-[11px] uppercase tracking-wider text-subtle xl:inline">Preview as</span>
            <KMenu
              label="Switch role (demo)"
              trigger={
                <button className="glass-inset flex h-10 items-center gap-2 px-3 text-sm text-foreground hover:bg-accent">
                  <RoleIcon className="size-4 text-primary" />
                  <span className="hidden sm:inline">{ROLE_META[role].label}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              }
            >
              {(Object.keys(ROLE_META) as Role[]).map((r) => {
                const M = ROLE_META[r];
                return (
                  <KMenuItem key={r} onSelect={() => switchRole(r)} active={r === role}>
                    <M.icon className="size-4" />
                    <span className="flex-1">
                      {M.label}
                      {r === "student" && <span className="ml-1 text-xs text-subtle">Safwan · S0125</span>}
                    </span>
                    {r === role && <Check className="size-4 text-primary" />}
                  </KMenuItem>
                );
              })}
            </KMenu>

            {role === "manager" && (
              <KMenu
                label="Switch sector"
                trigger={
                  <button className="glass-inset flex h-10 items-center gap-2 px-3 text-sm text-foreground hover:bg-accent" style={tileVar(current.color)}>
                    <span className="size-2.5 rounded-full bg-tile shadow-glow" />
                    <span className="hidden max-w-[9rem] truncate md:inline">{current.name}</span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </button>
                }
              >
                {sectors.map((s) => {
                  const Icon = sectorIcon(s.slug);
                  return (
                    <KMenuItem key={s.slug} onSelect={() => switchSector(s.slug)} active={s.slug === slug}>
                      <span className="tile-icon size-6" style={tileVar(s.color)}>
                        <Icon className="size-3.5" />
                      </span>
                      <span className="flex-1">{s.name}</span>
                      {s.slug === slug && <Check className="size-4 text-primary" />}
                    </KMenuItem>
                  );
                })}
              </KMenu>
            )}

            {role === "student" && (
              <Link to="/app/notifications" className="relative grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Notifications">
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{unread}</span>
                )}
              </Link>
            )}

            {role === "student" ? (
              <>
                <Link
                  to="/app/profile"
                  aria-label="My profile"
                  className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-accent data-[status=active]:bg-accent"
                >
                  <Avatar name={user.name} size={32} />
                  <span className="hidden text-left leading-tight md:block">
                    <span className="block text-sm font-medium text-foreground">{user.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{user.sub}</span>
                  </span>
                </Link>
                <Link
                  to="/login"
                  aria-label="Sign out"
                  title="Sign out"
                  className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-debit"
                >
                  <LogOut className="size-[18px]" />
                </Link>
              </>
            ) : (
              <KMenu
                trigger={
                  <button className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-accent">
                    <Avatar name={user.name} size={32} />
                    <span className="hidden text-left leading-tight md:block">
                      <span className="block text-sm font-medium text-foreground">{user.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{user.sub}</span>
                    </span>
                  </button>
                }
              >
                <KMenuItem destructive onSelect={() => navigate({ to: "/login" })}>
                  <LogOut className="size-4" /> Sign out
                </KMenuItem>
              </KMenu>
            )}
          </div>
        </div>
      </motion.header>

      <div className="mx-auto flex max-w-[1440px] gap-6 px-3 pb-20 pt-5 md:px-6 md:pt-6">
        <motion.aside
          initial={entering ? { opacity: 0, x: -24 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="no-print hidden w-60 shrink-0 lg:block"
        >
          <div className="glass sticky top-[6.25rem] p-3">
            <ContextCard role={role} sectorSlug={slug} />
            <NavList role={role} sectorSlug={slug} />
          </div>
        </motion.aside>
        <main className="min-w-0 flex-1">
          <motion.div
            key={pathname}
            initial={entering ? { opacity: 0, y: 28, scale: 0.97, filter: "blur(14px)" } : { opacity: 0, x: 36, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
            transition={entering ? { duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => entering && setEntering(false)}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="glass-strong fixed inset-y-2 left-2 z-50 w-72 overflow-y-auto rounded-2xl p-4 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title asChild>
                <div>
                  <Logo />
                </div>
              </Dialog.Title>
              <Dialog.Description className="sr-only">Navigation</Dialog.Description>
              <Dialog.Close className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close menu">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <ContextCard role={role} sectorSlug={slug} />
            <NavList role={role} sectorSlug={slug} onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

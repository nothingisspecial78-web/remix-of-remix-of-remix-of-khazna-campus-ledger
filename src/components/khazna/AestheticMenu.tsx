import * as Dialog from "@radix-ui/react-dialog";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronRight,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  Sun,
  Upload,
  UserCog,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Avatar } from "./primitives";
import { sectorIcon, tileVar } from "./sector-meta";
import { managerNameIn, useKhazna } from "@/lib/khazna/store";
import type { Role, SectorSlug } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";

interface AestheticMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  sectorSlug?: SectorSlug | undefined;
  onOpenNewOrg?: () => void;
}

export function AestheticMenu({
  open,
  onOpenChange,
  role,
  sectorSlug,
  onOpenNewOrg,
}: AestheticMenuProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Theme management
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, [open]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== "undefined") {
      if (next) {
        document.documentElement.classList.add("dark");
        window.localStorage.setItem("khazna-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        window.localStorage.setItem("khazna-theme", "light");
      }
    }
  };

  const college = useKhazna((s) => s.college);
  const organizations = useKhazna((s) => s.organizations);
  const switchOrg = useKhazna((s) => s.switchOrg);
  const sectors = useKhazna((s) => s.sectors);
  const unread = useKhazna((s) => s.notices.filter((n) => !n.read).length);
  const me = useKhazna((s) => s.students.find((x) => x.id === s.meStudentId));
  const managerSector = useKhazna((s) => s.managerSector);

  const slug = sectorSlug ?? managerSector;
  const currentSector = sectors.find((s) => s.slug === slug);
  const currentManager = useKhazna((s) => managerNameIn(s, slug));

  const user =
    role === "admin"
      ? { name: college.adminName, sub: "Super Admin", roleLabel: "Super Admin" }
      : role === "manager"
        ? { name: currentManager, sub: `${currentSector?.name ?? "Sector"} Manager`, roleLabel: "Sector Manager" }
        : { name: me?.name ?? "Student", sub: `${me?.id ?? "S0125"} · ${me?.className ?? "Class"}`, roleLabel: "Student" };

  const handleLogout = () => {
    setLogoutConfirmOpen(false);
    onOpenChange(false);
    toast.success("Signed out successfully");
    navigate({ to: "/login" });
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <Dialog.Content
            className={cn(
              "glass-strong fixed z-50 flex flex-col outline-none shadow-2xl border border-white/70 dark:border-white/10 box-border overflow-hidden",
              // Mobile: bottom sheet
              "inset-x-0 bottom-0 rounded-t-[28px] max-h-[85dvh] p-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-full",
              // Tablet / Desktop: floating anchored card
              "md:inset-auto md:top-20 md:left-6 md:w-96 md:rounded-3xl md:max-h-[calc(100dvh-6rem)] md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-top-2 md:data-[state=closed]:zoom-out-95"
            )}
          >
            {/* Mobile Drag Handle */}
            <div className="pt-3 pb-1 md:hidden">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header: Workspace switcher & Close */}
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0">
                  <Dialog.Title className="truncate text-sm font-semibold text-foreground">
                    {college.name}
                  </Dialog.Title>
                  <Dialog.Description className="truncate text-[11px] text-muted-foreground flex items-center gap-1.5">
                    {college.demo ? (
                      <span className="rounded bg-white/20 dark:bg-white/10 px-1 py-0.2 text-[9px] uppercase tracking-wider text-muted-foreground">
                        Demo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Campus
                      </span>
                    )}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none"
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Dialog.Close>
            </div>

            {/* Scrollable Menu Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Role Context Card */}
              {role === "manager" && currentSector && (
                <div
                  className="tile-glossy p-3.5 rounded-2xl border"
                  style={tileVar(currentSector.color)}
                >
                  <div className="flex items-center gap-3">
                    <span className="tile-icon size-9 shrink-0">
                      {(() => {
                        const Icon = sectorIcon(currentSector.slug);
                        return <Icon className="size-4" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {currentSector.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        Managed by {currentManager}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {role === "admin" && (
                <div className="glass-inset p-3.5 rounded-2xl">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Academic Year
                  </div>
                  <div className="text-sm font-semibold text-foreground">2026–27 · Term 2</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {college.name}
                  </div>
                </div>
              )}

              {role === "student" && me && (
                <div className="glass-inset flex items-center gap-3 p-3.5 rounded-2xl">
                  <Avatar name={me.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {me.name}
                    </div>
                    <div className="text-xs text-muted-foreground num">
                      {me.id} · {me.className}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Sections */}
              {role === "manager" && (
                <>
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Sector
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/m/$sectorSlug"
                        params={{ sectorSlug: slug }}
                        icon={LayoutDashboard}
                        label="Overview"
                        isActive={pathname === `/m/${slug}`}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/m/$sectorSlug/ledger"
                        params={{ sectorSlug: slug }}
                        icon={ReceiptText}
                        label="Ledger"
                        isActive={pathname.includes("/ledger")}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/m/$sectorSlug/bulk"
                        params={{ sectorSlug: slug }}
                        icon={ListChecks}
                        label="Bulk Entry"
                        badge="New"
                        isActive={pathname.includes("/bulk")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Records
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/m/$sectorSlug/reports"
                        params={{ sectorSlug: slug }}
                        icon={BarChart3}
                        label="Class Reports"
                        isActive={pathname.includes("/reports")}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/m/$sectorSlug/batches"
                        params={{ sectorSlug: slug }}
                        icon={FileSpreadsheet}
                        label="Batches"
                        isActive={pathname.includes("/batches")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>
                </>
              )}

              {role === "admin" && (
                <>
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Overview
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/admin"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isActive={pathname === "/admin"}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/admin/audit"
                        icon={ScrollText}
                        label="Audit Log"
                        isActive={pathname.includes("/admin/audit")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      People
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/admin/students"
                        icon={Users}
                        label="Student Directory"
                        isActive={pathname === "/admin/students"}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/admin/students/import"
                        icon={Upload}
                        label="Bulk Import"
                        isActive={pathname.includes("/admin/students/import")}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/admin/admins"
                        icon={UserCog}
                        label="Admins"
                        isActive={pathname.includes("/admin/admins")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Structure
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/admin/sectors"
                        icon={Layers}
                        label="Sectors & Classes"
                        isActive={pathname.includes("/admin/sectors")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>
                </>
              )}

              {role === "student" && (
                <>
                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Overview
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/app"
                        icon={LayoutDashboard}
                        label="Overview"
                        isActive={pathname === "/app"}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      My Ledgers
                    </div>
                    <div className="space-y-1">
                      {sectors.map((s) => {
                        const Icon = sectorIcon(s.slug);
                        return (
                          <MenuItemLink
                            key={s.slug}
                            to="/app/s/$sectorSlug"
                            params={{ sectorSlug: s.slug }}
                            icon={Icon}
                            label={s.name}
                            tile={s.color}
                            isActive={pathname === `/app/s/${s.slug}`}
                            onSelect={() => onOpenChange(false)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
                      Account
                    </div>
                    <div className="space-y-1">
                      <MenuItemLink
                        to="/app/notifications"
                        icon={Bell}
                        label="Notifications"
                        badge={unread > 0 ? String(unread) : undefined}
                        isActive={pathname.includes("/notifications")}
                        onSelect={() => onOpenChange(false)}
                      />
                      <MenuItemLink
                        to="/app/profile"
                        icon={UserRound}
                        label="Profile"
                        isActive={pathname.includes("/profile")}
                        onSelect={() => onOpenChange(false)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Preferences: Dark Mode Toggle */}
              <div className="pt-2 border-t border-hairline">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-7 place-items-center rounded-lg bg-accent text-foreground">
                      {isDark ? <Moon className="size-4 text-amber-400" /> : <Sun className="size-4 text-amber-500" />}
                    </div>
                    <span>{isDark ? "Dark Appearance" : "Light Appearance"}</span>
                  </div>
                  <div
                    className={cn(
                      "relative h-6 w-11 rounded-full p-0.5 transition-colors duration-200",
                      isDark ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <div
                      className={cn(
                        "size-5 rounded-full bg-white shadow-md transition-transform duration-200",
                        isDark ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Menu Footer: Profile & Red Sign Out */}
            <div className="border-t border-hairline bg-accent/20 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={user.name} size={36} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {user.sub}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Logout Confirmation Dialog */}
      <Dialog.Root open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="glass-strong fixed left-1/2 top-1/2 z-[60] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5 shadow-2xl border border-white/70 dark:border-white/10 outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/20">
                <LogOut className="size-5" />
              </div>
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold text-foreground">
                  Sign out?
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to sign out of Khazna?
                </Dialog.Description>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-rose-600 active:scale-95 transition-all"
              >
                Sign out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function MenuItemLink({
  to,
  params,
  icon: Icon,
  label,
  badge,
  tile,
  isActive,
  onSelect,
}: {
  to: string;
  params?: Record<string, string>;
  icon: LucideIcon;
  label: string;
  badge?: string;
  tile?: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <Link
      to={to}
      params={params as any}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
        isActive
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
      )}
      {tile ? (
        <span className="tile-icon size-7 shrink-0" style={tileVar(tile)}>
          <Icon className="size-3.5" />
        </span>
      ) : (
        <Icon className={cn("size-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      )}
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      <ChevronRight className="size-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

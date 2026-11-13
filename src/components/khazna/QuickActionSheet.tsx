import {
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  colorClass: string;
  onClick: () => void;
}

export function QuickActionSheet({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: QuickActionItem[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="glass-strong fixed inset-x-3 bottom-3 sm:bottom-auto sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto max-w-[calc(100vw-24px)] sm:max-w-md sm:w-full rounded-3xl p-5 outline-none shadow-2xl border border-white/70 dark:border-white/10 box-border max-h-[85dvh] overflow-y-auto data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 sm:data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-6 sm:data-[state=closed]:zoom-out-95">
          {/* Mobile drag handle */}
          <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/20 sm:hidden" />

          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <div className="min-w-0 pr-2">
              <Dialog.Title className="font-display text-base font-semibold text-foreground">
                Quick Actions
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground truncate">
                Select an entry type or action to begin
              </Dialog.Description>
            </div>
            <Dialog.Close className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent focus:outline-none" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div className="mt-3.5 grid gap-2.5">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    act.onClick();
                  }}
                  className="group flex min-h-[64px] w-full max-w-full min-w-0 box-border items-center gap-3.5 rounded-2xl border border-glass-border bg-white/60 dark:bg-white/5 p-3.5 text-left transition-all hover:bg-accent hover:border-primary/40 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl border shadow-sm transition-transform group-hover:scale-105", act.colorClass)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{act.title}</div>
                    <div className="text-xs text-muted-foreground break-words line-clamp-2 leading-relaxed">
                      {act.subtitle}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

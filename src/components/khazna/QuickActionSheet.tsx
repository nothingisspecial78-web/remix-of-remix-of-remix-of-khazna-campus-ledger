import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ListChecks,
  Plus,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface QuickActionItem {
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
        <Dialog.Content className="glass-strong fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-3xl p-5 outline-none shadow-2xl border border-white/60 dark:border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-6">
          <div className="flex items-center justify-between pb-3 border-b border-hairline">
            <div>
              <Dialog.Title className="font-display text-base font-semibold text-foreground">
                Quick Actions
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground">
                Select an entry type or action to begin
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-full p-1.5 text-muted-foreground hover:bg-accent" aria-label="Close">
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
                  className="flex items-center gap-3.5 rounded-2xl border border-glass-border bg-accent/40 p-3 text-left transition-all hover:bg-accent hover:border-primary/40 active:scale-[0.98]"
                >
                  <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl border shadow-sm", act.colorClass)}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{act.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{act.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

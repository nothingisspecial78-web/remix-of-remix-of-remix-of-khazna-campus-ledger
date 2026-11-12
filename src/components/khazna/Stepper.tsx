import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current }: { steps: { label: string; icon: LucideIcon }[]; current: number }) {
  return (
    <div className="glass mb-6 p-4 md:p-5">
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <div className="flex items-center gap-2.5">
                <motion.span
                  animate={{ scale: active ? 1.06 : 1 }}
                  className={cn(
                    "relative grid size-9 shrink-0 place-items-center rounded-xl border text-sm font-semibold transition-colors",
                    done && "border-credit/40 bg-credit/15 text-credit",
                    active && "border-primary/50 bg-primary/15 text-primary shadow-glow",
                    !done && !active && "border-hairline bg-accent text-subtle",
                  )}
                >
                  {done ? <Check className="size-4" /> : <s.icon className="size-4" />}
                  {active && <span className="animate-pulse-ring absolute inset-0 rounded-xl border border-primary/50" />}
                </motion.span>
                <div className="hidden md:block">
                  <div className="text-[10px] uppercase tracking-wider text-subtle">Step {i + 1}</div>
                  <div className={cn("text-sm font-medium", active || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-3 h-px flex-1 overflow-hidden rounded-full bg-hairline">
                  <motion.div className="h-full bg-credit" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

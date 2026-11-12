import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Sector } from "@/lib/khazna/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./primitives";
import { sectorIcon, tileVar } from "./sector-meta";
import { formatINR } from "@/lib/khazna/format";
import { reveal } from "./motion";

export function SectorTile({ sector, value, label = "Balance", children, delay = 0, className }: { sector: Sector; value: number; label?: string | undefined; children?: ReactNode | undefined; delay?: number | undefined; className?: string | undefined }) {
  const Icon = sectorIcon(sector.slug);
  return (
    <motion.div
      {...reveal(0, delay)}
      whileHover={{ y: -4 }}
      className={cn("tile-glossy group h-full p-3 sm:p-4", className)}
      style={tileVar(sector.color)}
    >
      <Icon aria-hidden className="pointer-events-none absolute -bottom-7 -right-7 size-20 sm:size-24 text-tile opacity-[0.06] transition-all duration-500 group-hover:-rotate-12 group-hover:scale-110 group-hover:opacity-[0.12]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="tile-icon size-8 sm:size-10 transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-4 sm:size-[18px]" />
          </span>
          <ArrowUpRight className="size-3.5 sm:size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-tile" />
        </div>
        <div className="mt-2.5 sm:mt-4 text-xs sm:text-sm font-medium text-foreground truncate">{sector.name}</div>
        <div className="mt-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("mt-1 font-display text-sm sm:text-xl font-semibold", value < 0 ? "text-debit" : "text-foreground")}>
          <CountUp value={value} format={formatINR} />
        </div>
        {children && <div className="mt-2 sm:mt-3 border-t border-hairline pt-2 sm:pt-3 text-[10px] sm:text-xs text-muted-foreground">{children}</div>}
      </div>
    </motion.div>
  );
}

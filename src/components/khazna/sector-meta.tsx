import { BookOpen, Building2, HardHat, HeartHandshake, Sparkles, type LucideIcon } from "lucide-react";
import type { MotionStyle } from "framer-motion";
import type { CSSProperties } from "react";
import type { SectorSlug } from "@/lib/khazna/types";

export const SECTOR_ICON: Record<SectorSlug, LucideIcon> = {
  office: Building2,
  "ihsan-union": Sparkles,
  "velitcham-welfare": HeartHandshake,
  "dept-fiqh": BookOpen,
  "dept-civil": HardHat,
};

/** Inline style that exposes the sector color to the tile-* utilities. */
export const tileVar = (color: string) => ({ "--tile": color }) as CSSProperties & MotionStyle;

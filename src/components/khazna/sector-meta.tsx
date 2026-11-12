import { BookOpen, Building2, HardHat, HeartHandshake, Layers, Sparkles, type LucideIcon } from "lucide-react";
import type { MotionStyle } from "framer-motion";
import type { CSSProperties } from "react";
import type { SectorSlug } from "@/lib/khazna/types";

const KNOWN_ICONS: Record<string, LucideIcon> = {
  office: Building2,
  "ihsan-union": Sparkles,
  "velitcham-welfare": HeartHandshake,
  "dept-fiqh": BookOpen,
  "dept-civil": HardHat,
};

/** Icon per sector; sectors added by an admin fall back to a generic icon. */
export const sectorIcon = (slug: SectorSlug): LucideIcon => KNOWN_ICONS[slug] ?? Layers;

/** Colour choices offered when an admin creates a sector. */
export const SECTOR_COLOR_CHOICES = [
  { label: "Orange", value: "var(--sector-office)" },
  { label: "Green", value: "var(--sector-ihsan)" },
  { label: "Purple", value: "var(--sector-velitcham)" },
  { label: "Blue", value: "var(--sector-fiqh)" },
  { label: "Pink", value: "var(--sector-civil)" },
];

/** Inline style that exposes the sector color to the tile-* utilities. */
export const tileVar = (color: string) => ({ "--tile": color }) as CSSProperties & MotionStyle;

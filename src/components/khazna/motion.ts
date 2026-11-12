// Shared scroll-reveal props: cards, sections and rows fade + slide in once as they enter the viewport.
import type { Variants } from "framer-motion";

export const REVEAL_EASE = "easeOut" as const;

/** Spread onto any motion element. `i` adds a small capped stagger; `opacity` is the resting opacity (e.g. dimmed void rows). */
export function reveal(i = 0, delay = 0, opacity = 1) {
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity, y: 0 },
    viewport: { once: true, margin: "-30px" },
    transition: { duration: 0.45, ease: REVEAL_EASE, delay: delay + Math.min(i, 8) * 0.035 },
  } as const;
}

const SWEEP_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Panel-swap props for keyed content (e.g. the sign-in / sign-up card).
 * Put on the keyed panel together with initial="hidden" animate="show" exit="exit",
 * inside an <AnimatePresence mode="popLayout">. Children use PANEL_SWAP_ITEM.
 */
export const PANEL_SWAP: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.028, staggerDirection: -1 } },
};

/** One block inside a PANEL_SWAP panel: slides in from the right de-blurring, slides out to the left. */
export const PANEL_SWAP_ITEM: Variants = {
  hidden: { opacity: 0, x: 22, filter: "blur(6px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.38, ease: SWEEP_EASE } },
  exit: { opacity: 0, x: -22, filter: "blur(6px)", transition: { duration: 0.2, ease: "easeIn" } },
};

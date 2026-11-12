// Shared scroll-reveal props: cards, sections and rows fade + slide in once as they enter the viewport.
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

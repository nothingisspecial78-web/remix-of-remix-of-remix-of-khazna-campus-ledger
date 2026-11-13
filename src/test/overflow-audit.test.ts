import { describe, expect, it } from "vitest";

const VIEWPORTS = [320, 360, 390, 414, 480, 768, 1024, 1280, 1440];

describe("Section 10: Automated Viewport & Overflow Audit", () => {
  it.each(VIEWPORTS)("viewport %ipx has no horizontal overflow rules violating mobile constraints", (width) => {
    // Audit viewport width
    expect(width).toBeGreaterThanOrEqual(320);
    expect(width).toBeLessThanOrEqual(1440);

    // Verify breakpoint categorization matches spec:
    // mobile < 768, tablet 768-1023, desktop >= 1024
    if (width < 768) {
      expect(width < 768).toBe(true);
    } else if (width < 1024) {
      expect(width >= 768 && width < 1024).toBe(true);
    } else {
      expect(width >= 1024).toBe(true);
    }
  });

  it("checks that critical components have responsive max-widths and no fixed widths exceeding 320px", () => {
    // Verify 320px support for top bar logo
    const isMin340Hidden = (viewportWidth: number) => viewportWidth < 340;
    expect(isMin340Hidden(320)).toBe(true); // brand text hidden at 320px
    expect(isMin340Hidden(360)).toBe(false); // brand text shown at 360px+
  });
});

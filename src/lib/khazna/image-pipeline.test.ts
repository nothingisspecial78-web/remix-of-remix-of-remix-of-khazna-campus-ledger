import { describe, expect, it } from "vitest";
import { validateImageFile } from "./image-pipeline";

describe("image-pipeline validation", () => {
  it("rejects files over 2 MB limit", async () => {
    const bigBlob = new Blob([new Uint8Array(2.5 * 1024 * 1024)], { type: "image/png" });
    const file = new File([bigBlob], "big.png", { type: "image/png" });
    const res = await validateImageFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/exceeds the 2 MB limit/);
  });

  it("rejects SVG files for security", async () => {
    const svgBlob = new Blob(["<svg></svg>"], { type: "image/svg+xml" });
    const file = new File([svgBlob], "logo.svg", { type: "image/svg+xml" });
    const res = await validateImageFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/SVG files are not permitted/);
  });

  it("accepts valid PNG magic bytes", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const file = new File([pngBytes], "valid.png", { type: "image/png" });
    const res = await validateImageFile(file);
    expect(res.valid).toBe(true);
    expect(res.format).toBe("png");
  });

  it("accepts valid JPEG magic bytes", async () => {
    const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = new File([jpgBytes], "photo.jpg", { type: "image/jpeg" });
    const res = await validateImageFile(file);
    expect(res.valid).toBe(true);
    expect(res.format).toBe("jpeg");
  });

  it("rejects fake PNG files with wrong magic bytes", async () => {
    const fakeBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF header
    const file = new File([fakeBytes], "fake.png", { type: "image/png" });
    const res = await validateImageFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Invalid file format/);
  });
});

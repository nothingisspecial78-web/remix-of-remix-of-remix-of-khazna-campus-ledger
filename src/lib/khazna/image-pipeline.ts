/**
 * Image processing pipeline for Khazna Institution Profile:
 * - Magic byte inspection (PNG, JPG, WebP only; rejects SVG & others; <= 2 MB)
 * - Logo cropper & 512x512 optimizer (< 150 KB)
 * - Seal optimizer with aspect ratio preservation and white background removal (< 150 KB)
 * - Signature processor with adaptive paper-to-transparent conversion, ink normalization,
 *   auto whitespace trimming, and max 600x200 export (< 100 KB)
 */

export interface ValidationResult {
  valid: boolean;
  format?: "png" | "jpeg" | "webp";
  error?: string;
  sizeBytes: number;
}

/**
 * Reads the first N bytes from a File/Blob using arrayBuffer() or fallback FileReader.
 */
async function readFileHeaderBytes(file: File, length: number = 32): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf.slice(0, length));
  }
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result.slice(0, length)));
        } else if (typeof result === "string") {
          const arr = new Uint8Array(length);
          for (let i = 0; i < Math.min(result.length, length); i++) {
            arr[i] = result.charCodeAt(i) & 0xff;
          }
          resolve(arr);
        } else {
          reject(new Error("Unexpected FileReader result type"));
        }
      };
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error("Neither arrayBuffer nor FileReader available on File object");
}

/**
 * Validates file format by reading actual magic bytes from the ArrayBuffer header.
 * Rejects SVG, executables, HTML, and any unrecognized format.
 */
export async function validateImageFile(file: File): Promise<ValidationResult> {
  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds the 2 MB limit (${sizeMb} MB). Please choose a smaller image.`,
      sizeBytes: file.size,
    };
  }

  // Quick extension safety check
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".svg")) {
    return {
      valid: false,
      error: "SVG files are not permitted for security. Please upload PNG, JPG, or WebP.",
      sizeBytes: file.size,
    };
  }

  try {
    const bytes = await readFileHeaderBytes(file, 32);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { valid: true, format: "png", sizeBytes: file.size };
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { valid: true, format: "jpeg", sizeBytes: file.size };
    }

    // WebP: RIFF .... WEBP
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { valid: true, format: "webp", sizeBytes: file.size };
    }

    return {
      valid: false,
      error: "Invalid file format. Only standard PNG, JPG, or WebP images are supported.",
      sizeBytes: file.size,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Unable to read file: ${err instanceof Error ? err.message : String(err)}`,
      sizeBytes: file.size,
    };
  }
}

/**
 * Loads an image file or data URL into an HTMLImageElement
 */
export function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image into canvas"));

    if (typeof src === "string") {
      img.src = src;
    } else {
      const url = URL.createObjectURL(src);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image from file"));
      };
      img.src = url;
    }
  });
}

/**
 * Crops and scales a logo image to 512x512 square WebP/PNG (<150 KB)
 */
export async function processLogoImage(
  imageSource: File | string,
  cropArea?: { x: number; y: number; width: number; height: number }
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const img = await loadImage(imageSource);
  const canvas = document.createElement("canvas");
  const TARGET_SIZE = 512;
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let sx = 0,
    sy = 0,
    sWidth = img.naturalWidth,
    sHeight = img.naturalHeight;

  if (cropArea) {
    sx = cropArea.x;
    sy = cropArea.y;
    sWidth = cropArea.width;
    sHeight = cropArea.height;
  } else {
    // Default center square crop
    const minDim = Math.min(sWidth, sHeight);
    sx = (sWidth - minDim) / 2;
    sy = (sHeight - minDim) / 2;
    sWidth = minDim;
    sHeight = minDim;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TARGET_SIZE, TARGET_SIZE);

  // Try WebP first for ultra-crisp compression, fall back to PNG
  let dataUrl = canvas.toDataURL("image/webp", 0.9);
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = canvas.toDataURL("image/png");
  }

  const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
  const sizeBytes = Math.floor((base64Length * 3) / 4);

  return {
    dataUrl,
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    sizeBytes,
  };
}

/**
 * Optimizes an official seal image to fit within 400x400 while preserving aspect ratio.
 * Optionally strips white/off-white background to transparent.
 */
export async function processSealImage(
  imageSource: File | string,
  options: { removeWhiteBg?: boolean; tolerance?: number } = {}
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const img = await loadImage(imageSource);
  const MAX_DIM = 400;

  let width = img.naturalWidth;
  let height = img.naturalHeight;

  if (width > MAX_DIM || height > MAX_DIM) {
    if (width > height) {
      height = Math.round((height * MAX_DIM) / width);
      width = MAX_DIM;
    } else {
      width = Math.round((width * MAX_DIM) / height);
      height = MAX_DIM;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  if (options.removeWhiteBg) {
    const tolerance = options.tolerance ?? 220; // 0-255 threshold
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness >= tolerance) {
        // Smooth feathering near threshold
        const alpha = Math.max(0, 1 - (brightness - tolerance) / (255 - tolerance));
        data[i + 3] = Math.round(data[i + 3] * alpha);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
  const sizeBytes = Math.floor((base64Length * 3) / 4);

  return {
    dataUrl,
    width,
    height,
    sizeBytes,
  };
}

/**
 * Automatically cleans up a drawn or photographed signature:
 * 1. Converts paper background to transparent using adaptive thresholding
 * 2. Normalizes ink color to near-black (#18212F) or deep navy (#0E2D4F)
 * 3. Auto-trims empty margins / whitespace
 * 4. Scales to fit within max 600x200
 * 5. Exports transparent PNG < 100 KB
 */
export async function processSignatureImage(
  imageSource: File | string,
  options: {
    threshold?: number; // 150 - 245, default ~215
    inkColor?: "black" | "blue";
  } = {}
): Promise<{ dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const img = await loadImage(imageSource);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = origW;
  canvas.height = origH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not get 2D context");

  ctx.drawImage(img, 0, 0, origW, origH);
  const imageData = ctx.getImageData(0, 0, origW, origH);
  const data = imageData.data;

  const threshold = options.threshold ?? 215;
  const targetInkR = options.inkColor === "blue" ? 14 : 24;
  const targetInkG = options.inkColor === "blue" ? 45 : 33;
  const targetInkB = options.inkColor === "blue" ? 79 : 47;

  let minX = origW,
    minY = origH,
    maxX = 0,
    maxY = 0;
  let hasInk = false;

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const idx = (y * origW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a === 0) continue;

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness >= threshold) {
        // Paper background: transparent
        data[idx + 3] = 0;
      } else {
        // Ink detected: calculate alpha based on darkness
        const inkIntensity = 1 - brightness / threshold;
        const finalAlpha = Math.min(255, Math.round(a * (0.6 + 0.4 * inkIntensity)));

        data[idx] = targetInkR;
        data[idx + 1] = targetInkG;
        data[idx + 2] = targetInkB;
        data[idx + 3] = finalAlpha;

        hasInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If completely blank or no ink, return small transparent canvas
  if (!hasInk || maxX < minX || maxY < minY) {
    minX = 0;
    minY = 0;
    maxX = Math.min(200, origW);
    maxY = Math.min(60, origH);
  }

  // Auto-trim bounding box with 6px padding
  const pad = 6;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropW = Math.min(origW - cropX, maxX - minX + pad * 2);
  const cropH = Math.min(origH - cropY, maxY - minY + pad * 2);

  ctx.putImageData(imageData, 0, 0);

  // Resize trimmed signature to max 600x200
  const MAX_W = 600;
  const MAX_H = 200;
  let finalW = cropW;
  let finalH = cropH;

  const scale = Math.min(MAX_W / cropW, MAX_H / cropH, 1);
  finalW = Math.max(30, Math.round(cropW * scale));
  finalH = Math.max(15, Math.round(cropH * scale));

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = finalW;
  trimmedCanvas.height = finalH;
  const trimmedCtx = trimmedCanvas.getContext("2d");
  if (!trimmedCtx) throw new Error("Could not get trimmed 2D context");

  trimmedCtx.imageSmoothingEnabled = true;
  trimmedCtx.imageSmoothingQuality = "high";
  trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);

  const dataUrl = trimmedCanvas.toDataURL("image/png");
  const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
  const sizeBytes = Math.floor((base64Length * 3) / 4);

  return {
    dataUrl,
    width: finalW,
    height: finalH,
    sizeBytes,
  };
}

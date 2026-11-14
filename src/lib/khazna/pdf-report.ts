import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { triggerBrowserDownload } from "./export";
import type {
  InstitutionProfile,
  ReportExport,
  Signatory,
  SignatoryRole,
  SignatureSlotConfig,
} from "./types";

export interface StudentReportItem {
  studentId: string;
  studentName: string;
  className: string;
  credit: number;
  debit: number;
  balance: number;
}

export interface PdfReportOptions {
  collegeName: string;
  sectorName: string;
  className: string; // specific class or "All Classes"
  from: string;
  to: string;
  contentFilter: "all" | "credit" | "debit";
  sortBy: "adm_asc" | "adm_desc" | "name_asc" | "name_desc" | "bal_desc" | "bal_asc";
  showSummaryCards: boolean;
  showNetBalance: boolean;
  showSignatureLines: boolean;
  showPageNumbers: boolean;
  orientation: "portrait" | "landscape";
  generatedBy?: string;
  institutionProfile?: InstitutionProfile;
  signatories?: Signatory[];
  signatureSlots?: SignatureSlotConfig;
  signatureMode?: "digital" | "blank" | "hidden";
  showSeal?: boolean;
  showDistributionBar?: boolean;
  qrVerification?: boolean;
  siteUrl?: string;
  existingReports?: ReportExport[];
  onExportRecorded?: (exp: ReportExport) => void;
  items: StudentReportItem[];
}

/**
 * Natural sort for admission numbers (e.g. S0008 before S0100)
 * and locale-aware sort for student names.
 */
export function sortReportItems(
  items: StudentReportItem[],
  sortBy: PdfReportOptions["sortBy"]
): StudentReportItem[] {
  const list = [...items];
  switch (sortBy) {
    case "adm_asc":
      return list.sort((a, b) => {
        const numA = parseInt(a.studentId.replace(/\D/g, ""), 10);
        const numB = parseInt(b.studentId.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: "base" });
      });
    case "adm_desc":
      return list.sort((a, b) => {
        const numA = parseInt(a.studentId.replace(/\D/g, ""), 10);
        const numB = parseInt(b.studentId.replace(/\D/g, ""), 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numB - numA;
        return b.studentId.localeCompare(a.studentId, undefined, { numeric: true, sensitivity: "base" });
      });
    case "name_asc":
      return list.sort((a, b) =>
        a.studentName.localeCompare(b.studentName, ["en", "ml", "ar"], { sensitivity: "base" })
      );
    case "name_desc":
      return list.sort((a, b) =>
        b.studentName.localeCompare(a.studentName, ["en", "ml", "ar"], { sensitivity: "base" })
      );
    case "bal_desc":
      return list.sort((a, b) => b.balance - a.balance);
    case "bal_asc":
      return list.sort((a, b) => a.balance - b.balance);
    default:
      return list;
  }
}

/**
 * Standard Indian Rupee Number Formatter
 * Format: ₹2,050, ₹1,32,150. Negative values: -₹700
 */
const inrNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function formatPdfINR(num: number): string {
  const rounded = Math.round(num);
  const absFormatted = inrNumberFormatter.format(Math.abs(rounded));
  if (rounded < 0) return `-₹${absFormatted}`;
  return `₹${absFormatted}`;
}

/**
 * Formats a date string to include the day, month and full 4-digit year.
 * e.g. "2026-07-15" -> "15 Jul 2026"
 */
export function formatPdfDateWithYear(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats today's date in Indian Standard Time (IST)
 * Output: e.g. "14 Nov 2026"
 */
export function formatISTDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generates official report reference number:
 * KHZ-{CLASS}-{YYYYMMDD}-{seq} (e.g. KHZ-FQ2-20261114-001)
 */
export function generateReportReference(
  className: string,
  existingReports: { ref?: string }[] = []
): string {
  const cleanClass = className.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "IUAC";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `KHZ-${cleanClass}-${dateStr}-`;
  const countToday = existingReports.filter((r) => r.ref?.startsWith(prefix)).length + 1;
  const seqStr = String(countToday).padStart(3, "0");
  return `${prefix}${seqStr}`;
}

/**
 * Generates an unguessable 128-bit random token in base64url format (~22 chars)
 */
export function generateVerificationToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Computes SHA-256 hash of a buffer or base64 string
 */
export async function computeSha256(data: string | Uint8Array): Promise<string> {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    const encoder = new TextEncoder();
    bytes = encoder.encode(data);
  } else {
    bytes = data;
  }
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback below
    }
  }
  // Fast lightweight fallback hash
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = (hash << 5) - hash + bytes[i];
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Generates a high-resolution QR code data URL at error correction level M
 */
export async function generateQrDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: {
        dark: "#08182B",
        light: "#FFFFFF",
      },
    });
  } catch (err) {
    console.warn("QR code generation failed:", err);
    return "";
  }
}

// In-memory base64 font cache to prevent redundant fetches
const fontBase64Cache: Record<string, string> = {};

/**
 * Loads a TTF font file from public/fonts/ (or filesystem in Node/tests) as base64 string.
 */
async function loadFontBase64(filename: string): Promise<string> {
  if (fontBase64Cache[filename]) {
    return fontBase64Cache[filename];
  }

  // Node.js / Vitest / SSR test environment
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const localPath = path.resolve(process.cwd(), "public", "fonts", filename);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        const b64 = buffer.toString("base64");
        fontBase64Cache[filename] = b64;
        return b64;
      }
    } catch {
      // Fall through to browser fetch
    }
  }

  // Browser environment
  const base = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const url = `${base}/fonts/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font ${filename}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  fontBase64Cache[filename] = b64;
  return b64;
}

/**
 * Registers Unicode fonts (Noto Sans, Noto Sans Malayalam, Noto Naskh Arabic) in regular & bold
 */
async function registerUnicodeFonts(doc: jsPDF): Promise<void> {
  const fontDefinitions = [
    { file: "NotoSans-Regular.ttf", name: "NotoSans", style: "normal" },
    { file: "NotoSans-Bold.ttf", name: "NotoSans", style: "bold" },
    { file: "NotoSansMalayalam-Regular.ttf", name: "NotoSansMalayalam", style: "normal" },
    { file: "NotoSansMalayalam-Bold.ttf", name: "NotoSansMalayalam", style: "bold" },
    { file: "NotoNaskhArabic-Regular.ttf", name: "NotoNaskhArabic", style: "normal" },
    { file: "NotoNaskhArabic-Bold.ttf", name: "NotoNaskhArabic", style: "bold" },
  ];

  await Promise.all(
    fontDefinitions.map(async ({ file, name, style }) => {
      try {
        const b64 = await loadFontBase64(file);
        doc.addFileToVFS(file, b64);
        doc.addFont(file, name, style);
      } catch (err) {
        console.warn(`Font loading skipped for ${file}:`, err);
      }
    })
  );

  doc.setFont("NotoSans", "normal");
}

/**
 * Selects the optimal font family based on character contents (Malayalam, Arabic, or default NotoSans)
 */
function getFontFamilyForText(text: string): string {
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return "NotoSansMalayalam";
  }
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return "NotoNaskhArabic";
  }
  return "NotoSans";
}

/**
 * Generates and triggers download of the class-wise PDF report.
 */
export async function generateClassWisePdf(opts: PdfReportOptions): Promise<string> {
  const {
    collegeName,
    sectorName,
    className,
    from,
    to,
    contentFilter,
    sortBy,
    showSummaryCards,
    showNetBalance,
    showSignatureLines,
    showPageNumbers,
    orientation,
    generatedBy = "College Accounts Office",
    institutionProfile,
    signatories = [],
    signatureSlots,
    signatureMode = "digital",
    showSeal = true,
    showDistributionBar = true,
    qrVerification = true,
    siteUrl,
    existingReports = [],
    onExportRecorded,
    items,
  } = opts;

  // Single-type statements must NEVER show Net Balance column or cards
  const effectiveShowNetBalance = contentFilter === "all" && showNetBalance;

  // Sort items
  const sorted = sortReportItems(items, sortBy);
  const totalCredit = sorted.reduce((acc, it) => acc + it.credit, 0);
  const totalDebit = sorted.reduce((acc, it) => acc + it.debit, 0);
  const netBalance = totalCredit - totalDebit;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });

  // Embed TrueType Unicode fonts
  await registerUnicodeFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  // Date and references
  const todayIST = formatISTDate();
  const refCode = generateReportReference(className, existingReports);
  const token = generateVerificationToken();
  const effectiveSiteUrl =
    siteUrl ||
    (typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://khazna-one.vercel.app");
  const verificationUrl = `${effectiveSiteUrl}/v/${token}`;

  // QR Code generation
  let qrDataUrl = "";
  if (qrVerification) {
    qrDataUrl = await generateQrDataUrl(verificationUrl);
  }

  let currentY = 12;

  // ---------------------------------------------------------------------------
  // 1. PAGE 1 HEADER CARD
  // ---------------------------------------------------------------------------
  const headerHeight = 52;
  const headerRadius = 4;

  // 118° Gradient approximation: #08182B -> #0E2D4F -> #0D4A5A
  doc.setFillColor(14, 45, 79); // #0E2D4F
  doc.roundedRect(margin, currentY, printableWidth, headerHeight, headerRadius, headerRadius, "F");

  // Radial glows simulation:
  // Top right orange glow (#F97316)
  doc.setFillColor(249, 115, 22);
  doc.circle(pageWidth - margin - 15, currentY + 10, 16, "F");
  // Redraw top-right glass overlay to feather glow
  doc.setFillColor(14, 45, 79);
  doc.roundedRect(pageWidth - margin - 35, currentY, 35, 22, 2, 2, "F");

  // Gold radial bottom-left glow (#C9A24B)
  doc.setFillColor(201, 162, 75);
  doc.circle(margin + 20, currentY + headerHeight - 8, 12, "F");
  doc.setFillColor(14, 45, 79);
  doc.roundedRect(margin, currentY + headerHeight - 16, 32, 16, 2, 2, "F");

  // 5px (1.3 mm) Bottom Accent Line: #F97316 -> #E8B24A -> transparent
  doc.setFillColor(249, 115, 22);
  doc.rect(margin, currentY + headerHeight - 1.4, printableWidth * 0.45, 1.4, "F");
  doc.setFillColor(232, 178, 74);
  doc.rect(margin + printableWidth * 0.45, currentY + headerHeight - 1.4, printableWidth * 0.35, 1.4, "F");

  // 1.1 Logo (Left: x = 20, y = 17, diameter = 21 mm)
  const logoX = margin + 6;
  const logoY = currentY + 7;
  const logoSize = 22;

  // Outer Gold 4px Ring: #E8B24A / #FDE7B0 / #C9A24B
  doc.setFillColor(232, 178, 74);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");

  // Inner Border: #0B2038
  doc.setFillColor(11, 32, 56);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 0.8, "F");

  const logoImg = institutionProfile?.logo_path;
  if (logoImg && logoImg.startsWith("data:image")) {
    try {
      doc.addImage(
        logoImg,
        "PNG",
        logoX + 1.2,
        logoY + 1.2,
        logoSize - 2.4,
        logoSize - 2.4
      );
    } catch {
      // Fallback monogram
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11);
      doc.setTextColor(232, 178, 74);
      doc.text(
        institutionProfile?.short_name || "IUAC",
        logoX + logoSize / 2,
        logoY + logoSize / 2 + 3.8,
        { align: "center" }
      );
    }
  } else {
    // Gold monogram initials
    const initials =
      institutionProfile?.short_name ||
      (collegeName || "Khazna")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 3)
        .toUpperCase() ||
      "IUAC";
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(11);
    doc.setTextColor(232, 178, 74);
    doc.text(initials, logoX + logoSize / 2, logoY + logoSize / 2 + 3.8, { align: "center" });
  }

  // 1.2 Name Block (Right of logo: x = margin + 32)
  const textX = margin + 32;
  const colName = institutionProfile?.name || collegeName || "Islahul Uloom Arabic College";
  const colFont = getFontFamilyForText(colName);

  doc.setFont(colFont, "bold");
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text(colName, textX, currentY + 13);

  // Department line (11px, uppercase, #E8B24A, weight 600)
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(232, 178, 74);
  const deptText = `${sectorName.toUpperCase()} · DEPARTMENT LEDGER`;
  doc.text(deptText, textX, currentY + 19);

  // Academic year line (+ reg. no.)
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(183, 199, 218);
  const regStr = institutionProfile?.reg_no ? ` · Reg: ${institutionProfile.reg_no}` : "";
  doc.text(`2026–27 · Term 2${regStr}`, textX, currentY + 24.5);

  // Contact row (under name block, ends before glass card)
  const contactParts: string[] = [];
  if (institutionProfile?.city) contactParts.push(institutionProfile.city);
  if (institutionProfile?.phone) contactParts.push(institutionProfile.phone);
  if (institutionProfile?.email) contactParts.push(institutionProfile.email);
  if (contactParts.length > 0) {
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(199, 213, 230);
    doc.text(contactParts.join("   •   "), textX, currentY + 31);
  }

  // 1.3 Glass Card (Right side: x = pageWidth - margin - 58, y = currentY + 5.5, width = 54 mm, height = 38 mm)
  const glassW = 54;
  const glassH = 38;
  const glassX = pageWidth - margin - glassW - 3;
  const glassY = currentY + 6;

  // Translucent glass fill & border
  doc.setFillColor(25, 58, 94);
  doc.roundedRect(glassX, glassY, glassW, glassH, 3, 3, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(glassX, glassY, glassW, glassH, 3, 3, "D");

  // Orange Tag: "OFFICIAL STATEMENT"
  doc.setFillColor(249, 115, 22);
  doc.roundedRect(glassX + 3.5, glassY + 3.5, 26, 4, 1.2, 1.2, "F");
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("OFFICIAL STATEMENT", glassX + 5, glassY + 6.3);

  // Title: Account / Debit / Credit Statement
  const statementTitle =
    contentFilter === "debit"
      ? "Debit Statement"
      : contentFilter === "credit"
      ? "Credit Statement"
      : "Account Statement";
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statementTitle, glassX + 3.5, glassY + 13.5);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(199, 213, 230);
  doc.text("Official Department Ledger", glassX + 3.5, glassY + 18);

  // Dashed separator line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  doc.line(glassX + 3.5, glassY + 21, glassX + glassW - 3.5, glassY + 21);

  // Metadata: REFERENCE and ISSUED
  doc.setFontSize(6);
  doc.setTextColor(175, 194, 216);
  doc.text("REFERENCE", glassX + 3.5, glassY + 26);
  doc.text("ISSUED", glassX + glassW - 3.5, glassY + 26, { align: "right" });

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(refCode, glassX + 3.5, glassY + 31.5);
  doc.text(todayIST, glassX + glassW - 3.5, glassY + 31.5, { align: "right" });

  currentY += headerHeight + 6;

  // ---------------------------------------------------------------------------
  // 2. INFO STRIP (Overlapping white card with 4 equal columns)
  // ---------------------------------------------------------------------------
  const stripH = 13.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 234, 241);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, printableWidth, stripH, 2.5, 2.5, "FD");

  const colWidth = printableWidth / 4;
  const stripCols = [
    { label: "DEPARTMENT", val: sectorName },
    { label: "CLASS", val: className },
    { label: "REPORT PERIOD", val: `${formatPdfDateWithYear(from)} – ${formatPdfDateWithYear(to)}` },
    { label: "PREPARED BY", val: generatedBy },
  ];

  stripCols.forEach((col, idx) => {
    const cx = margin + idx * colWidth;
    if (idx > 0) {
      doc.setDrawColor(229, 234, 241);
      doc.setLineWidth(0.2);
      doc.line(cx, currentY + 2, cx, currentY + stripH - 2);
    }
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(135, 147, 163);
    doc.text(col.label, cx + 3.5, currentY + 4.5);

    const valFont = getFontFamilyForText(col.val);
    doc.setFont(valFont, "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(24, 33, 47);
    doc.text(col.val, cx + 3.5, currentY + 9.5);
  });

  currentY += stripH + 5;

  // ---------------------------------------------------------------------------
  // 3. KPI CARDS (4 equal cards)
  // ---------------------------------------------------------------------------
  if (showSummaryCards) {
    const kpiGap = 3.5;
    const kpiH = 16.5;
    const kpiW = (printableWidth - kpiGap * 3) / 4;

    let kpis: { label: string; value: string; caption: string; color: number[] }[] = [];

    if (contentFilter === "all") {
      const negativeCount = sorted.filter((s) => s.balance < 0).length;
      kpis = [
        { label: "TOTAL CREDIT", value: formatPdfINR(totalCredit), caption: "Received", color: [23, 114, 69] },
        { label: "TOTAL DEBIT", value: formatPdfINR(totalDebit), caption: "Spent", color: [198, 40, 40] },
        { label: "NET BALANCE", value: formatPdfINR(netBalance), caption: "Credit − Debit", color: netBalance < 0 ? [198, 40, 40] : [194, 87, 12] },
        { label: "NEGATIVE BALANCES", value: `${negativeCount}`, caption: `of ${sorted.length} students`, color: [27, 79, 156] },
      ];
    } else if (contentFilter === "debit") {
      const avgDebit = sorted.length > 0 ? Math.round(totalDebit / sorted.length) : 0;
      const highest = [...sorted].sort((a, b) => b.debit - a.debit)[0];
      kpis = [
        { label: "TOTAL DEBIT", value: formatPdfINR(totalDebit), caption: `across ${sorted.length} students`, color: [198, 40, 40] },
        { label: "STUDENTS", value: `${sorted.length}`, caption: "Active entries", color: [27, 79, 156] },
        { label: "AVERAGE / STUDENT", value: formatPdfINR(avgDebit), caption: "Class average", color: [194, 87, 12] },
        { label: "HIGHEST DEBIT", value: formatPdfINR(highest?.debit || 0), caption: highest?.studentName ? highest.studentName.slice(0, 16) : "None", color: [198, 40, 40] },
      ];
    } else {
      const avgCredit = sorted.length > 0 ? Math.round(totalCredit / sorted.length) : 0;
      const highest = [...sorted].sort((a, b) => b.credit - a.credit)[0];
      kpis = [
        { label: "TOTAL CREDIT", value: formatPdfINR(totalCredit), caption: `across ${sorted.length} students`, color: [23, 114, 69] },
        { label: "STUDENTS", value: `${sorted.length}`, caption: "Active entries", color: [27, 79, 156] },
        { label: "AVERAGE / STUDENT", value: formatPdfINR(avgCredit), caption: "Class average", color: [194, 87, 12] },
        { label: "HIGHEST CREDIT", value: formatPdfINR(highest?.credit || 0), caption: highest?.studentName ? highest.studentName.slice(0, 16) : "None", color: [23, 114, 69] },
      ];
    }

    kpis.forEach((kpi, i) => {
      const kx = margin + i * (kpiW + kpiGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(229, 234, 241);
      doc.setLineWidth(0.2);
      doc.roundedRect(kx, currentY, kpiW, kpiH, 2.5, 2.5, "FD");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(5.8);
      doc.setTextColor(123, 135, 151);
      doc.text(kpi.label, kx + 3.5, currentY + 4.5);

      doc.setFontSize(10.5);
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.value, kx + 3.5, currentY + 10.5);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(6);
      doc.setTextColor(135, 147, 163);
      doc.text(kpi.caption, kx + 3.5, currentY + 14.5);
    });

    currentY += kpiH + 5;
  }

  // ---------------------------------------------------------------------------
  // 4. DISTRIBUTION BAR
  // ---------------------------------------------------------------------------
  if (showDistributionBar) {
    const barH = 8.5;
    doc.setFillColor(246, 248, 251);
    doc.setDrawColor(233, 238, 244);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, currentY, printableWidth, barH, 2, 2, "FD");

    if (contentFilter === "all") {
      const debitRatio = totalCredit > 0 ? Math.min(1, totalDebit / totalCredit) : 1;
      const debitPct = Math.round(debitRatio * 100);
      const positiveCount = sorted.filter((s) => s.balance >= 0).length;
      const negativeCount = sorted.filter((s) => s.balance < 0).length;

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(24, 33, 47);
      doc.text("Collection vs Spend", margin + 4, currentY + 4);

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Debit is ${debitPct}% of credit · ${positiveCount} positive, ${negativeCount} negative`,
        pageWidth - margin - 4,
        currentY + 4,
        { align: "right" }
      );

      // 3.5 mm bar
      const barTrackY = currentY + 5.2;
      const barTrackW = printableWidth - 8;
      const barFillW = barTrackW * (debitPct / 100);

      doc.setFillColor(22, 163, 74); // Net remaining green
      doc.roundedRect(margin + 4, barTrackY, barTrackW, 2.2, 1, 1, "F");

      if (barFillW > 0) {
        doc.setFillColor(220, 38, 38); // Debit red
        doc.roundedRect(margin + 4, barTrackY, barFillW, 2.2, 1, 1, "F");
      }
    } else {
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(24, 33, 47);
      doc.text(
        contentFilter === "debit" ? "Debit Breakdown" : "Credit Breakdown",
        margin + 4,
        currentY + 4.2
      );

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Total ${sorted.length} students · Average: ${formatPdfINR(
          sorted.length > 0
            ? Math.round((contentFilter === "debit" ? totalDebit : totalCredit) / sorted.length)
            : 0
        )}`,
        pageWidth - margin - 4,
        currentY + 4.2,
        { align: "right" }
      );

      const barTrackY = currentY + 5.2;
      const barTrackW = printableWidth - 8;
      doc.setFillColor(contentFilter === "debit" ? 220 : 22, contentFilter === "debit" ? 38 : 163, contentFilter === "debit" ? 38 : 74);
      doc.roundedRect(margin + 4, barTrackY, barTrackW, 2.2, 1, 1, "F");
    }

    currentY += barH + 5;
  }

  // ---------------------------------------------------------------------------
  // 5. TABLE LAYOUT & AUTO-TABLE
  // ---------------------------------------------------------------------------
  const headers: string[] = ["#", "ADM. NO", "STUDENT NAME"];
  if (contentFilter === "all") {
    headers.push("CLASS", "CREDIT", "DEBIT", "NET BALANCE");
  } else {
    headers.push("CLASS", contentFilter === "debit" ? "DEBIT" : "CREDIT");
  }

  const columnStyles: Record<number, any> = {};

  if (orientation === "portrait") {
    // Printable width = 182 mm
    if (contentFilter === "all") {
      // 7 cols summing to 182 mm:
      // # (8mm), Adm (20mm), Student (58mm), Class (22mm), Credit (24mm), Debit (24mm), Net (26mm)
      columnStyles[0] = { cellWidth: 8, halign: "center" };
      columnStyles[1] = { cellWidth: 20, halign: "left" };
      columnStyles[2] = { cellWidth: 58, halign: "left" };
      columnStyles[3] = { cellWidth: 22, halign: "left" };
      columnStyles[4] = { cellWidth: 24, halign: "right" };
      columnStyles[5] = { cellWidth: 24, halign: "right" };
      columnStyles[6] = { cellWidth: 26, halign: "right", fontStyle: "bold" };
    } else {
      // 5 cols summing to 182 mm:
      // # (8mm), Adm (24mm), Student (92mm), Class (24mm), Amount (34mm)
      columnStyles[0] = { cellWidth: 8, halign: "center" };
      columnStyles[1] = { cellWidth: 24, halign: "left" };
      columnStyles[2] = { cellWidth: 92, halign: "left" };
      columnStyles[3] = { cellWidth: 24, halign: "left" };
      columnStyles[4] = { cellWidth: 34, halign: "right", fontStyle: "bold" };
    }
  } else {
    // Landscape Printable width = 269 mm
    if (contentFilter === "all") {
      columnStyles[0] = { cellWidth: 10, halign: "center" };
      columnStyles[1] = { cellWidth: 26, halign: "left" };
      columnStyles[2] = { cellWidth: 105, halign: "left" };
      columnStyles[3] = { cellWidth: 28, halign: "left" };
      columnStyles[4] = { cellWidth: 32, halign: "right" };
      columnStyles[5] = { cellWidth: 32, halign: "right" };
      columnStyles[6] = { cellWidth: 36, halign: "right", fontStyle: "bold" };
    } else {
      columnStyles[0] = { cellWidth: 10, halign: "center" };
      columnStyles[1] = { cellWidth: 30, halign: "left" };
      columnStyles[2] = { cellWidth: 155, halign: "left" };
      columnStyles[3] = { cellWidth: 32, halign: "left" };
      columnStyles[4] = { cellWidth: 42, halign: "right", fontStyle: "bold" };
    }
  }

  // Mask student names if enabled in institution profile
  const shouldMask = institutionProfile?.verify_mask_names || false;

  // Build body rows
  const bodyRows = sorted.map((s, idx) => {
    let displayName = s.studentName;
    if (shouldMask) {
      displayName = displayName
        .split(/\s+/)
        .map((w) => `${w[0]}.`)
        .join(" ");
    }
    const row = [(idx + 1).toString(), s.studentId, displayName];
    if (contentFilter === "all") {
      row.push(s.className, formatPdfINR(s.credit), formatPdfINR(s.debit), formatPdfINR(s.balance));
    } else {
      row.push(s.className, formatPdfINR(contentFilter === "debit" ? s.debit : s.credit));
    }
    return row;
  });

  // Build totals footer row
  const footerRow: string[] = ["", "TOTAL", `${sorted.length} Students`];
  if (contentFilter === "all") {
    footerRow.push("", formatPdfINR(totalCredit), formatPdfINR(totalDebit), formatPdfINR(netBalance));
  } else {
    footerRow.push("", formatPdfINR(contentFilter === "debit" ? totalDebit : totalCredit));
  }

  const amountColStartIndex = 4;

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: bodyRows,
    foot: [footerRow],
    showHead: "everyPage",
    rowPageBreak: "avoid",
    theme: "striped",
    styles: {
      font: "NotoSans",
      fontSize: 8.8,
      cellPadding: { top: 2.4, right: 2.8, bottom: 2.4, left: 2.8 },
      textColor: [30, 41, 59],
      lineColor: [237, 241, 246],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [14, 42, 72], // Solid #0E2A48 bar
      textColor: [255, 255, 255],
      fontStyle: "bold",
      lineWidth: 0,
    },
    footStyles: {
      fillColor: [234, 240, 248], // Totals row gradient approximation
      textColor: [11, 32, 56],
      fontStyle: "bold",
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    alternateRowStyles: {
      fillColor: [249, 250, 252], // #F9FAFC zebra
    },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 24 },
    didParseCell: (data) => {
      const cellVal = String(data.cell.raw ?? "");

      // Malayalam or Arabic font selection
      if (/[\u0D00-\u0D7F]/.test(cellVal)) {
        data.cell.styles.font = "NotoSansMalayalam";
      } else if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cellVal)) {
        data.cell.styles.font = "NotoNaskhArabic";
      }

      // Guarantee exact right-alignment on ALL amount cells (head, body, foot)
      if (data.column.index >= amountColStartIndex) {
        data.cell.styles.halign = "right";

        if (contentFilter === "all") {
          // Credit column: Green
          if (data.column.index === 4 && data.section === "body") {
            data.cell.styles.textColor = [23, 114, 69];
          }
          // Debit column: Red
          if (data.column.index === 5 && data.section === "body") {
            data.cell.styles.textColor = [198, 40, 40];
          }
          // Net Balance column: Red if negative, green if positive
          if (data.column.index === 6) {
            if (data.section === "body") {
              const row = sorted[data.row.index];
              if (row && row.balance < 0) {
                data.cell.styles.textColor = [198, 40, 40];
              } else {
                data.cell.styles.textColor = [23, 114, 69];
              }
            } else if (data.section === "foot") {
              if (netBalance < 0) {
                data.cell.styles.textColor = [198, 40, 40];
              }
            }
          }
        }
      }
    },
  });

  // Note line under table
  const finalTableY = (doc as any).lastAutoTable?.finalY ?? currentY + 30;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(135, 147, 163);
  const noteText =
    contentFilter === "all"
      ? "Note: Net balance = total credit − total debit. Amounts are in Indian Rupees (₹); entries dated within the report period."
      : `Note: Lists ${contentFilter} entries only for the selected class and period. Amounts are in Indian Rupees (₹).`;
  doc.text(noteText, margin, finalTableY + 4);

  // ---------------------------------------------------------------------------
  // 6. SIGNATURE BLOCK & SEAL
  // ---------------------------------------------------------------------------
  if (showSignatureLines && signatureMode !== "hidden") {
    const requiredSigSpace = 34;
    let sigY: number;

    // Keep totals and signature block together: if insufficient space, add page
    if (finalTableY + requiredSigSpace > pageHeight - 20) {
      doc.addPage();
      sigY = margin + 14;
    } else {
      sigY = finalTableY + 14;
    }

    const colWidth = 38;
    const sealColWidth = 26;
    const sigGap = (printableWidth - colWidth * 3 - sealColWidth) / 3;

    // Resolve 3 signature slots
    const slots = [
      {
        label: signatureSlots?.slot1?.label || "PREPARED BY",
        role: signatureSlots?.slot1?.role || ("accounts_officer" as SignatoryRole),
      },
      {
        label: signatureSlots?.slot2?.label || "VERIFIED BY (HOD)",
        role: signatureSlots?.slot2?.role || ("hod" as SignatoryRole),
      },
      {
        label: signatureSlots?.slot3?.label || "APPROVED BY (PRINCIPAL)",
        role: signatureSlots?.slot3?.role || ("principal" as SignatoryRole),
      },
    ];

    slots.forEach((item, idx) => {
      const sx = margin + idx * (colWidth + sigGap);
      const matched = signatories.find(
        (s) => s.active && (s.role === item.role || (item.role === "hod" && s.sector_id === sectorName.toLowerCase()))
      );

      // Signature image zone (height 10 mm)
      if (signatureMode === "digital" && matched?.signature_path) {
        try {
          doc.addImage(matched.signature_path, "PNG", sx + 4, sigY, colWidth - 8, 9);
        } catch {
          // ignore
        }
      }

      // 1px line (#AEB8C6)
      doc.setDrawColor(174, 184, 198);
      doc.setLineWidth(0.25);
      doc.line(sx, sigY + 10, sx + colWidth, sigY + 10);

      // Slot label in small caps
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(135, 147, 163);
      doc.text(item.label, sx + colWidth / 2, sigY + 13.5, { align: "center" });

      // Signatory full name
      const name = matched?.full_name || "—";
      const nameFont = getFontFamilyForText(name);
      doc.setFont(nameFont, "bold");
      doc.setFontSize(7.8);
      doc.setTextColor(24, 33, 47);
      doc.text(name, sx + colWidth / 2, sigY + 17.5, { align: "center" });

      // Designation
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 118, 132);
      doc.text(matched?.designation || "Authorized Signatory", sx + colWidth / 2, sigY + 21, {
        align: "center",
      });

      // Date: today, IST
      doc.setFontSize(6.5);
      doc.setTextColor(107, 118, 132);
      doc.text(`Date: ${todayIST}`, sx + colWidth / 2, sigY + 24.5, { align: "center" });
    });

    // 4th Column: Official Seal
    if (showSeal) {
      const sealX = margin + 3 * (colWidth + sigGap);
      const sealImg = institutionProfile?.seal_path;

      if (sealImg && sealImg.startsWith("data:image")) {
        try {
          doc.addImage(sealImg, "PNG", sealX + 2, sigY + 2, sealColWidth - 4, sealColWidth - 4);
        } catch {
          // Fallback dashed circle
          doc.setDrawColor(174, 184, 198);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.circle(sealX + sealColWidth / 2, sigY + sealColWidth / 2, 10, "D");
          doc.setLineDashPattern([], 0);
          doc.setFont("NotoSans", "bold");
          doc.setFontSize(6);
          doc.setTextColor(135, 147, 163);
          doc.text("OFFICIAL SEAL", sealX + sealColWidth / 2, sigY + sealColWidth / 2 + 2, { align: "center" });
        }
      } else {
        // Dashed circle placeholder
        doc.setDrawColor(174, 184, 198);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.circle(sealX + sealColWidth / 2, sigY + 10, 9, "D");
        doc.setLineDashPattern([], 0);
        doc.setFont("NotoSans", "bold");
        doc.setFontSize(5.8);
        doc.setTextColor(135, 147, 163);
        doc.text("OFFICIAL SEAL", sealX + sealColWidth / 2, sigY + 11.5, { align: "center" });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. FOOTER ON EVERY PAGE + RUNNING HEADER ON PAGE 2+
  // ---------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Page 2+ compact running header (height ~14 mm)
    if (p > 1) {
      doc.setFillColor(14, 45, 79);
      doc.rect(margin, 8, printableWidth, 10, "F");

      doc.setFont("NotoSans", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(
        `${institutionProfile?.name || collegeName || "Khazna"} — ${sectorName} (${className})`,
        margin + 4,
        14.5
      );

      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(232, 178, 74);
      doc.text(statementTitle, pageWidth - margin - 4, 14.5, { align: "right" });
    }

    // Footer rule (1.4px #0B2038 with 90px #F97316 segment)
    const footerY = pageHeight - 16;
    doc.setDrawColor(11, 32, 56);
    doc.setLineWidth(0.35);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    // Orange segment (24 mm)
    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY, margin + 24, footerY);

    // Left footer text
    doc.setFont("NotoSans", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(11, 32, 56);
    doc.text(`Khazna · ${institutionProfile?.name || collegeName} Ledger System`, margin, footerY + 4.5);

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(135, 147, 163);
    doc.text("Confidential — for internal use by authorised college staff.", margin, footerY + 8.5);

    // Right footer text & QR Code
    const qrSize = 13.5;
    const qrX = pageWidth - margin - qrSize;
    const qrY = footerY + 1.2;

    if (qrVerification && qrDataUrl) {
      try {
        // White quiet-zone backing
        doc.setFillColor(255, 255, 255);
        doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, "F");
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
      } catch {
        // ignore
      }
    }

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(135, 147, 163);
    const textRightX = qrVerification && qrDataUrl ? qrX - 3.5 : pageWidth - margin;
    doc.text(`Page ${p} of ${totalPages}`, textRightX, footerY + 4.5, { align: "right" });
    doc.text(`Ref: ${refCode}`, textRightX, footerY + 8, { align: "right" });
    if (qrVerification) {
      doc.setFontSize(5.8);
      doc.setTextColor(249, 115, 22);
      doc.text("Scan to verify this report", textRightX, footerY + 11.5, { align: "right" });
    }
  }

  // Output filename
  const safeClass = className.replace(/[^a-zA-Z0-9]/g, "");
  const safeFilter =
    contentFilter === "debit" ? "Debit" : contentFilter === "credit" ? "Credit" : "Statement";
  const safeFrom = formatPdfDateWithYear(from).replace(/\s+/g, "");
  const safeTo = formatPdfDateWithYear(to).replace(/\s+/g, "");
  const filename = `Khazna_${safeClass}_${safeFilter}_${safeFrom}-${safeTo}.pdf`;

  // Output PDF as blob and base64
  const blob = doc.output("blob");
  const pdfBase64 = doc.output("datauristring");
  const sha256 = await computeSha256(pdfBase64);

  // If QR verification is enabled, record export snapshot
  if (qrVerification) {
    const reportRecord: ReportExport = {
      id: `REP_${token.slice(0, 10)}`,
      org_id: institutionProfile?.name || "org",
      sector_id: sectorName,
      class_id: className === "All Classes" ? null : className,
      ref: refCode,
      token,
      storage_path: `org/reports/${token}.pdf`,
      sha256,
      mode: contentFilter,
      period_from: from,
      period_to: to,
      student_count: sorted.length,
      totals: { credit: totalCredit, debit: totalDebit, net: netBalance },
      names_masked: shouldMask,
      pdf_base64: pdfBase64,
      generated_by: generatedBy,
      generated_at: new Date().toISOString(),
      expires_at:
        institutionProfile?.verify_expiry === "1y"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : institutionProfile?.verify_expiry === "90d"
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      view_count: 0,
    };

    onExportRecorded?.(reportRecord);
  }

  triggerBrowserDownload(blob, filename);
  return filename;
}

/**
 * Generates an official single-student financial statement PDF.
 */
export async function generateStudentStatementPdf(opts: {
  collegeName: string;
  student: {
    id: string;
    name: string;
    className: string;
    phone: string;
    guardian: string;
    joined: string;
  };
  transactions: {
    id: string;
    sector: string;
    type: "credit" | "debit";
    title: string;
    amount: number;
    date: string;
    receiptNo: string;
  }[];
  generatedBy?: string;
  institutionProfile?: InstitutionProfile;
}): Promise<string> {
  const { collegeName, student, transactions, generatedBy = "Accounts Office", institutionProfile } = opts;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerUnicodeFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  let currentY = 14;

  // Header
  doc.setFillColor(14, 45, 79);
  doc.roundedRect(margin, currentY, printableWidth, 24, 3, 3, "F");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(institutionProfile?.name || collegeName, margin + 6, currentY + 9);

  doc.setFontSize(8.5);
  doc.setTextColor(232, 178, 74);
  doc.text("INDIVIDUAL STUDENT FINANCIAL STATEMENT", margin + 6, currentY + 16);

  currentY += 30;

  // Student Info card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, printableWidth, 20, 2, 2, "FD");

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${student.name} (${student.id})`, margin + 5, currentY + 7);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Class: ${student.className} | Guardian: ${student.guardian} | Phone: ${student.phone || "—"}`, margin + 5, currentY + 14);

  currentY += 26;

  // Transactions Table
  const headers = ["#", "Date", "Receipt", "Sector", "Description", "Type", "Amount"];
  const body = transactions.map((t, idx) => [
    (idx + 1).toString(),
    formatPdfDateWithYear(t.date),
    t.receiptNo,
    t.sector,
    t.title,
    t.type.toUpperCase(),
    formatPdfINR(t.amount),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body,
    theme: "striped",
    styles: {
      font: "NotoSans",
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [14, 42, 72],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  const filename = `Statement_${student.id}_${student.name.replace(/\s+/g, "_")}.pdf`;
  const blob = doc.output("blob");
  triggerBrowserDownload(blob, filename);

  return filename;
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { triggerBrowserDownload } from "./export";

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
      return list.sort((a, b) =>
        a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: "base" })
      );
    case "adm_desc":
      return list.sort((a, b) =>
        b.studentId.localeCompare(a.studentId, undefined, { numeric: true, sensitivity: "base" })
      );
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
    items,
  } = opts;

  // Debit-only and Credit-only reports must NEVER show Net Balance
  const effectiveShowNetBalance = contentFilter === "all" && showNetBalance;

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

  // Khazna design system colors
  const primaryBrand = [234, 88, 12]; // Amber/orange brand accent
  const creditGreen = [21, 128, 61];   // Emerald 700
  const debitRed = [185, 28, 28];     // Red 700
  const textDark = [30, 41, 59];      // Slate 800
  const textMuted = [100, 116, 139];  // Slate 500
  const borderColor = [226, 232, 240];

  let currentY = 14;

  // 1. HEADER SECTION
  doc.setFillColor(primaryBrand[0], primaryBrand[1], primaryBrand[2]);
  doc.rect(margin, currentY, 3, 15, "F");

  // College Name
  const collegeFont = getFontFamilyForText(collegeName || "Islahul Uloom");
  doc.setFont(collegeFont, "bold");
  doc.setFontSize(16);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(collegeName || "Islahul Uloom", margin + 6, currentY + 5.5);

  // Sector & Ledger Subtitle
  const sectorFont = getFontFamilyForText(sectorName);
  doc.setFont(sectorFont, "normal");
  doc.setFontSize(10);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`${sectorName} · Department Ledger`, margin + 6, currentY + 12);

  // Report Title (Right Aligned)
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(12);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const titleText =
    contentFilter === "debit"
      ? "Class-wise Report: Debit"
      : contentFilter === "credit"
      ? "Class-wise Report: Credit"
      : "Class-wise Statement: Credit & Debit";
  doc.text(titleText, pageWidth - margin, currentY + 5.5, { align: "right" });

  // Class and Full Date Range With Year (Right Aligned)
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const dateRangeText = `${formatPdfDateWithYear(from)} – ${formatPdfDateWithYear(to)}`;
  doc.text(`Class: ${className} | ${dateRangeText}`, pageWidth - margin, currentY + 12, {
    align: "right",
  });

  currentY += 21;

  // Metadata separator bar
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const genDateStr = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  doc.text(
    `Generated: ${genDateStr} | Generated by: ${generatedBy} | Total Students: ${sorted.length}`,
    margin,
    currentY
  );
  currentY += 7;

  // 2. SUMMARY CARDS STRIP
  if (showSummaryCards) {
    const cardGap = 5;
    const cardHeight = 18;

    if (contentFilter === "all") {
      // 3 Cards: Total Credit, Total Debit, Net Balance
      const cardWidth = (printableWidth - cardGap * 2) / 3;
      let cardX = margin;

      // Card 1: Credit
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(22, 163, 74);
      doc.text("TOTAL CREDIT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11);
      doc.setTextColor(creditGreen[0], creditGreen[1], creditGreen[2]);
      doc.text(formatPdfINR(totalCredit), cardX + 3.5, currentY + 13.5);

      cardX += cardWidth + cardGap;

      // Card 2: Debit
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(220, 38, 38);
      doc.text("TOTAL DEBIT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11);
      doc.setTextColor(debitRed[0], debitRed[1], debitRed[2]);
      doc.text(formatPdfINR(totalDebit), cardX + 3.5, currentY + 13.5);

      cardX += cardWidth + cardGap;

      // Card 3: Net Balance
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("NET BALANCE", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11);
      if (netBalance < 0) {
        doc.setTextColor(debitRed[0], debitRed[1], debitRed[2]);
      } else {
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      }
      doc.text(formatPdfINR(netBalance), cardX + 3.5, currentY + 13.5);
    } else if (contentFilter === "debit") {
      // 2 Cards: Total Debit, Total Students
      const cardWidth = (printableWidth - cardGap) / 2;
      let cardX = margin;

      // Card 1: Total Debit
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(220, 38, 38);
      doc.text("TOTAL DEBIT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(debitRed[0], debitRed[1], debitRed[2]);
      doc.text(formatPdfINR(totalDebit), cardX + 3.5, currentY + 13.5);

      cardX += cardWidth + cardGap;

      // Card 2: Student Count
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("STUDENTS COUNT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${sorted.length} Students`, cardX + 3.5, currentY + 13.5);
    } else {
      // 2 Cards: Total Credit, Total Students
      const cardWidth = (printableWidth - cardGap) / 2;
      let cardX = margin;

      // Card 1: Total Credit
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(22, 163, 74);
      doc.text("TOTAL CREDIT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(creditGreen[0], creditGreen[1], creditGreen[2]);
      doc.text(formatPdfINR(totalCredit), cardX + 3.5, currentY + 13.5);

      cardX += cardWidth + cardGap;

      // Card 2: Student Count
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("STUDENTS COUNT", cardX + 3.5, currentY + 5.5);
      doc.setFont("NotoSans", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${sorted.length} Students`, cardX + 3.5, currentY + 13.5);
    }

    currentY += cardHeight + 8;
  }

  // 3. TABLE LAYOUT & COLUMN SIZING
  // Build headers & calculate exact fixed column widths summing to printableWidth
  const headers: string[] = ["#", "Adm. No", "Student Name", "Class"];
  if (contentFilter !== "debit") headers.push("Credit");
  if (contentFilter !== "credit") headers.push("Debit");
  if (effectiveShowNetBalance) headers.push("Net Balance");

  // Determine fixed widths per column
  const columnStyles: Record<number, any> = {};

  if (orientation === "portrait") {
    // Printable width = 182mm
    if (contentFilter === "debit") {
      // 5 cols: # (8mm), Adm (22mm), Class (20mm), Debit (28mm), Name (takes 182 - 78 = 104mm)
      columnStyles[0] = { cellWidth: 8, halign: "center" };
      columnStyles[1] = { cellWidth: 22, halign: "left" };
      columnStyles[2] = { cellWidth: 104, halign: "left" };
      columnStyles[3] = { cellWidth: 20, halign: "left" };
      columnStyles[4] = { cellWidth: 28, halign: "right" };
    } else if (contentFilter === "credit") {
      // 5 cols: # (8mm), Adm (22mm), Class (20mm), Credit (28mm), Name (takes 182 - 78 = 104mm)
      columnStyles[0] = { cellWidth: 8, halign: "center" };
      columnStyles[1] = { cellWidth: 22, halign: "left" };
      columnStyles[2] = { cellWidth: 104, halign: "left" };
      columnStyles[3] = { cellWidth: 20, halign: "left" };
      columnStyles[4] = { cellWidth: 28, halign: "right" };
    } else {
      // All: 7 cols: # (8mm), Adm (22mm), Class (20mm), Credit (26mm), Debit (26mm), Net (28mm), Name (182 - 130 = 52mm)
      columnStyles[0] = { cellWidth: 8, halign: "center" };
      columnStyles[1] = { cellWidth: 22, halign: "left" };
      columnStyles[2] = { cellWidth: 52, halign: "left" };
      columnStyles[3] = { cellWidth: 20, halign: "left" };
      columnStyles[4] = { cellWidth: 26, halign: "right" };
      columnStyles[5] = { cellWidth: 26, halign: "right" };
      columnStyles[6] = { cellWidth: 28, halign: "right", fontStyle: "bold" };
    }
  } else {
    // Landscape Printable width = 269mm
    if (contentFilter === "debit" || contentFilter === "credit") {
      // 5 cols: # (10mm), Adm (26mm), Class (24mm), Amount (32mm), Name (269 - 92 = 177mm)
      columnStyles[0] = { cellWidth: 10, halign: "center" };
      columnStyles[1] = { cellWidth: 26, halign: "left" };
      columnStyles[2] = { cellWidth: 177, halign: "left" };
      columnStyles[3] = { cellWidth: 24, halign: "left" };
      columnStyles[4] = { cellWidth: 32, halign: "right" };
    } else {
      // 7 cols: # (10mm), Adm (26mm), Class (24mm), Credit (30mm), Debit (30mm), Net (34mm), Name (269 - 154 = 115mm)
      columnStyles[0] = { cellWidth: 10, halign: "center" };
      columnStyles[1] = { cellWidth: 26, halign: "left" };
      columnStyles[2] = { cellWidth: 115, halign: "left" };
      columnStyles[3] = { cellWidth: 24, halign: "left" };
      columnStyles[4] = { cellWidth: 30, halign: "right" };
      columnStyles[5] = { cellWidth: 30, halign: "right" };
      columnStyles[6] = { cellWidth: 34, halign: "right", fontStyle: "bold" };
    }
  }

  // Build body rows
  const bodyRows = sorted.map((s, idx) => {
    const row = [(idx + 1).toString(), s.studentId, s.studentName, s.className];
    if (contentFilter !== "debit") row.push(formatPdfINR(s.credit));
    if (contentFilter !== "credit") row.push(formatPdfINR(s.debit));
    if (effectiveShowNetBalance) row.push(formatPdfINR(s.balance));
    return row;
  });

  // Build footer totals row
  const footerRow: string[] = ["", "TOTAL", `${sorted.length} Students`, ""];
  if (contentFilter !== "debit") footerRow.push(formatPdfINR(totalCredit));
  if (contentFilter !== "credit") footerRow.push(formatPdfINR(totalDebit));
  if (effectiveShowNetBalance) footerRow.push(formatPdfINR(netBalance));

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
      fontSize: 9.5,
      cellPadding: { top: 2.5, right: 2.8, bottom: 2.5, left: 2.8 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      lineWidth: 0.3,
      lineColor: [203, 213, 225],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles,
    margin: { left: margin, right: margin, bottom: 20 },
    didParseCell: (data) => {
      const cellVal = String(data.cell.raw ?? "");

      // Handle Malayalam or Arabic scripts
      if (/[\u0D00-\u0D7F]/.test(cellVal)) {
        data.cell.styles.font = "NotoSansMalayalam";
      } else if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cellVal)) {
        data.cell.styles.font = "NotoNaskhArabic";
      }

      // Guarantee exact right-alignment on ALL amount cells (head, body, foot)
      if (data.column.index >= amountColStartIndex) {
        data.cell.styles.halign = "right";

        // Red color for negative balances in body
        if (data.section === "body" && effectiveShowNetBalance && data.column.index === headers.length - 1) {
          const row = sorted[data.row.index];
          if (row && row.balance < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }

        // Red color for negative total net balance in totals row
        if (data.section === "foot" && effectiveShowNetBalance && data.column.index === headers.length - 1 && netBalance < 0) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  // 4. SIGNATURE LINES (Placed directly below table with consistent ~20mm spacing)
  if (showSignatureLines) {
    const finalTableY = (doc as any).lastAutoTable?.finalY ?? 150;
    const requiredSigSpace = 32;

    // Check if signatures fit on current page above bottom margin
    let sigY: number;
    if (finalTableY + requiredSigSpace > pageHeight - 16) {
      doc.addPage();
      sigY = margin + 25;
    } else {
      sigY = finalTableY + 20;
    }

    const sigWidth = 38;
    const sigGap = (printableWidth - sigWidth * 3) / 2;

    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);

    // Sig 1: Class Teacher
    doc.line(margin, sigY, margin + sigWidth, sigY);
    doc.text("Class Teacher", margin + sigWidth / 2, sigY + 4.5, { align: "center" });

    // Sig 2: Head of Department
    const sig2X = margin + sigWidth + sigGap;
    doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
    doc.text("Head of Department", sig2X + sigWidth / 2, sigY + 4.5, { align: "center" });

    // Sig 3: Principal / Auditor
    const sig3X = pageWidth - margin - sigWidth;
    doc.line(sig3X, sigY, sig3X + sigWidth, sigY);
    doc.text("Principal / Auditor", sig3X + sigWidth / 2, sigY + 4.5, { align: "center" });
  }

  // 5. FOOTER ON EVERY PAGE (Page X of Y, correctly calculated across all generated pages)
  if (showPageNumbers) {
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("NotoSans", "normal");
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text("Khazna: Islahul Uloom College Ledger System", margin, pageHeight - 8);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }

  // Standard File Name Format: Khazna_<Class>_<Type>_<Dates>.pdf
  const safeClass = className.replace(/[^a-zA-Z0-9]/g, "");
  const safeFilter =
    contentFilter === "debit" ? "Debit" : contentFilter === "credit" ? "Credit" : "Statement";
  const safeFrom = formatPdfDateWithYear(from).replace(/\s+/g, "");
  const safeTo = formatPdfDateWithYear(to).replace(/\s+/g, "");
  const filename = `Khazna_${safeClass}_${safeFilter}_${safeFrom}-${safeTo}.pdf`;

  const blob = doc.output("blob");
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
    voided?: any;
  }[];
  sectorMap: Map<string, string>; // sector slug -> sector name
}): Promise<string> {
  const { collegeName, student, transactions, sectorMap } = opts;

  // Filter active transactions and sort chronologically
  const activeTxs = transactions
    .filter((t) => !t.voided)
    .sort((a, b) => a.date.localeCompare(b.date));

  let running = 0;
  let totalCredit = 0;
  let totalDebit = 0;

  const rows = activeTxs.map((t, idx) => {
    if (t.type === "credit") {
      running += t.amount;
      totalCredit += t.amount;
    } else {
      running -= t.amount;
      totalDebit += t.amount;
    }
    const secName = sectorMap.get(t.sector) ?? t.sector;
    return [
      (idx + 1).toString(),
      formatPdfDateWithYear(t.date),
      t.receiptNo,
      secName,
      t.title,
      t.type === "credit" ? formatPdfINR(t.amount) : "—",
      t.type === "debit" ? formatPdfINR(t.amount) : "—",
      formatPdfINR(running),
    ];
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });

  await registerUnicodeFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;

  const primaryBrand = [234, 88, 12];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];
  const borderColor = [226, 232, 240];

  let currentY = 14;

  // Header Accent
  doc.setFillColor(primaryBrand[0], primaryBrand[1], primaryBrand[2]);
  doc.rect(margin, currentY, 3, 14, "F");

  // College & Title
  const collegeFont = getFontFamilyForText(collegeName || "Islahul Uloom");
  doc.setFont(collegeFont, "bold");
  doc.setFontSize(15);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(collegeName || "Islahul Uloom College", margin + 6, currentY + 5);

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Official Student Account Statement", margin + 6, currentY + 11);

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Ad.No: ${student.id}`, pageWidth - margin, currentY + 5, { align: "right" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Class: ${student.className}`, pageWidth - margin, currentY + 11, { align: "right" });

  currentY += 20;

  // Student details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, printableWidth, 18, 2, 2, "FD");

  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Student Name:", margin + 4, currentY + 6);
  doc.text("Guardian (c/o):", margin + 4, currentY + 13);

  doc.text("Mobile Contact:", margin + 70, currentY + 6);
  doc.text("Date of Joining:", margin + 70, currentY + 13);

  const studentNameFont = getFontFamilyForText(student.name);
  doc.setFont(studentNameFont, "bold");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(student.name, margin + 28, currentY + 6);

  const guardianFont = getFontFamilyForText(student.guardian || "—");
  doc.setFont(guardianFont, "bold");
  doc.text(student.guardian || "—", margin + 28, currentY + 13);

  doc.setFont("NotoSans", "bold");
  doc.text(student.phone || "—", margin + 96, currentY + 6);
  doc.text(formatPdfDateWithYear(student.joined), margin + 96, currentY + 13);

  // Net Balance Callout
  doc.setFont("NotoSans", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Net Balance:", pageWidth - margin - 38, currentY + 6);

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(11.5);
  if (running < 0) {
    doc.setTextColor(185, 28, 28);
  } else {
    doc.setTextColor(21, 128, 61);
  }
  doc.text(formatPdfINR(running), pageWidth - margin - 4, currentY + 13, { align: "right" });

  currentY += 24;

  // Table
  autoTable(doc, {
    startY: currentY,
    head: [["#", "Date", "Receipt", "Sector", "Description", "Credit", "Debit", "Balance"]],
    body: rows,
    foot: [["", "TOTAL", "", "", `${activeTxs.length} Transactions`, formatPdfINR(totalCredit), formatPdfINR(totalDebit), formatPdfINR(running)]],
    showHead: "everyPage",
    rowPageBreak: "avoid",
    theme: "striped",
    styles: {
      font: "NotoSans",
      fontSize: 8.5,
      cellPadding: { top: 2.2, right: 2.5, bottom: 2.2, left: 2.5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22, halign: "left" },
      2: { cellWidth: 18, halign: "left" },
      3: { cellWidth: 22, halign: "left" },
      4: { cellWidth: 44, halign: "left" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin, bottom: 20 },
    didParseCell: (data) => {
      const val = String(data.cell.raw ?? "");
      if (/[\u0D00-\u0D7F]/.test(val)) {
        data.cell.styles.font = "NotoSansMalayalam";
      } else if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val)) {
        data.cell.styles.font = "NotoNaskhArabic";
      }
      if (data.column.index >= 5) {
        data.cell.styles.halign = "right";
      }
    },
  });

  // Signatures
  const finalTableY = (doc as any).lastAutoTable?.finalY ?? 150;
  let sigY: number;
  if (finalTableY + 30 > pageHeight - 16) {
    doc.addPage();
    sigY = margin + 25;
  } else {
    sigY = finalTableY + 18;
  }

  const sigWidth = 42;
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);

  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.text("Accounts In-Charge", margin + sigWidth / 2, sigY + 4.5, { align: "center" });

  const sigRightX = pageWidth - margin - sigWidth;
  doc.line(sigRightX, sigY, sigRightX + sigWidth, sigY);
  doc.text("Principal / Head of Institution", sigRightX + sigWidth / 2, sigY + 4.5, { align: "center" });

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Khazna: Islahul Uloom College Ledger System", margin, pageHeight - 8);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const safeStudentName = student.name.replace(/[^a-zA-Z0-9]/g, "");
  const filename = `Khazna_Statement_${student.id}_${safeStudentName}.pdf`;

  const blob = doc.output("blob");
  triggerBrowserDownload(blob, filename);

  return filename;
}

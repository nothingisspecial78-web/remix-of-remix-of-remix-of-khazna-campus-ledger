import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatShortDate } from "./format";
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
 * Clean formatting of INR currency for PDF
 */
function formatPdfINR(num: number): string {
  const abs = Math.abs(Math.round(num)).toLocaleString("en-IN");
  if (num < 0) return `-₹${abs}`;
  return `₹${abs}`;
}

/**
 * Generates and triggers download of a polished Class-wise PDF report.
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

  const sorted = sortReportItems(items, sortBy);

  const totalCredit = sorted.reduce((acc, it) => acc + it.credit, 0);
  const totalDebit = sorted.reduce((acc, it) => acc + it.debit, 0);
  const netBalance = totalCredit - totalDebit;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Primary colors
  const primaryBrand = [234, 88, 12]; // Khazna warm orange
  const creditColor = [16, 185, 129]; // Emerald 500
  const debitColor = [239, 68, 68];   // Rose/Red 500
  const textColor = [30, 41, 59];     // Slate 800
  const mutedColor = [100, 116, 139]; // Slate 500
  const borderColor = [226, 232, 240];

  let currentY = 14;

  // 1. HEADER SECTION
  doc.setFillColor(primaryBrand[0], primaryBrand[1], primaryBrand[2]);
  doc.rect(margin, currentY, 3, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(collegeName || "Islahul Uloom", margin + 6, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`${sectorName} · Department Ledger`, margin + 6, currentY + 11);

  // Right-aligned report title & date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const titleText =
    contentFilter === "debit"
      ? "Class-wise Report: Debit"
      : contentFilter === "credit"
      ? "Class-wise Report: Credit"
      : "Class-wise Statement: Credit & Debit";
  doc.text(titleText, pageWidth - margin, currentY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Class: ${className} | ${formatShortDate(from)} – ${formatShortDate(to)}`, pageWidth - margin, currentY + 11, {
    align: "right",
  });

  currentY += 20;

  // Sub-bar with generation info
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  const genDateStr = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  doc.text(`Generated: ${genDateStr} | By: ${generatedBy} | Total Students: ${sorted.length}`, margin, currentY);
  currentY += 6;

  // 2. SUMMARY CARDS STRIP (If enabled)
  if (showSummaryCards) {
    const cardGap = 4;
    const availableWidth = pageWidth - margin * 2;
    const cardCount = contentFilter === "all" ? 3 : 2;
    const cardWidth = (availableWidth - cardGap * (cardCount - 1)) / cardCount;
    const cardHeight = 18;

    let cardX = margin;

    // Credit Card
    if (contentFilter !== "debit") {
      doc.setFillColor(240, 253, 244); // light emerald
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(creditColor[0], creditColor[1], creditColor[2]);
      doc.text("TOTAL CREDIT", cardX + 3.5, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(21, 128, 61);
      doc.text(formatPdfINR(totalCredit), cardX + 3.5, currentY + 13);

      cardX += cardWidth + cardGap;
    }

    // Debit Card
    if (contentFilter !== "credit") {
      doc.setFillColor(254, 242, 242); // light rose
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(debitColor[0], debitColor[1], debitColor[2]);
      doc.text("TOTAL DEBIT", cardX + 3.5, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(185, 28, 28);
      doc.text(formatPdfINR(totalDebit), cardX + 3.5, currentY + 13);

      cardX += cardWidth + cardGap;
    }

    // Net Balance Card
    if (contentFilter === "all" || showNetBalance) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text("NET BALANCE", cardX + 3.5, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (netBalance < 0) {
        doc.setTextColor(debitColor[0], debitColor[1], debitColor[2]);
      } else {
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      }
      doc.text(formatPdfINR(netBalance), cardX + 3.5, currentY + 13);
    }

    currentY += cardHeight + 8;
  }

  // 3. TABLE COLUMNS SETUP
  const headers: string[] = ["#", "Adm. No", "Student Name", "Class"];
  if (contentFilter !== "debit") headers.push("Credit");
  if (contentFilter !== "credit") headers.push("Debit");
  if (showNetBalance) headers.push("Net Balance");

  // Build rows
  const bodyRows = sorted.map((s, idx) => {
    const row = [(idx + 1).toString(), s.studentId, s.studentName, s.className];
    if (contentFilter !== "debit") row.push(formatPdfINR(s.credit));
    if (contentFilter !== "credit") row.push(formatPdfINR(s.debit));
    if (showNetBalance) row.push(formatPdfINR(s.balance));
    return row;
  });

  // Footer Totals Row
  const footerRow: string[] = ["", "TOTAL", `${sorted.length} Students`, ""];
  if (contentFilter !== "debit") footerRow.push(formatPdfINR(totalCredit));
  if (contentFilter !== "credit") footerRow.push(formatPdfINR(totalDebit));
  if (showNetBalance) footerRow.push(formatPdfINR(netBalance));

  // Determine column alignment & widths
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 10, halign: "center" },
    1: { cellWidth: 22, halign: "left" },
    2: { cellWidth: "auto", halign: "left" },
    3: { cellWidth: 20, halign: "left" },
  };

  let numColIdx = 4;
  if (contentFilter !== "debit") {
    columnStyles[numColIdx] = { cellWidth: 26, halign: "right" };
    numColIdx++;
  }
  if (contentFilter !== "credit") {
    columnStyles[numColIdx] = { cellWidth: 26, halign: "right" };
    numColIdx++;
  }
  if (showNetBalance) {
    columnStyles[numColIdx] = { cellWidth: 28, halign: "right", fontStyle: "bold" };
  }

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: bodyRows,
    foot: [footerRow],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.2,
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
    margin: { left: margin, right: margin, bottom: showSignatureLines ? 32 : 18 },
    didParseCell: (data) => {
      // Highlight negative balances in red
      if (data.section === "body") {
        const row = sorted[data.row.index];
        if (row && showNetBalance && data.column.index === headers.length - 1) {
          if (row.balance < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    },
    didDrawPage: (_data) => {
      // 4. FOOTER ON EVERY PAGE
      if (showPageNumbers) {
        const pageCount = doc.getNumberOfPages();
        const pageCurrent = doc.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(
          `Page ${pageCurrent} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" }
        );
        doc.text(
          `Khazna — Islahul Uloom College Ledger System`,
          margin,
          pageHeight - 8
        );
      }
    },
  });

  // 5. SIGNATURE LINES (on last page if enabled)
  if (showSignatureLines) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? (pageHeight - 35);
    const sigY = Math.min(pageHeight - 20, Math.max(finalY + 16, pageHeight - 28));

    const sigWidth = 36;
    const gap = (pageWidth - margin * 2 - sigWidth * 3) / 2;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

    // Sig 1: Class Teacher
    doc.line(margin, sigY, margin + sigWidth, sigY);
    doc.text("Class Teacher", margin + sigWidth / 2, sigY + 4, { align: "center" });

    // Sig 2: Head of Department
    const sig2X = margin + sigWidth + gap;
    doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
    doc.text("Head of Department", sig2X + sigWidth / 2, sigY + 4, { align: "center" });

    // Sig 3: Principal
    const sig3X = pageWidth - margin - sigWidth;
    doc.line(sig3X, sigY, sig3X + sigWidth, sigY);
    doc.text("Principal / Auditor", sig3X + sigWidth / 2, sigY + 4, { align: "center" });
  }

  // Format file name: Khazna_Fiqh2_Debit_15Jul2026-12Nov2026.pdf
  const safeClass = className.replace(/\s+/g, "");
  const safeFilter =
    contentFilter === "debit" ? "Debit" : contentFilter === "credit" ? "Credit" : "Statement";
  const safeFrom = formatShortDate(from).replace(/\s+/g, "");
  const safeTo = formatShortDate(to).replace(/\s+/g, "");
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

  // Filter non-voided transactions and sort chronologically
  const activeTxs = transactions
    .filter((t) => !t.voided)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balances
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
      formatShortDate(t.date),
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
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const primaryBrand = [234, 88, 12];
  const textColor = [30, 41, 59];
  const mutedColor = [100, 116, 139];

  let currentY = 14;

  // Header
  doc.setFillColor(primaryBrand[0], primaryBrand[1], primaryBrand[2]);
  doc.rect(margin, currentY, 3, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(collegeName || "Islahul Uloom College", margin + 6, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Official Student Account Statement", margin + 6, currentY + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Ad.No: ${student.id}`, pageWidth - margin, currentY + 5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Class: ${student.className}`, pageWidth - margin, currentY + 11, { align: "right" });

  currentY += 20;

  // Student details box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Student Name:", margin + 4, currentY + 6);
  doc.text("Guardian (c/o):", margin + 4, currentY + 13);

  doc.text("Mobile Contact:", margin + 70, currentY + 6);
  doc.text("Date of Joining:", margin + 70, currentY + 13);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(student.name, margin + 28, currentY + 6);
  doc.text(student.guardian || "—", margin + 28, currentY + 13);

  doc.text(student.phone || "—", margin + 96, currentY + 6);
  doc.text(formatShortDate(student.joined), margin + 96, currentY + 13);

  // Balance on right
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text("Net Balance:", pageWidth - margin - 40, currentY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (running < 0) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(22, 163, 74);
  }
  doc.text(formatPdfINR(running), pageWidth - margin - 4, currentY + 13, { align: "right" });

  currentY += 24;

  // Table
  autoTable(doc, {
    startY: currentY,
    head: [["#", "Date", "Receipt", "Sector", "Description", "Credit", "Debit", "Balance"]],
    body: rows,
    foot: [["", "TOTAL", "", "", `${activeTxs.length} Transactions`, formatPdfINR(totalCredit), formatPdfINR(totalDebit), formatPdfINR(running)]],
    theme: "striped",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
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
      1: { cellWidth: 18, halign: "left" },
      2: { cellWidth: 18, halign: "left" },
      3: { cellWidth: 22, halign: "left" },
      4: { cellWidth: "auto", halign: "left" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin, bottom: 25 },
    didDrawPage: (_data) => {
      const pageCount = doc.getNumberOfPages();
      const pageCurrent = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      doc.text(`Page ${pageCurrent} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: "right" });
      doc.text(`Generated on ${new Date().toLocaleDateString("en-IN")} via Khazna Ledger System`, margin, pageHeight - 8);
    },
  });

  // Signature lines
  const finalY = (doc as any).lastAutoTable?.finalY ?? (pageHeight - 30);
  const sigY = Math.min(pageHeight - 16, Math.max(finalY + 14, pageHeight - 24));
  const sigWidth = 40;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);

  doc.line(margin, sigY, margin + sigWidth, sigY);
  doc.text("Accounts In-Charge", margin + sigWidth / 2, sigY + 4, { align: "center" });

  const sigRightX = pageWidth - margin - sigWidth;
  doc.line(sigRightX, sigY, sigRightX + sigWidth, sigY);
  doc.text("Principal / Head of Institution", sigRightX + sigWidth / 2, sigY + 4, { align: "center" });

  const filename = `Khazna_Statement_${student.id}_${student.name.replace(/\s+/g, "")}.pdf`;
  const blob = doc.output("blob");
  triggerBrowserDownload(blob, filename);

  return filename;
}

import * as XLSX from "xlsx";
import { formatINR } from "./format";

export interface ReportRowData {
  studentName: string;
  studentId: string;
  className: string;
  credit: number;
  debit: number;
  balance: number;
}

export interface ExportReportOptions {
  filename: string;
  collegeName: string;
  sectorName: string;
  className: string;
  dateRangeStr: string;
  rows: ReportRowData[];
  totals: {
    credit: number;
    debit: number;
    balance: number;
  };
  contentFilter?: "all" | "credit" | "debit";
}

/**
 * Downloads a structured Excel (.xlsx) file with metadata header,
 * styled column headers, formatted numbers, column widths, and a totals row.
 */
export function downloadExcelReport(opts: ExportReportOptions) {
  const {
    filename,
    collegeName,
    sectorName,
    className,
    dateRangeStr,
    rows,
    totals,
    contentFilter = "all",
  } = opts;

  // Build rows array for SheetJS
  const aoa: (string | number)[][] = [
    [collegeName],
    [`Department / Sector: ${sectorName}`],
    [`Class-wise Finance Report — Class: ${className}`],
    [`Date Range: ${dateRangeStr} | Generated: ${new Date().toLocaleString("en-IN")}`],
    [], // Blank separator row
  ];

  // Header columns based on content filter
  const headers = ["#", "Adm. No", "Student Name", "Class"];
  if (contentFilter !== "debit") headers.push("Credit (₹)");
  if (contentFilter !== "credit") headers.push("Debit (₹)");
  headers.push("Net Balance (₹)");
  aoa.push(headers);

  // Data rows
  rows.forEach((r, idx) => {
    const row: (string | number)[] = [idx + 1, r.studentId, r.studentName, r.className];
    if (contentFilter !== "debit") row.push(r.credit);
    if (contentFilter !== "credit") row.push(r.debit);
    row.push(r.balance);
    aoa.push(row);
  });

  // Totals row
  const totalsRow: (string | number)[] = ["TOTAL", "", "", `Count: ${rows.length}`];
  if (contentFilter !== "debit") totalsRow.push(totals.credit);
  if (contentFilter !== "credit") totalsRow.push(totals.debit);
  totalsRow.push(totals.balance);
  aoa.push(totalsRow);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  ws["!cols"] = [
    { wch: 6 },  // #
    { wch: 14 }, // Adm No
    { wch: 28 }, // Name
    { wch: 12 }, // Class
    { wch: 16 }, // Credit
    { wch: 16 }, // Debit
    { wch: 18 }, // Balance
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Class Report");

  // Generate binary buffer
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  triggerBrowserDownload(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/**
 * Downloads a UTF-8 CSV with Byte Order Mark (\uFEFF) to guarantee Excel
 * correctly renders Malayalam, Arabic, and Rupee characters without mojibake.
 */
export function downloadCSVReport(opts: ExportReportOptions) {
  const {
    filename,
    collegeName,
    sectorName,
    className,
    dateRangeStr,
    rows,
    totals,
    contentFilter = "all",
  } = opts;

  const escapeCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

  const lines: string[] = [
    escapeCell(collegeName),
    escapeCell(`Sector: ${sectorName} | Class: ${className}`),
    escapeCell(`Period: ${dateRangeStr} | Generated: ${new Date().toLocaleString("en-IN")}`),
    "",
  ];

  const headers = ["#", "Admission No", "Student Name", "Class"];
  if (contentFilter !== "debit") headers.push("Total Credit");
  if (contentFilter !== "credit") headers.push("Total Debit");
  headers.push("Net Balance");
  lines.push(headers.map(escapeCell).join(","));

  rows.forEach((r, idx) => {
    const row: (string | number)[] = [idx + 1, r.studentId, r.studentName, r.className];
    if (contentFilter !== "debit") row.push(r.credit);
    if (contentFilter !== "credit") row.push(r.debit);
    row.push(r.balance);
    lines.push(row.map(escapeCell).join(","));
  });

  const totalsRow: (string | number)[] = ["TOTAL", "", "", `Count: ${rows.length}`];
  if (contentFilter !== "debit") totalsRow.push(totals.credit);
  if (contentFilter !== "credit") totalsRow.push(totals.debit);
  totalsRow.push(totals.balance);
  lines.push(totalsRow.map(escapeCell).join(","));

  // Prepend UTF-8 BOM (\uFEFF)
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  triggerBrowserDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Robust cross-browser blob downloader supporting Desktop, Mobile Chrome, and iOS Safari.
 */
export function triggerBrowserDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1500);
}

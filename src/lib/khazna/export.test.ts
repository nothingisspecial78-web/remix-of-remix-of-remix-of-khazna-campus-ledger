import { describe, expect, it, vi, beforeEach } from "vitest";
import * as exportModule from "./export";
import {
  sortReportItems,
  formatPdfINR,
  formatPdfDateWithYear,
  generateClassWisePdf,
  type StudentReportItem,
} from "./pdf-report";

describe("Report Sorting & Export Tests", () => {
  beforeEach(() => {
    vi.spyOn(exportModule, "triggerBrowserDownload").mockImplementation(() => {});
  });
  const sampleItems: StudentReportItem[] = [
    { studentId: "S0100", studentName: "Zubair", className: "Fiqh 2", credit: 1000, debit: 0, balance: 1000 },
    { studentId: "S0008", studentName: "Abdulla", className: "Fiqh 2", credit: 500, debit: 200, balance: 300 },
    { studentId: "S0020", studentName: "Muhammed", className: "Fiqh 2", credit: 200, debit: 800, balance: -600 },
  ];

  it("sorts admission numbers naturally (S0008 before S0020 before S0100)", () => {
    const asc = sortReportItems(sampleItems, "adm_asc");
    expect(asc.map((x) => x.studentId)).toEqual(["S0008", "S0020", "S0100"]);

    const desc = sortReportItems(sampleItems, "adm_desc");
    expect(desc.map((x) => x.studentId)).toEqual(["S0100", "S0020", "S0008"]);
  });

  it("sorts student names with locale awareness", () => {
    const asc = sortReportItems(sampleItems, "name_asc");
    expect(asc.map((x) => x.studentName)).toEqual(["Abdulla", "Muhammed", "Zubair"]);
  });

  it("sorts by net balance correctly", () => {
    const desc = sortReportItems(sampleItems, "bal_desc");
    expect(desc.map((x) => x.balance)).toEqual([1000, 300, -600]);

    const asc = sortReportItems(sampleItems, "bal_asc");
    expect(asc.map((x) => x.balance)).toEqual([-600, 300, 1000]);
  });

  it("formats Indian Rupee amounts properly with ₹ symbol and negative formatting", () => {
    expect(formatPdfINR(2050)).toBe("₹2,050");
    expect(formatPdfINR(-700)).toBe("-₹700");
    expect(formatPdfINR(132150)).toBe("₹1,32,150");
    expect(formatPdfINR(-125000)).toBe("-₹1,25,000");
    expect(formatPdfINR(0)).toBe("₹0");
  });

  it("formats dates with the full 4-digit year", () => {
    expect(formatPdfDateWithYear("2026-07-15")).toContain("2026");
    expect(formatPdfDateWithYear("2026-11-12")).toContain("2026");
  });

  it("generates Debit-only, Credit-only, and All reports with multi-page support", async () => {
    // Generate 65 student items for multi-page test
    const manyStudents: StudentReportItem[] = [];
    for (let i = 1; i <= 65; i++) {
      manyStudents.push({
        studentId: `S${String(i).padStart(4, "0")}`,
        studentName: i === 2 ? "മുഹമ്മദ് റയ്യാൻ" : i === 3 ? "محمد ريان" : `Student ${i}`,
        className: "Fiqh 2",
        credit: 3000,
        debit: 1500,
        balance: 1500,
      });
    }

    // Debit only report
    const debitFile = await generateClassWisePdf({
      collegeName: "Markaz College",
      sectorName: "Dept Fiqh",
      className: "Fiqh 2",
      from: "2026-07-15",
      to: "2026-11-12",
      contentFilter: "debit",
      sortBy: "adm_asc",
      showSummaryCards: true,
      showNetBalance: false,
      showSignatureLines: true,
      showPageNumbers: true,
      orientation: "portrait",
      items: manyStudents,
    });
    expect(debitFile).toMatch(/^Khazna_Fiqh2_Debit_.*\.pdf$/);

    // Credit only report
    const creditFile = await generateClassWisePdf({
      collegeName: "Markaz College",
      sectorName: "Dept Fiqh",
      className: "Fiqh 2",
      from: "2026-07-15",
      to: "2026-11-12",
      contentFilter: "credit",
      sortBy: "name_asc",
      showSummaryCards: true,
      showNetBalance: false,
      showSignatureLines: true,
      showPageNumbers: true,
      orientation: "portrait",
      items: manyStudents,
    });
    expect(creditFile).toMatch(/^Khazna_Fiqh2_Credit_.*\.pdf$/);

    // All (Statement) report
    const allFile = await generateClassWisePdf({
      collegeName: "Markaz College",
      sectorName: "Dept Fiqh",
      className: "Fiqh 2",
      from: "2026-07-15",
      to: "2026-11-12",
      contentFilter: "all",
      sortBy: "bal_desc",
      showSummaryCards: true,
      showNetBalance: true,
      showSignatureLines: true,
      showPageNumbers: true,
      orientation: "portrait",
      items: manyStudents,
    });
    expect(allFile).toMatch(/^Khazna_Fiqh2_Statement_.*\.pdf$/);
  }, 25000);

  it("embeds institution profile, signatories, seal, and records QR verification snapshot", async () => {
    let recordedExport: any = null;

    const sample15Students: StudentReportItem[] = [];
    for (let i = 1; i <= 15; i++) {
      sample15Students.push({
        studentId: `S01${String(i).padStart(2, "0")}`,
        studentName: i === 1 ? "അബ്ദുല്ല ഖാസിം" : i === 2 ? "محمد ريان" : `Student Name ${i}`,
        className: "Fiqh 2",
        credit: i === 3 ? 9999999 : 5000,
        debit: i === 4 ? 7000 : 2000,
        balance: (i === 3 ? 9999999 : 5000) - (i === 4 ? 7000 : 2000),
      });
    }

    const testFile = await generateClassWisePdf({
      collegeName: "Islahul Uloom Arabic College",
      sectorName: "Dept Fiqh",
      className: "Fiqh 2",
      from: "2026-07-15",
      to: "2026-11-12",
      contentFilter: "all",
      sortBy: "adm_asc",
      showSummaryCards: true,
      showNetBalance: true,
      showSignatureLines: true,
      showPageNumbers: true,
      orientation: "portrait",
      institutionProfile: {
        name: "Islahul Uloom Arabic College",
        short_name: "IUAC",
        tagline: "Affiliated to University of Calicut",
        reg_no: "IUAC/REG/1970/KL",
        established_year: "1970",
        city: "Tanur",
        district: "Malappuram",
        phone: "+91 494 242 2234",
        email: "accounts@islahululoom.edu.in",
        logo_version: 1,
        seal_version: 1,
        verify_expiry: "never",
        verify_mask_names: false,
      },
      signatories: [
        {
          id: "sig_acc",
          org_id: "demo",
          full_name: "K. Mohammed Kutty",
          designation: "Chief Accounts Officer",
          role: "accounts_officer",
          active: true,
          signature_version: 1,
        },
        {
          id: "sig_princi",
          org_id: "demo",
          full_name: "Prof. Sayyid Munavvar Ali",
          designation: "Principal",
          role: "principal",
          active: true,
          signature_version: 1,
        },
      ],
      signatureMode: "digital",
      showSeal: true,
      showDistributionBar: true,
      qrVerification: true,
      onExportRecorded: (exp) => {
        recordedExport = exp;
      },
      items: sample15Students,
    });

    expect(testFile).toContain("Khazna_Fiqh2_Statement_");
    expect(recordedExport).not.toBeNull();
    expect(recordedExport.ref).toMatch(/^KHZ-FIQH-\d{8}-\d{3}$/);
    expect(recordedExport.token.length).toBeGreaterThanOrEqual(16);
    expect(recordedExport.sha256).toBeTruthy();
    expect(recordedExport.pdf_base64).toMatch(/^data:application\/pdf/);
  });

  it("handles high-volume dataset (200 students multi-page without errors)", async () => {
    const students200: StudentReportItem[] = [];
    for (let i = 1; i <= 200; i++) {
      students200.push({
        studentId: `S${String(i).padStart(5, "0")}`,
        studentName: `Student ${i} Full Name`,
        className: "Fiqh 2",
        credit: 2500,
        debit: 1000,
        balance: 1500,
      });
    }

    const t0 = Date.now();
    const result = await generateClassWisePdf({
      collegeName: "Islahul Uloom Arabic College",
      sectorName: "Dept Fiqh",
      className: "Fiqh 2",
      from: "2026-07-15",
      to: "2026-11-12",
      contentFilter: "debit",
      sortBy: "adm_asc",
      showSummaryCards: true,
      showNetBalance: false,
      showSignatureLines: true,
      showPageNumbers: true,
      orientation: "portrait",
      items: students200,
    });
    const duration = Date.now() - t0;
    expect(result).toBeTruthy();
    expect(duration).toBeLessThan(5000); // Fast generation under 5s
  });
});

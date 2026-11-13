import { describe, expect, it } from "vitest";
import { sortReportItems, type StudentReportItem } from "./pdf-report";
import { downloadCSVReport } from "./export";

describe("Report Sorting & Export Tests", () => {
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
});

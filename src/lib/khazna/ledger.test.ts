import { describe, expect, it } from "vitest";
import { formatINR } from "./format";
import { previewAfter, receiptSeries, totals, withRunningBalance } from "./ledger";
import type { Tx } from "./types";

const tx = (p: Partial<Tx>): Tx => ({ id: "T1", sector: "office", studentId: "S0125", type: "credit", title: "x", amount: 100, date: "2026-11-01", receiptNo: "OF-1", createdBy: "x", ...p });

describe("ledger rules", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR(-500)).toBe("-₹500");
  });
  it("balance is credits minus debits and ignores voided entries", () => {
    const t = totals([tx({ amount: 1000 }), tx({ id: "T2", type: "debit", amount: 1500 }), tx({ id: "T3", amount: 9999, voided: { reason: "dup", by: "a", at: "x" } })]);
    expect(t.balance).toBe(-500);
  });
  it("bulk debit preview subtracts the amount", () => {
    expect(previewAfter(300, "debit", 500)).toBe(-200);
  });
  it("receipt series pads numbers", () => {
    expect(receiptSeries("ST-", 1, 3)).toEqual(["ST-001", "ST-002", "ST-003"]);
  });
  it("running balance accumulates oldest first", () => {
    const r = withRunningBalance([tx({ id: "B", date: "2026-11-02", type: "debit", amount: 40 }), tx({ id: "A", date: "2026-11-01" })]);
    expect(r.map((x) => x.running)).toEqual([100, 60]);
  });
});

import type { SectorSlug, Tx, TxType } from "./types";

export interface Totals {
  credit: number;
  debit: number;
  balance: number;
  count: number;
}

/** Credits minus debits. Voided entries never count. */
export function totals(txs: Tx[], filter: { studentId?: string; sector?: SectorSlug } = {}): Totals {
  let credit = 0;
  let debit = 0;
  let count = 0;
  for (const t of txs) {
    if (t.voided) continue;
    if (filter.studentId && t.studentId !== filter.studentId) continue;
    if (filter.sector && t.sector !== filter.sector) continue;
    if (t.type === "credit") credit += t.amount;
    else debit += t.amount;
    count++;
  }
  return { credit, debit, balance: credit - debit, count };
}

/** Oldest-first list with a running balance column (voided rows carry the previous balance). */
export function withRunningBalance(txs: Tx[]) {
  const sorted = [...txs].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  let bal = 0;
  return sorted.map((t) => {
    if (!t.voided) bal += t.type === "credit" ? t.amount : -t.amount;
    return { ...t, running: bal };
  });
}

export function signedAmount(type: TxType, amount: number) {
  return type === "credit" ? amount : -amount;
}

/** Balance after applying one batch entry. */
export function previewAfter(before: number, type: TxType, amount: number) {
  return before + signedAmount(type, amount);
}

export function receiptSeries(prefix: string, start: number, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(3, "0")}`);
}

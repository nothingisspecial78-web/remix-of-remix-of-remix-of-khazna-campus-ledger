import { addDays, TODAY } from "./format";
import { totals } from "./ledger";
import type { SectorSlug, Student, Tx } from "./types";

export function studentSectorBalances(txs: Tx[], sector?: SectorSlug) {
  const map = new Map<string, { credit: number; debit: number; balance: number; last?: string }>();
  for (const t of txs) {
    if (t.voided) continue;
    if (sector && t.sector !== sector) continue;
    const key = sector ? t.studentId : `${t.studentId}|${t.sector}`;
    const cur = map.get(key) ?? { credit: 0, debit: 0, balance: 0 };
    if (t.type === "credit") cur.credit += t.amount;
    else cur.debit += t.amount;
    cur.balance = cur.credit - cur.debit;
    if (!cur.last || t.date > cur.last) cur.last = t.date;
    map.set(key, cur);
  }
  return map;
}

export function pendingDues(txs: Tx[], sector?: SectorSlug) {
  let amount = 0;
  let count = 0;
  for (const v of studentSectorBalances(txs, sector).values()) {
    if (v.balance < 0) {
      amount += -v.balance;
      count++;
    }
  }
  return { amount, count };
}

export function inLastDays(t: Tx, days: number) {
  return t.date > addDays(TODAY, -days) && t.date <= TODAY;
}

export function dailySeries(txs: Tx[], days: number, sector?: SectorSlug) {
  const out: { date: string; credit: number; debit: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(TODAY, -i);
    idx.set(d, out.length);
    out.push({ date: d, credit: 0, debit: 0 });
  }
  for (const t of txs) {
    if (t.voided || (sector && t.sector !== sector)) continue;
    const i = idx.get(t.date);
    if (i === undefined) continue;
    out[i]![t.type] += t.amount;
  }
  return out;
}

export function studentCombined(txs: Tx[], s: Student) {
  return totals(txs, { studentId: s.id });
}

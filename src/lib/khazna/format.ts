const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹ with Indian digit grouping, e.g. 1234567 -> ₹12,34,567. Negative -> -₹500. */
export function formatINR(n: number, opts: { sign?: boolean } = {}) {
  const abs = inr.format(Math.abs(Math.round(n)));
  if (n < 0) return `-₹${abs}`;
  if (opts.sign && n > 0) return `+₹${abs}`;
  return `₹${abs}`;
}

export function formatCompactINR(n: number) {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return formatINR(n);
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

export const formatDate = (d: string) => dateFmt.format(new Date(d.length === 10 ? d + "T00:00:00Z" : d));
export const formatShortDate = (d: string) => shortFmt.format(new Date(d.length === 10 ? d + "T00:00:00Z" : d));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

/** Fixed "today" so server and browser render the same mock data. */
export const TODAY = "2026-11-12";
export const NOW_ISO = "2026-11-12T17:20:00Z";

export function addDays(date: string, days: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function timeAgo(iso: string, now = NOW_ISO) {
  const diff = (new Date(now).getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function initials(name: string) {
  return name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

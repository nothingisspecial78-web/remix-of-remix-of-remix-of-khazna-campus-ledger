/** Triggers a browser download of rows as CSV. */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Minimal CSV parser for uploads (comma separated, optional quotes, header row first). */
export function parseCSV(text: string) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter((l) => l.trim());
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  return { headers: split(lines[0] ?? ""), rows: lines.slice(1).map(split) };
}

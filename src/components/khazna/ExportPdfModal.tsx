import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Loader2,
  Calendar,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { Btn } from "./btn";
import { KDialog } from "./overlays";
import { Field, Segmented } from "./primitives";
import {
  generateClassWisePdf,
  type PdfReportOptions,
  type StudentReportItem,
} from "@/lib/khazna/pdf-report";
import { formatDate } from "@/lib/khazna/format";

const STORAGE_PDF_KEY = "khazna_pdf_report_options_v1";

interface ExportPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeName: string;
  sectorName: string;
  classes: string[];
  initialClass: string;
  initialFrom: string;
  initialTo: string;
  allItems: StudentReportItem[];
}

export function ExportPdfModal({
  open,
  onOpenChange,
  collegeName,
  sectorName,
  classes,
  initialClass,
  initialFrom,
  initialTo,
  allItems,
}: ExportPdfModalProps) {
  // Load saved options from localStorage with defaults
  const [cls, setCls] = useState(initialClass || "all");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [contentFilter, setContentFilter] = useState<"all" | "credit" | "debit">("all");
  const [sortBy, setSortBy] = useState<PdfReportOptions["sortBy"]>("adm_asc");
  const [showSummaryCards, setShowSummaryCards] = useState(true);
  const [showNetBalance, setShowNetBalance] = useState(true);
  const [showSignatureLines, setShowSignatureLines] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [generating, setGenerating] = useState(false);

  // Restore saved preferences on open
  useEffect(() => {
    if (open) {
      setFrom(initialFrom);
      setTo(initialTo);
      setCls(initialClass || "all");
      try {
        const saved = localStorage.getItem(STORAGE_PDF_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.contentFilter) setContentFilter(parsed.contentFilter);
          if (parsed.sortBy) setSortBy(parsed.sortBy);
          if (typeof parsed.showSummaryCards === "boolean") setShowSummaryCards(parsed.showSummaryCards);
          if (typeof parsed.showNetBalance === "boolean") setShowNetBalance(parsed.showNetBalance);
          if (typeof parsed.showSignatureLines === "boolean") setShowSignatureLines(parsed.showSignatureLines);
          if (typeof parsed.showPageNumbers === "boolean") setShowPageNumbers(parsed.showPageNumbers);
          if (parsed.orientation) setOrientation(parsed.orientation);
        }
      } catch {
        // use defaults
      }
    }
  }, [open, initialClass, initialFrom, initialTo]);

  // Filter items according to class and content
  const filteredItems = useMemo(() => {
    return allItems.filter((it) => {
      // Class filter
      if (cls !== "all" && it.className !== cls) return false;
      // Content filter
      if (contentFilter === "debit" && it.debit <= 0) return false;
      if (contentFilter === "credit" && it.credit <= 0) return false;
      return true;
    });
  }, [allItems, cls, contentFilter]);

  const handleDownload = async () => {
    if (filteredItems.length === 0) {
      toast.error("No student records match the selected options");
      return;
    }

    setGenerating(true);
    try {
      // Save current choices to localStorage
      localStorage.setItem(
        STORAGE_PDF_KEY,
        JSON.stringify({
          contentFilter,
          sortBy,
          showSummaryCards,
          showNetBalance,
          showSignatureLines,
          showPageNumbers,
          orientation,
        })
      );

      const targetClassName = cls === "all" ? "All Classes" : cls;

      const filename = await generateClassWisePdf({
        collegeName,
        sectorName,
        className: targetClassName,
        from,
        to,
        contentFilter,
        sortBy,
        showSummaryCards,
        showNetBalance,
        showSignatureLines,
        showPageNumbers,
        orientation,
        items: filteredItems,
      });

      toast.success("PDF Report generated", {
        description: `Saved as ${filename} (${filteredItems.length} students)`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate PDF", {
        description: "Please check your browser permissions and try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <KDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          <span>Export PDF Report</span>
        </div>
      }
      description="Configure options and download a print-ready PDF statement."
      className="max-w-lg"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="font-semibold text-foreground">{filteredItems.length}</span> students included
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => onOpenChange(false)} disabled={generating}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleDownload} disabled={generating || filteredItems.length === 0}>
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Preparing PDF…
                </>
              ) : (
                <>
                  <FileCheck2 className="size-4" /> Download PDF
                </>
              )}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Class Selection */}
        <Field label="Target Class">
          <div className="relative">
            <Layers className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <select
              className="k-input pl-9"
              value={cls}
              onChange={(e) => setCls(e.target.value)}
            >
              <option value="all">All Classes (Full Department)</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </Field>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="From Date">
            <input
              type="date"
              className="k-input num"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To Date">
            <input
              type="date"
              className="k-input num"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        {/* Content Filter Segmented */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Content Filter
          </label>
          <Segmented
            className="w-full justify-between"
            value={contentFilter}
            onChange={(v) => setContentFilter(v as any)}
            options={[
              { value: "all", label: "All (Credit + Debit)" },
              { value: "debit", label: "Debit only" },
              { value: "credit", label: "Credit only" },
            ]}
          />
        </div>

        {/* Sort by Option */}
        <Field label="Sort order">
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <select
              className="k-input pl-9"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="adm_asc">Admission No (Low → High · Natural)</option>
              <option value="adm_desc">Admission No (High → Low · Natural)</option>
              <option value="name_asc">Student Name (A → Z · Locale-aware)</option>
              <option value="name_desc">Student Name (Z → A · Locale-aware)</option>
              <option value="bal_desc">Net Balance (Highest first)</option>
              <option value="bal_asc">Net Balance (Lowest / Deficit first)</option>
            </select>
          </div>
        </Field>

        {/* Page Orientation */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Page Orientation
          </label>
          <Segmented
            className="w-full justify-between"
            value={orientation}
            onChange={(v) => setOrientation(v as any)}
            options={[
              { value: "portrait", label: "Portrait (Standard)" },
              { value: "landscape", label: "Landscape (Wide Table)" },
            ]}
          />
        </div>

        {/* Extras Toggles */}
        <div className="rounded-xl border border-hairline bg-accent/40 p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="size-3.5" /> Extras & Layout Options
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                checked={showSummaryCards}
                onChange={(e) => setShowSummaryCards(e.target.checked)}
              />
              <span>Summary Cards</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                checked={showNetBalance}
                onChange={(e) => setShowNetBalance(e.target.checked)}
              />
              <span>Net Balance Column</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                checked={showSignatureLines}
                onChange={(e) => setShowSignatureLines(e.target.checked)}
              />
              <span>Signature Lines</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                checked={showPageNumbers}
                onChange={(e) => setShowPageNumbers(e.target.checked)}
              />
              <span>Page Numbers</span>
            </label>
          </div>
        </div>
      </div>
    </KDialog>
  );
}

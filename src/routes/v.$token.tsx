import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useRef, useState } from "react";
import { useKhazna } from "@/lib/khazna/store";
import type { ReportExport } from "@/lib/khazna/types";

export const Route = createFileRoute("/v/$token")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PublicReportViewerPage,
});

function PublicReportViewerPage() {
  const { token } = Route.useParams();
  const reports = useKhazna((s) => s.reportExports);
  const college = useKhazna((s) => s.college);

  const [report, setReport] = useState<ReportExport | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [numPages, setNumPages] = useState<number>(0);
  const [renderError, setRenderError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRenderedRef = useRef(false);

  useEffect(() => {
    // Check report record in local store or memory
    const rep = reports.find((r) => r.token === token);
    if (!rep) {
      setStatus("invalid");
      return;
    }

    // Check expiration and revocation
    const now = Date.now();
    if (rep.revoked_at) {
      setStatus("invalid");
      return;
    }
    if (rep.expires_at && new Date(rep.expires_at).getTime() < now) {
      setStatus("invalid");
      return;
    }

    // Update document title to the exact reference number
    document.title = rep.ref;

    // Increment view counter once per load
    if (typeof window !== "undefined") {
      rep.view_count = (rep.view_count || 0) + 1;
      rep.last_viewed_at = new Date().toISOString();
    }

    setReport(rep);
    setStatus("valid");
  }, [token, reports]);

  // Render PDF pages with pdf.js on devicePixelRatio canvas
  useEffect(() => {
    if (status !== "valid" || !report || pagesRenderedRef.current) return;

    let isMounted = true;
    pagesRenderedRef.current = true;

    async function loadAndRenderPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Configure worker
        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || "4.10.38"}/pdf.worker.min.mjs`;
        }

        let pdfSource: string | Uint8Array = "";
        if (report?.pdf_base64) {
          pdfSource = report.pdf_base64;
        } else if (report?.storage_path) {
          pdfSource = `/v/${token}/file`;
        }

        if (!pdfSource) {
          throw new Error("No PDF source available");
        }

        const loadingTask = pdfjs.getDocument(pdfSource);
        const pdfDoc = await loadingTask.promise;
        if (!isMounted) return;

        setNumPages(pdfDoc.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const dpr = window.devicePixelRatio || 1;
        const availableWidth = Math.min(window.innerWidth - 32, 840);

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          if (!isMounted) return;

          const defaultViewport = page.getViewport({ scale: 1 });
          const scale = availableWidth / defaultViewport.width;
          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement("div");
          pageWrapper.className =
            "pdf-page-wrapper mb-6 bg-white shadow-md rounded-sm overflow-hidden flex justify-center";
          pageWrapper.style.maxWidth = `${viewport.width}px`;
          pageWrapper.style.margin = "0 auto 24px auto";

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.style.display = "block";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          const renderContext = {
            canvasContext: ctx,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
            viewport,
          };

          await page.render(renderContext).promise;
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);
        }
      } catch (err) {
        console.warn("pdf.js client rendering error, activating iframe fallback:", err);
        if (isMounted) {
          setRenderError(true);
        }
      }
    }

    loadAndRenderPdf();

    return () => {
      isMounted = false;
    };
  }, [status, report, token]);

  // Invalid / Expired / Revoked -> Standard plain 404 message
  if (status === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-slate-800 font-sans">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            This document is not available.
          </h1>
          <p className="text-sm text-slate-500">
            The link you requested is invalid, expired, or has been revoked by the issuing institution.
          </p>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] py-4 sm:py-8 px-2 sm:px-4">
      {/* Bare Fullscreen PDF Container */}
      <div className="mx-auto max-w-[860px]">
        {renderError ? (
          // Fallback to embed / iframe if pdf.js fails in specific sandboxed browser
          <div className="space-y-4">
            <iframe
              src={report?.pdf_base64 || `/v/${token}/file`}
              title={report?.ref || "Report"}
              className="h-[90vh] w-full rounded-lg border border-slate-300 bg-white shadow-lg"
            />
            <div className="text-center">
              <a
                href={report?.pdf_base64 || `/v/${token}/file`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-600 underline"
              >
                Open document directly
              </a>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="space-y-4" />
        )}
      </div>
    </div>
  );
}

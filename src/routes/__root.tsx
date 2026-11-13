import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import campusBackdrop from "@/assets/campus-clean.jpg.asset.json";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Khazna — Islahul Uloom Finance Portal" },
      { name: "description", content: "Khazna is the cash ledger and finance portal of Islahul Uloom college." },
      { name: "author", content: "Islahul Uloom" },
      { name: "theme-color", content: "#F7F5F2" },
      { property: "og:title", content: "Khazna — Islahul Uloom Finance Portal" },
      { property: "og:description", content: "Cash ledger and finance portal of Islahul Uloom college." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('khazna-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {/* Fast pure HTML/CSS branded splash screen (<100ms render, 900-1200ms dismiss) */}
        <div
          id="khazna-fast-splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--background, #F7F5F2)",
            transition: "opacity 0.4s ease, visibility 0.4s ease",
            pointerEvents: "all",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg
              style={{ width: "96px", height: "96px", transform: "rotate(-90deg)", animation: "spin 1.4s linear infinite" }}
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="44" stroke="#FDBA74" strokeWidth="3" fill="none" opacity="0.25" />
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#F97316"
                strokeWidth="3.5"
                fill="none"
                strokeDasharray="276"
                strokeDashoffset="90"
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                overflow: "hidden",
                boxShadow: "0 12px 36px -8px rgba(249,115,22,0.65)",
                animation: "pulse-scale 1.6s ease-in-out infinite",
              }}
            >
              <img src="/icon-192.png" alt="Khazna" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "22px",
                color: "var(--foreground, #0F172A)",
                letterSpacing: "-0.02em",
              }}
            >
              Khazna
            </div>
            <div
              style={{
                fontFamily: "'Geist', system-ui, sans-serif",
                fontSize: "11px",
                color: "var(--subtle, #64748B)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Campus Ledger
            </div>
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin { 100% { transform: rotate(270deg); } }
                @keyframes pulse-scale { 0%, 100% { transform: scale(0.92); } 50% { transform: scale(1); } }
              `,
            }}
          />
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const splash = document.getElementById("khazna-fast-splash");
    if (splash) {
      const timer = setTimeout(() => {
        splash.style.opacity = "0";
        splash.style.pointerEvents = "none";
        setTimeout(() => {
          splash.remove();
        }, 400);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-backdrop" aria-hidden="true">
        <div className="app-backdrop-photo" style={{ backgroundImage: `url(${campusBackdrop.url})` }} />
        <div className="app-backdrop-veil" />
        <div className="app-backdrop-orbs">
          <span />
          <span />
          <span />
        </div>
        <div className="app-backdrop-sheen" />
      </div>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="bottom-right" theme="light" richColors closeButton />
    </QueryClientProvider>
  );
}

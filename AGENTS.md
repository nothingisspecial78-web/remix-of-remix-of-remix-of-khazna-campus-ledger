<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Khazna is UI-only: all data lives in the Zustand store in src/lib/khazna (seeded, deterministic mock data with a fixed TODAY) — keeps SSR and browser output identical and avoids any backend.
- Balance math (credits minus debits, voided entries excluded) lives only in src/lib/khazna/ledger.ts and is covered by ledger.test.ts — keep pages calling it instead of re-implementing.
- Sector colors reach components via the `--tile` CSS variable (tileVar helper + tile-* utilities in styles.css) — never hardcode sector colors in components.
- The campus photo backdrop is rendered once in src/routes/__root.tsx with the `app-backdrop` utility; body stays transparent so it shows through — don't give pages or body their own full-page backgrounds.
- Scroll-in animation comes from `reveal()` in src/components/khazna/motion.ts (GlassCard, TableShell, SectorTile already use it) — spread it on new cards/rows instead of hand-writing initial/animate so motion stays consistent; pass a resting opacity instead of opacity-* classes, which motion's inline style would override.
- The login → dashboard hand-off uses a one-shot client flag in src/lib/khazna/sign-in-transition.ts that AppShell reads on mount — keeps the reveal off for normal navigation and SSR.
- Hover lift on cards uses the `hover-lift` utility, which animates the CSS `translate` property rather than `transform` — framer-motion writes inline transforms that would otherwise cancel it.

- Sectors are dynamic (`SectorSlug` is a string): look icons up with `sectorIcon()` and guard sector routes against the store's sector list, because a signed-up college creates its own sectors at runtime.
- College sign-up (`signUpCollege`) swaps the store to an empty college and "Try demo" (`loadDemo`) restores the seed — keep both client-side so the preview needs no backend.

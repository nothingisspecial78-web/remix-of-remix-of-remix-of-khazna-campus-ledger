# Remix of Remix of Remix of Khazna Campus Ledger

Create Khazna — a dark glassmorphism cash-ledger and finance portal for a college (Islahul Uloom).

IMPORTANT REQUIREMENTS:
- Focus ONLY on UI and UX design. Do NOT connect or configure any backend, database, or external Supabase services. All data must use rich, realistic client-side mock data and state (e.g., Zustand or React state) so the entire portal is fully interactive, responsive, and clickable in the preview.
- Design System: Dark, neutral-charcoal glassmorphism floating over a dark subtle gradient mesh background (#0b0b0d base, #141416 secondary). Translucent glass cards (bg-white/[0.06], backdrop-blur-xl, border border-white/[0.12], rounded-2xl, inner top highlight, shadow-2xl).
- Accent Colors:
  * Primary Accent / Highlights: Warm Orange (#F97316)
  * Credit / Positive: Emerald (#34D399)
  * Debit / Negative: Rose (#FB7185)
  * Progress Ring / Info: Blue (#60A5FA)
  * Sector Glossy Tiles: Office (Orange #F97316), Ihsan Union (Emerald #34D399), Velitcham Welfare (Purple #A78BFA), Dept Fiqh (Blue #60A5FA), Dept Civil (Pink #F472B6)
- Currency: ₹ formatted with Indian numbering (en-IN), tabular-nums.
- Role-based Shell with top-bar Role Switcher (Super Admin, Sector Manager with sector switcher, Student: Safwan S0125) for immediate previewing.
- Complete screens:
  1. Login Screen (/login): Dark glass card, role quick-switch demo pills + credentials form.
  2. Super Admin (/admin):
     - Dashboard: Stat cards, collection progress ring, 5 sector tiles grid, recent activity.
     - Student Directory (/admin/students): Table with search, class filter, Add Student drawer, Export.
     - Bulk Student Import (/admin/students/import): Stepper (Upload CSV -> Map -> Validate Preview with valid/invalid chips -> Done).
     - Admins Management (/admin/admins): Manager cards, sector assignment drawer.
     - Sectors & Classes (/admin/sectors): Sector management cards.
     - Audit Log (/admin/audit): Append-only audit table with filters.
  3. Sector Manager (/m/:sectorSlug):
     - Sector Overview: Sector KPIs, 30-day collection chart, top debit titles, pending dues list.
     - Ledger (/m/:sectorSlug/ledger): Filterable transactions table, "+ New Entry" modal (title required, debit reason mandatory, amount, receipt #), void with reason action.
     - WOW Feature: Bulk Entry Stepper (/m/:sectorSlug/bulk):
       * Step 1: Select Students (class filter chips e.g. 'Fiqh 2', select all, search, counter bar).
       * Step 2: Details (Credit/Debit toggle, title template chips like 'Study Tour Fee', amount ₹500, date, receipt prefix ST-).
       * Step 3: Glass Preview Table showing before -> after balances with green/red delta chips and total batch sum.
       * Step 4: Confirm with animated progress ring and success state.
     - Class-wise Reports (/m/:sectorSlug/reports): Class select, date range, table showing Student, Ad.No, Class, Total Credit, Total Debit, Balance (red if negative), Totals row. PDF / Excel / CSV / Print export mock buttons.
     - Batches (/m/:sectorSlug/batches): Batch history with one-click void batch.
  4. Student Portal (/app):
     - Student Overview (/app): Greeting, Total Combined Balance hero card with animated count-up, 5 glossy sector tiles with balances & last activity, recent transactions list.
     - Sector Ledger (/app/s/:sectorSlug): Sector banner, total credits/debits, transaction table with running balance column, download statement button.
     - Profile (/app/profile): Avatar, Ad.No, Class, phone edit, change password card.
     - Notifications (/app/notifications): In-app notification list with unread indicators.
- Realistic Kerala/Arabic names (Safwan K., Muhammed Bilal, Nihal Rahman, Fathima Zahra, etc.) and educational fees titles. Include framer-motion transitions and lucide-react icons throughout.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e384e778-591b-4812-a9e9-e8e33e02e066).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

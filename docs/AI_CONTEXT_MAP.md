# AI Context Map

## Purpose

Route an AI agent to the **minimum useful context** for a task.

Do not treat this as a list of files to read all at once. Start with the task area, then follow only the relevant path.

## Universal entry point

Always start with:

1. `README.md`
2. `AI_RULES.md`
3. this file

Then select the task path below.

## Task routing

| Task area | Read first | Source entry points |
|---|---|---|
| Auth / sessions / access | `ARCHITECTURE.md` | `src/lib/auth.ts`, `src/proxy.ts`, relevant auth/API routes |
| Portfolio CRUD | `DOMAIN.md`, `DATABASE.md` | `src/lib/portfolio-db.ts`, `src/app/api/portfolios/route.ts`, `src/app/api/portfolios/[id]/route.ts` |
| Transactions | `DOMAIN.md`, `DATABASE.md`, `CALCULATIONS.md` | `src/lib/portfolio.ts`, transaction API routes, `AddTransactionButton.tsx`, `PortfolioTransactionsTable.tsx` |
| Cash | `DOMAIN.md`, `CALCULATIONS.md` | `src/lib/portfolio.ts`, `src/lib/portfolio-summary.ts`, relevant transaction routes |
| Assets | `PROJECT.md`, `DOMAIN.md` | `src/lib/asset-db.ts`, `src/app/api/assets/route.ts` |
| Pricing / integrations | `PROJECT.md`, relevant integration docs | `src/lib/finnhub-service.ts`, `src/lib/coinmarketcap-service.ts`, `src/lib/byma-service.ts`, `src/lib/data912-service.ts`, relevant API routes (`/api/byma/cedears`, `/api/data912/arg-stocks`) |
| Holdings / positions | `DOMAIN.md`, `CALCULATIONS.md` | `src/lib/portfolio-positions.ts`, `src/lib/portfolio.ts` |
| Performance / metrics | `CALCULATIONS.md` | `src/lib/portfolio-summary.ts`, `src/lib/portfolio-positions.ts` |
| Dashboard / portfolio UI | `ARCHITECTURE.md`, `VISUAL.md`, `WORKFLOWS.md` | `src/app/page.tsx`, `src/components/HomeHeroCard.tsx`, `src/components/PortfolioDashboardClient.tsx`, `src/components/PortfolioV3MainClient.tsx` |
| Transaction UI | `VISUAL.md`, `WORKFLOWS.md`, `DOMAIN.md` | `src/components/AddTransactionButton.tsx`, `src/components/PortfolioTransactionsTable.tsx` |
| Export / Import (Settings) | `PROJECT.md`, `WORKFLOWS.md` | `src/app/settings/page.tsx` (`/export` redirects there), `src/components/TransactionsExportPanel.tsx` (currency columns: `portfolio_currency`, `transaction_currency`, `asset_currency`, `asset_price_currency`, `asset_price_ars`), `src/components/TransactionsImportPanel.tsx`, `src/app/api/portfolios/import-transactions/route.ts` |
| API / backend flow | `ARCHITECTURE.md`, `WORKFLOWS.md` | relevant `src/app/api/**` route plus its service/data dependencies |
| Database / persistence | `DATABASE.md` | relevant `src/lib/*-db.ts`, route/service using it |
| Cross-cutting change | `ARCHITECTURE.md` + affected domain docs | trace only the changed flow and its consumers |
| Visual / theming / styling | `VISUAL.md`, `ARCHITECTURE.md` (Theming) | `src/app/layout.tsx`, `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`, `src/app/globals.css`, `src/app/portfolio-ui.css` |

## High-risk expansion

For changes involving any of these, also consult `AI_CHECKLISTS.md`:

- transaction semantics;
- holdings or performance calculations;
- cash;
- persistence/schema changes;
- authentication/authorization;
- external pricing/integrations;
- cross-cutting API changes.

Use `AUDIT.md` only when the task relates to a known finding or when risk analysis specifically calls for it.

## Context discipline

- Prefer the exact source entry point over broad repository reading.
- Read only the sections of a document relevant to the task when possible.
- Follow imports, callers and consumers only as needed.
- Do not open a file merely because it appears in a checklist.
- If the task is isolated and low-risk, stop investigation once the affected behavior and dependencies are understood.

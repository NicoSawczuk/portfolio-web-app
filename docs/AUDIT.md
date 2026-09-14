# Audit Findings

This document lists findings that are not necessarily intended architecture. No fixes were made.

## Critical Issues

### Integration Endpoint Is Not Owner-Scoped

Severity: CRITICAL

Files:

- `src/app/api/integrations/portfolios/[id]/transactions/route.ts`
- `src/lib/portfolio-db.ts`

Current implementation:

- Integration `POST` uses `readPortfolioById(id)` and `replacePortfolioById(id, portfolio)` without `ownerUserId`.
- Access is controlled only by `PORTFOLIO_TRANSACTIONS_API_KEY`.

Risk:

- Anyone with the global API key can write transactions to any portfolio id.

Confidence: high.

### Whole Portfolio Replacement For Transaction Mutations

Severity: CRITICAL

Files:

- `src/app/api/portfolios/[id]/route.ts`
- `src/app/api/integrations/portfolios/[id]/transactions/route.ts`
- `src/lib/portfolio-db.ts`

Current implementation:

- Creating/editing/deleting a transaction reads the full portfolio, mutates arrays in memory, and calls `replacePortfolioById()`.

Risk:

- Concurrent edits can overwrite each other because there is no versioning, atomic array update or MongoDB transaction.

Confidence: high.

## High Priority

### Oversells Are Allowed And Calculations Clamp Quantity

Severity: HIGH

Files:

- `src/app/api/portfolios/[id]/route.ts`
- `src/app/api/integrations/portfolios/[id]/transactions/route.ts`
- `src/lib/portfolio-summary.ts`
- `src/lib/portfolio-positions.ts`

Current implementation:

- Persistence does not validate that sell quantity is available.
- Calculations clamp remaining quantity/cost to zero.
- Closed-position realized proceeds use full sold quantity, while cost removal uses clamped held quantity.

Risk:

- Potential incorrect realized P/L and misleading portfolio state.

Confidence: high.

### Normal Transaction API Has Weaker Validation Than Integration API

Severity: HIGH

Files:

- `src/app/api/portfolios/[id]/route.ts`
- `src/app/api/integrations/portfolios/[id]/transactions/route.ts`

Current implementation:

- Normal UI API checks required fields mostly by truthiness.
- Integration API validates date format, positive numbers, JSON parsing and notes length.

Risk:

- Invalid dates, non-finite numbers or malformed values may enter through normal API if client validation is bypassed.

Confidence: high.

### Cash Transactions Are Allowed On Non-Cash Portfolios But Ignored By Metrics

Severity: HIGH

Files:

- `src/components/AddTransactionButton.tsx`
- `src/components/PortfolioTransactionsTable.tsx`
- `src/app/api/portfolios/[id]/route.ts`
- `src/lib/portfolio-summary.ts`

Current implementation:

- UI exposes `cash_in` and `cash_out` regardless of `portfolio.managesCash`.
- API accepts cash transactions regardless of `managesCash`.
- Calculations ignore cash movements when `managesCash` is false.

Risk:

- User can create transactions that appear in history/export but do not affect portfolio metrics.

Confidence: high.

### Portfolio Assets Embedded Transactions Are Inconsistent

Status: RESOLVED — the per-asset `transactions` field was removed from the `Asset` type (`src/lib/portfolio.ts`). API routes and import scripts no longer write it, and `normalizeAsset()` / `normalizePortfolio()` strip it from legacy documents on read. The only transaction ledger is `Portfolio.transactions`. The description below is kept as historical record of the original finding.

Severity: HIGH

Files:

- `src/app/api/portfolios/[id]/route.ts`
- `scripts/import-trades-from-pt-export.mjs`

Current implementation:

- Runtime transaction creation prepends to `portfolio.transactions` but does not add the transaction to `portfolio.assets[].transactions`.
- Runtime update/delete still filter embedded asset transaction arrays.
- Import script populates embedded asset transaction arrays.

Risk:

- `portfolio.assets[].transactions` may be stale, empty or inconsistent depending on data origin.

Confidence: high.

## Medium Priority

### Global Asset Deletion Does Not Check Portfolio References

Severity: MEDIUM

Files:

- `src/app/api/assets/route.ts`
- `src/lib/asset-db.ts`
- `src/lib/portfolio-summary.ts`

Current implementation:

- Deleting a global asset removes it from `assets` collection only.
- Portfolios may still contain transactions referencing its `assetId`.

Risk:

- Calculations fall back to price `0` for missing global asset metadata, affecting valuations.

Confidence: high.

### Historical Chart Uses Current Prices

Severity: MEDIUM

File:

- `src/lib/portfolio-summary.ts`

Current implementation:

- Chart points by date use current asset prices for historical quantities.

Risk:

- Chart may be interpreted as historical portfolio value even though it is current-price value over historical quantities.

Confidence: high.

### No Automated Tests Found

Severity: MEDIUM

Current implementation:

- No `test` or `spec` files found by `rg --files -g '*test*' -g '*spec*'`.
- `package.json` has no test script.

Risk:

- Financial and persistence behavior has no automated regression safety net.

Confidence: high.

### Duplicate Client Validation And Formatting Logic

Severity: MEDIUM

Files:

- `src/components/AddTransactionButton.tsx`
- `src/components/PortfolioTransactionsTable.tsx`
- `src/components/PortfolioDashboardClient.tsx`
- `src/components/PortfolioValuationCard.tsx`
- `src/lib/portfolio-format.ts`

Current implementation:

- Decimal parsing, transaction type checks and currency formatting are repeated in multiple components.

Risk:

- Future behavior changes can become inconsistent.

Confidence: high.

### Price Refresh Is Manual Only In Normal App Flow

Severity: MEDIUM

Files:

- `src/app/api/assets/route.ts`
- `src/app/page.tsx`
- `src/app/portfolios/page.tsx`
- `src/app/portfolios/[id]/page.tsx`

Current implementation:

- `/api/assets` returns stored assets unless `forceRefresh=1`.
- Server-rendered dashboards call `readAssets({ minimal: true })` directly.

Risk:

- Dashboard values can be stale until the assets page refresh button is used.

Confidence: high.

## Low Priority

### Non-Unique Asset Symbols

Severity: LOW

File:

- `src/lib/asset-db.ts`

Current implementation:

- `{ symbol: 1 }` index is not unique.

Risk:

- Duplicate symbols can exist and confuse search/export/selection.

Confidence: high.

### `data` Directory Referenced By Scripts Is Missing

Severity: LOW

Files:

- `scripts/import-pt-csv.js`
- `scripts/import-trades-from-pt-export.mjs`
- `README.md`

Current implementation:

- Scripts target `data/portfolios.json` and `data/assets.json`.
- Directory was not present in repository during audit.
- README describes those files as legacy/import-only.

Risk:

- Scripts fail unless legacy files are restored.

Confidence: high.

### UI Text Encoding Appears Mojibake In Source Output

Severity: LOW

Files:

- Multiple `.tsx` and `.ts` files.

Observation:

- Source output shows strings like `transacciÃ³n`.

Risk:

- Could be terminal encoding display only, or actual mojibake in files.

UNKNOWN / REQUIRES CONFIRMATION:

- Need verify file encoding/rendered UI before classifying as actual user-facing defect.

## Observations

### Registration Creates Expired Users

Files:

- `src/app/api/auth/register/route.ts`

Current implementation:

- New user `expirationDateIso` is set to one day ago.
- Login blocks expired users.

Interpretation:

- This appears intentional account activation by administrator, based on response message.

### `priceSource` Is Response Metadata, Not Persisted In Refresh

Files:

- `src/lib/finnhub-service.ts`

Current implementation:

- `hydratedAssets` include `priceSource`.
- `persistedAssets` persist price and timestamps, not `priceSource`.

Impact:

- Assets page can show live/local after refresh response, but a later DB read may not include persisted `priceSource`.

### No MongoDB Aggregations

Observation:

- All financial aggregation is in JavaScript after loading documents.

Impact:

- Simpler behavior, but may not scale with large embedded transaction arrays.


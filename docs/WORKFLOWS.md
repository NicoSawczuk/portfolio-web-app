# Workflows

## Portfolio Creation

```text
PortfolioDashboardClient
  -> handleSave()
  -> POST /api/portfolios
  -> session from auth_token cookie
  -> validate name
  -> create Portfolio object
  -> insertPortfolio()
  -> MongoDB portfolios.insertOne()
  -> JSON portfolio
  -> client prepends portfolio to state
```

Files:

- `src/components/PortfolioDashboardClient.tsx`
- `src/app/api/portfolios/route.ts`
- `src/lib/portfolio-db.ts`

Persisted fields:

- `id`, `ownerUserId`, `name`, `description`, `currency`, `managesCash`, `createdAt`, `assets: []`, `transactions: []`.

## Portfolio Update/Delete

Update:

```text
PortfolioDashboardClient
  -> PUT /api/portfolios
  -> updatePortfolioFields()
  -> portfolios.findOneAndUpdate()
  -> client replaces portfolio in state
```

Delete:

```text
PortfolioDashboardClient
  -> DELETE /api/portfolios
  -> deletePortfolioById(id, session.userId)
  -> portfolios.deleteOne()
  -> client removes portfolio from state
```

Consequence:

- Delete removes all embedded transactions/assets in that portfolio document.

## Asset Creation / Retrieval

Creation:

```text
AssetsPageClient
  -> POST /api/assets
  -> API verifies session, then requires users_permissions { userId, action: "assets:create" } (403 otherwise)
  -> validate symbol/name and id_partner
  -> insertAsset()
  -> MongoDB assets.insertOne()
  -> client prepends asset
```

PUT /api/assets requires `assets:edit` and DELETE /api/assets requires `assets:delete`, with the same 403 behavior.

Retrieval:

```text
Server pages
  -> readAssets({ minimal: true }) for portfolio-related pages
Assets page
  -> readAssets() for full asset records
```

Files:

- `src/components/AssetsPageClient.tsx`
- `src/app/assets/page.tsx` (loads canCreate/canEdit/canDelete/canRefresh for the view)
- `src/app/api/assets/route.ts`
- `src/lib/asset-db.ts`
- `src/lib/user-permissions-db.ts`
- `src/lib/permissions.ts`

Important:

- Creating a global asset does not add it to any portfolio until a buy/sell transaction references it.
- Asset permissions are deny-by-default: no `users_permissions` document means the action is blocked (403) and the button is hidden. There is no management UI; permissions are granted/revoked directly in MongoDB.

## Asset Price Refresh

```text
AssetsPageClient refresh button (rendered only with canRefresh)
  -> GET /api/assets?forceRefresh=1
  -> API verifies session, then requires users_permissions { userId, action: "assets:refresh" } (403 otherwise)
  -> readAssets()
  -> refreshAssetsQuotesWithCache(assets, { forceRefresh: true })
  -> Finnhub, CoinMarketCap, BYMA and Data912 requests run with Promise.allSettled
  -> Finnhub covers stock/etf (price, USD); CoinMarketCap covers crypto (price, USD); BYMA covers cedear (price, ARS); Data912 covers ARS stocks (price, ARS). ARS-quoted assets are never sent to Finnhub
  -> writeAssets(persistedAssets) if price/price_ars/timestamps changed
  -> return hydratedAssets
  -> client replaces assets state
```

Files:

- `src/app/api/assets/route.ts`
- `src/lib/finnhub-service.ts`
- `src/lib/coinmarketcap-service.ts`
- `src/lib/byma-service.ts`
- `src/lib/data912-service.ts`
- `src/lib/asset-db.ts`

Fallback behavior:

- Failed/unconfigured provider results in local persisted price.
- BYMA symbols with invalid/missing `bidPrice` (e.g. outside market hours) are skipped: price (in ARS) and `quoteUpdatedAt` keep their last valid values.

## Transaction Creation From UI

Entry points:

- `AddTransactionButton` on portfolio detail.
- `PortfolioTransactionsTable` on transactions/detail pages.

Flow:

```text
Client modal
  -> parse positive decimal input
  -> asset picker lists only assets whose currency matches the portfolio currency
  -> POST /api/portfolios/[id] with { kind: "transaction", ... }
  -> API verifies session
  -> validates type and required fields by truthiness
  -> readPortfolioById(id, session.userId)
  -> for buy/sell: readAssetById(assetId)
  -> for buy/sell: reject with 400 if asset currency != portfolio currency
  -> create Transaction id
  -> prepend transaction to portfolio.transactions
  -> if buy/sell and asset not in portfolio.assets, copy global asset into portfolio.assets
  -> replacePortfolioById(id, portfolio, session.userId)
  -> return full updated portfolio
  -> client replaces local portfolio state
```

Files:

- `src/components/AddTransactionButton.tsx`
- `src/components/PortfolioTransactionsTable.tsx`
- `src/app/api/portfolios/[id]/route.ts`
- `src/lib/portfolio-db.ts`
- `src/lib/asset-db.ts`

Consequence:

- No persisted recalculation occurs.
- Metrics update because client state now contains the new transaction and pure calculation helpers recompute in React.

## Transaction Modification

```text
PortfolioTransactionsTable
  -> open existing transaction in modal
  -> PUT /api/portfolios/[id] with { kind: "transaction", transactionId, ... }
  -> API verifies session and required fields
 -> read portfolio
 -> find existing transaction
 -> for buy/sell: verify global asset and ensure embedded portfolio asset exists
 -> replace matching item in portfolio.transactions
 -> replace whole portfolio document
 -> return updated portfolio
 -> client updates state
```

Important:

- For cash transaction updates, asset fields and quantity are explicitly set to `undefined`.

## Transaction Deletion

```text
PortfolioTransactionsTable
  -> DELETE /api/portfolios/[id] with { kind: "transaction", transactionId }
  -> API verifies session
 -> read portfolio
 -> filter transaction out of portfolio.transactions
 -> replace whole portfolio document
 -> return updated portfolio
 -> client updates state
```

Consequences:

- Holdings, cash and performance change only after recalculation from remaining transactions.
- Embedded portfolio asset remains even if no transaction still references it.

## Cash Deposit

Creation:

```text
Client selects transaction type cash_in
  -> API stores transaction with type cash_in, price amount, date, notes
  -> no assetId/quantity
  -> calculation later applies cashBalance += price only if managesCash=true
```

Cash withdrawal:

```text
cash_out
  -> stored like cash_in
  -> calculation later applies cashBalance -= price only if managesCash=true
```

Files:

- `src/components/AddTransactionButton.tsx`
- `src/components/PortfolioTransactionsTable.tsx`
- `src/app/api/portfolios/[id]/route.ts`
- `src/lib/portfolio-summary.ts`

UNKNOWN / REQUIRES CONFIRMATION:

- Cash transactions can be created even when `portfolio.managesCash` is false, but they do not affect metrics in current calculations.

## Integration Transaction Ingestion

```text
External caller
  -> POST /api/integrations/portfolios/[id]/transactions
  -> x-api-key must equal PORTFOLIO_TRANSACTIONS_API_KEY
  -> parse JSON
  -> telegramUserId must be a positive integer (400 otherwise)
  -> findUserByTelegramId(telegramUserId); unknown or expired user is rejected (401)
  -> caller must hold users_permissions { userId, action: "n8n_transactions:create" } (403 otherwise)
  -> readPortfolioById(id); missing or foreign portfolio returns 404
  -> validate type/date/price/notes
  -> for buy/sell: validate symbol/quantity; resolve the asset with resolveAssetForTransaction (portfolio currency wins over the catalog's duplicated tickers)
  -> prepend transaction
  -> replacePortfolioById(id, portfolio, caller.id) scoped by ownerUserId
  -> return { ok, portfolioId, transactionId, transaction }
```

Files:

- `src/app/api/integrations/portfolios/[id]/transactions/route.ts`

Important difference from UI API:

- Stricter date/positive number validation.
- Uses API key plus `telegramUserId` instead of user session.
- Is scoped by owner user id: the portfolio must belong to the `telegramUserId` caller.
- Rejects with 400 if the asset currency != portfolio currency (same invariant as the UI API).
- Symbol resolution goes through `resolveAssetForTransaction`, so buy/sell always attach to an asset whose currency matches the portfolio; the only path that resolves by symbol alone.

## Asset Resolution By Symbol

```text
resolveAssetForTransaction(portfolioAssets, symbol, portfolioCurrency)  (src/lib/asset-db.ts)
  -> normalize symbol (trim + uppercase); empty symbol returns null
  -> reuse the portfolio's own position for that symbol *in the portfolio currency* (same id)
  -> otherwise read every catalog asset sharing the symbol and prefer the candidate
     whose currency equals the portfolio currency, falling back to the first candidate
  -> callers keep the asset-currency-must-match-portfolio-currency check, so the
     fallback candidate still fails loudly instead of mixing currencies
```

Why: `{ symbol: 1 }` is a non-unique index, so the same ticker can exist in the catalog
in more than one currency (e.g. `GGAL` in ARS and `GGAL` in USD). Resolving by
`symbol` alone returned whichever document came first, which split positions or mixed
currencies. Every by-symbol path must go through this helper; `GET`-style UI flows
already send `assetId` and are unaffected.

## Transactions Export

```text
/settings page (Configuración; /export redirects here)
  -> readPortfolios(session.userId) + readAssets({ minimal: true })
  -> TransactionsExportPanel (client-side CSV/JSON download)
  -> rows carry portfolio_currency, transaction_currency
     (buy/sell: asset currency via metadata when available, otherwise portfolio currency),
     asset_currency, asset_price_currency and asset_price_ars
  -> asset_price uses the effective price (asset currency; price_ars fallback for legacy cedear)
```

## Transactions Import

```text
/settings page (Configuración)
  -> TransactionsImportPanel (JSON file upload or paste, example + copy + field help)
  -> JSON shape: { portfolioId, transactions: [{ type, symbol?, quantity?, price, date, notes? }] }
     - type: buy | sell | cash_in | cash_out
     - buy/sell require symbol (must exist in assets) + quantity > 0
     - price > 0 and date YYYY-MM-DD always required; notes optional (<= 1000 chars)
  -> POST /api/portfolios/import-transactions (session auth, portfolio must belong to user)
  -> atomic server validation: any row error aborts with 400 + per-row errors
  -> buy/sell rows resolve their asset with resolveAssetForTransaction, considering assets
     already added by earlier rows of the same batch
  -> asset currency must match portfolio currency (same invariant as other transaction APIs)
  -> missing portfolio assets are added; transactions are prepended
```

Files:

- `src/app/settings/page.tsx`
- `src/components/TransactionsImportPanel.tsx`
- `src/app/api/portfolios/import-transactions/route.ts`

## Portfolio Valuation

```text
Page loads portfolio and global minimal assets
  -> getPortfolioSummary(portfolio, assets)
  -> calculatePortfolioPerformance(portfolio, assets)
  -> derive holdings/cash/totals
  -> render valuation cards and positions
```

Files:

- `src/lib/portfolio-summary.ts`
- `src/lib/portfolio-positions.ts`
- `src/components/PortfolioValuationCard.tsx`
- `src/components/PortfolioV3MainClient.tsx`

## Dashboard Loading

Home:

```text
/ page
  -> cookies()
  -> verifySessionToken()
  -> readPortfolios(session.userId)
  -> readAssets({ minimal: true })
  -> calculatePortfolioPerformance() per portfolio (chart points skipped)
  -> group into totalsByCurrency + totalMarketByCurrency (USD -> ARS, never mixed)
  -> HomeHeroCard (client, USD/ARS switch) + Inversion/Ganancias/Activos sections
```

Portfolio list:

```text
/portfolios
  -> cookies/session
  -> readPortfolios(session.userId)
  -> readAssets({ minimal: true })
  -> PortfolioDashboardClient
  -> getPortfolioSummary() per portfolio on client
```

Portfolio detail:

```text
/portfolios/[id]
  -> cookies/session
  -> readPortfolioById(id, session.userId)
  -> readAssets({ minimal: true })
  -> PortfolioV3MainClient
  -> getPortfolioSummary()
  -> buildPortfolioPositionsAnalytics()
```

Important:

- Normal dashboard loading does not refresh prices from external providers.


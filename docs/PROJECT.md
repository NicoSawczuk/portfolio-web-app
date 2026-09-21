# Project

## What The Application Is

Portfolio Web App is a personal investment portfolio manager. The current UI and code support:

- User login and registration.
- Global asset management.
- Portfolio creation, editing and deletion.
- Manual transaction creation, editing and deletion.
- Cash movements for cash-enabled portfolios.
- Portfolio dashboards with derived value and performance metrics.
- Transaction export to CSV/JSON.
- External transaction ingestion through an API key endpoint.

Source: `README.md`, `src/app/*`, `src/components/*`, `src/app/api/*`.

## Business Purpose

Business intent from `AI Project Audit - Portfolio Web App.md`:

- Track personal investments in stocks (USD and ARS), ETFs, cryptocurrencies and CEDEARs.
- Combine manually recorded transactions with current prices.
- Calculate portfolio value, positions, returns, profit/loss and metrics.
- Support cash balances for portfolios where deposits fund later purchases.

Current implementation:

- Supports asset types `stock`, `etf`, `crypto`, `bond`, `cash`, `other`, `cedear`.
- Records transactions of type `buy`, `sell`, `cash_in`, `cash_out`.
- Uses the effective global asset price for current market values (`getAssetCurrentPrice()`: `price` in the asset currency, `price_ars` fallback for legacy `cedear`). Assets carry an explicit `currency` (`USD`/`ARS`), enabling ARS stocks.
- Calculates holdings, cash and P/L from transaction arrays at render/query time.

## Intended Users

Confirmed from UI and auth implementation:

- Individual authenticated users.
- Each portfolio can be scoped to `ownerUserId`.

UNKNOWN / REQUIRES CONFIRMATION:

- Whether multiple real users are intended beyond the current owner/admin workflow.
- Whether registration is self-service in production. New users are created expired by default in `src/app/api/auth/register/route.ts`.

## Main Capabilities

| Capability | Current implementation |
| --- | --- |
| Authentication | Custom email/password auth, HMAC signed cookie. |
| Assets | CRUD on global `assets` collection. |
| Price refresh | Manual UI refresh calls `/api/assets?forceRefresh=1`. |
| Portfolios | CRUD on user-scoped `portfolios` collection. |
| Transactions | Embedded in portfolio documents and edited through `/api/portfolios/[id]`. |
| Cash movements | `cash_in` and `cash_out` transactions. |
| Portfolio metrics | Derived by `src/lib/portfolio-summary.ts`. |
| Open/closed positions | Derived by `src/lib/portfolio-positions.ts`. |
| Export | Client-side CSV/JSON from server-loaded portfolios/assets, with currency columns (`portfolio_currency`, `transaction_currency`, `asset_currency`, `asset_price_currency`, `asset_price_ars`). |
| Home summary | Per-currency totals (`totalsByCurrency`, USD -> ARS) rendered in a single hero card with currency switch (`src/components/HomeHeroCard.tsx`). |
| Integration | API-key-protected transaction ingestion endpoint. |

## Supported Investment Types

Confirmed type union: `src/lib/portfolio.ts`

- `stock`
- `etf`
- `crypto`
- `bond`
- `cash`
- `other`
- `cedear`

External live pricing is implemented only for:

- `stock` and `etf` (USD) via Finnhub; ARS-quoted assets are excluded so a USD quote never overwrites an ARS price.
- mapped `crypto` assets via CoinMarketCap.
- `cedear` assets via BYMA (ARS; invalid quotes never overwrite the stored price).
- `stock` assets in ARS via Data912 (`/live/arg_stocks`; invalid quotes never overwrite the stored price).

## Portfolio Concepts

Portfolio fields:

- `id`
- `ownerUserId`
- `name`
- `description`
- `currency` (`USD`/`ARS`, set at creation; filters the portfolio list and gates buy/sell by asset currency)
- `managesCash`
- `createdAt`
- `assets`
- `transactions`

Portfolios embed a local `assets` list, but current calculations mostly use the global `assets` list passed into calculation functions. Embedded portfolio assets appear to preserve a snapshot of assets used by a portfolio, but this is not fully enforced.

## Cash-Enabled Portfolios

Business intent:

- Deposits increase available cash.
- Purchases consume cash.
- Sales increase cash.
- Cash is part of total portfolio value.

Current implementation:

- Cash behavior is active only when `portfolio.managesCash` is truthy in `calculatePortfolioPerformance()`.
- `cash_in`: increases cash balance and net contributions.
- `cash_out`: decreases cash balance and net contributions.
- `buy`: decreases cash balance by `quantity * price`.
- `sell`: increases cash balance by `quantity * price`.
- Cash is shown as a synthetic holding with assetId `cash:<portfolio.id>` and the portfolio currency as symbol.
- Cash is listed as the first open position (`Efectivo` / portfolio currency) in the portfolio detail when `managesCash` is true. The card is not clickable, its dot is always green, and open-position allocation (`sharePct`) is measured including cash.

UNKNOWN / REQUIRES CONFIRMATION:

- Whether transactions of type `cash_in`/`cash_out` should be allowed for portfolios with `managesCash=false`. The UI and API allow them; calculations ignore cash if `managesCash` is false.
- Whether the system should prevent negative cash balances. Current code does not.

## Main User Workflows

- Register/login.
- Create a portfolio, optionally enabling cash management.
- Create global assets and optionally set `id_partner` for crypto.
- Refresh global asset prices manually.
- Add buy/sell/cash transactions to a portfolio.
- View open positions, closed positions and transaction history.
- Export transactions.
- Ingest transactions from an external integration via API key.


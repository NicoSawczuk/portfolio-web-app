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

- Track personal investments in stocks, ETFs and cryptocurrencies.
- Combine manually recorded transactions with current prices.
- Calculate portfolio value, positions, returns, profit/loss and metrics.
- Support cash balances for portfolios where deposits fund later purchases.

Current implementation:

- Supports asset types `stock`, `etf`, `crypto`, `bond`, `cash`, `other`.
- Records transactions of type `buy`, `sell`, `cash_in`, `cash_out`.
- Uses global `assets.price` for current market values.
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
| Export | Client-side CSV/JSON from server-loaded portfolios/assets. |
| Integration | API-key-protected transaction ingestion endpoint. |

## Supported Investment Types

Confirmed type union: `src/lib/portfolio.ts`

- `stock`
- `etf`
- `crypto`
- `bond`
- `cash`
- `other`

External live pricing is implemented only for:

- `stock` and `etf` via Finnhub.
- mapped `crypto` assets via CoinMarketCap.

## Portfolio Concepts

Portfolio fields:

- `id`
- `ownerUserId`
- `name`
- `description`
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
- Cash is shown as a synthetic holding with symbol `USD` and assetId `cash:<portfolio.id>`.
- Cash is listed as the first open position (`Efectivo` / `USD`) in the portfolio detail when `managesCash` is true. The card is not clickable, its dot is always green, and open-position allocation (`sharePct`) is measured including cash.

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


# Domain

## Source Of Truth

Primary domain contracts live in `src/lib/portfolio.ts`.

```text
Portfolio
  -> embedded assets: Asset[]
  -> embedded transactions: Transaction[]

Global Asset
  -> stored in assets collection
  -> used for current price and metadata lookup

Transaction
  -> embedded in Portfolio.transactions
  -> optionally references global Asset by assetId
```

## Entities

### User

Purpose:

- Authenticated owner of portfolios.

Representation:

- `src/lib/user-db.ts` collection `users`.
- Public/session logic in `src/lib/auth.ts`.

Important fields:

- `id`, `email`, `name`, `password`, `expiration_date`, `createdAt`.

Relationships:

- `Portfolio.ownerUserId` should match `User.id` for normal UI/API access.

Business rules:

- User is active only if `expiration_date` is a parseable future date.
- New registrations are created with an expiration date one day in the past.

### Portfolio

Purpose:

- Container for investment transactions and derived portfolio metrics.

Representation:

- Type: `Portfolio` in `src/lib/portfolio.ts`.
- Persistence: `src/lib/portfolio-db.ts`.

Important fields:

- `id`: string id generated from MongoDB `ObjectId`.
- `ownerUserId`: optional owner id.
- `name`, `description`.
- `managesCash`: enables cash calculation.
- `createdAt`.
- `assets`: embedded asset snapshots.
- `transactions`: embedded transaction ledger.

Relationships:

- Owns embedded transactions.
- May embed assets used by transactions.
- Reads global assets for current prices during calculations.

Consumers:

- Home summary, portfolio list, portfolio detail, transactions page, export, integration endpoint.

Business rules:

- Name is required for create/update.
- Normal API reads/writes are owner-scoped.
- Deleting a portfolio deletes the whole MongoDB document.

### Asset

Purpose:

- Tradable item or asset metadata with current price.

Representation:

- Type: `Asset` in `src/lib/portfolio.ts`.
- Global persistence: `src/lib/asset-db.ts`.
- Embedded snapshot inside portfolios.

Important fields:

- `id`, `symbol`, `name`, `type`, `id_partner`, `price`.
- `priceSource`, `quoteCheckedAt`, `quoteUpdatedAt`.
- No `transactions` field: the only transaction ledger is `Portfolio.transactions`. Legacy documents may still contain a per-asset `transactions` array; `normalizeAsset()` and `normalizePortfolio()` strip it on read.

Relationships:

- Transactions reference assets by `assetId`.
- Transactions denormalize `assetSymbol`, `assetName`, `assetType`.
- Current valuation uses global asset price by matching `asset.id`.

Business rules:

- Global asset symbol and name are required.
- Symbol is uppercased.
- `id_partner` must be a positive integer if provided.
- No uniqueness constraint on `symbol`; only an index exists.

### Transaction

Purpose:

- Ledger entry for asset trades or cash movements.

Representation:

- Type: `Transaction` in `src/lib/portfolio.ts`.
- Stored only as embedded objects in `Portfolio.transactions`.

Types:

- `buy`
- `sell`
- `cash_in`
- `cash_out`

Important fields:

- `id`, `type`, `price`, `date`, `notes`.
- For `buy`/`sell`: `assetId`, `assetSymbol`, `assetName`, `assetType`, `quantity`.
- For cash transactions: asset fields and quantity are omitted/undefined by API code.

Business rules:

- UI validates positive quantity/price for asset transactions.
- UI validates positive amount in `price` for cash transactions.
- Normal portfolio API checks required truthiness but not strict positive/date validity.
- Integration API has stricter positive number/date/note validation.

UNKNOWN / REQUIRES CONFIRMATION:

- Whether transaction dates should always be valid `YYYY-MM-DD` in normal UI/API flows. Integration enforces it; normal portfolio API mostly trusts the client.
- Whether overselling should be blocked. Current calculations clamp remaining quantity to zero but do not reject sells.

### Cash And Deposit

Purpose:

- Model available cash inside a portfolio.

Representation:

- No separate `Cash` collection or persisted balance.
- Deposits are `Transaction` with `type: "cash_in"`.
- Withdrawals are `Transaction` with `type: "cash_out"`.

Business rules in calculations:

- Cash is calculated only when `portfolio.managesCash` is true.
- `cash_in` increases cash balance and net contributions.
- `cash_out` decreases cash balance and net contributions.
- `buy` decreases cash balance.
- `sell` increases cash balance.
- Cash appears as synthetic holding in `calculatePortfolioPerformance()`.
- Cash is listed as the first open position (`Efectivo` / `USD`) in portfolio positions when `managesCash` is true; the card is not clickable (cash has no asset detail page) and its dot is always green (`#10b981`).

UNKNOWN / REQUIRES CONFIRMATION:

- There is no explicit guard preventing cash transactions on non-cash portfolios.
- There is no persisted historical cash balance.
- There is no guard against negative cash.

### Holding / Position

Purpose:

- Derived current open exposure to an asset.

Implementation:

- Summary holdings: `calculatePortfolioPerformance()` in `src/lib/portfolio-summary.ts`.
- Open/closed positions: `buildPortfolioPositionsAnalytics()` in `src/lib/portfolio-positions.ts`.

Business rules:

- Buy increases quantity and total cost.
- Sell decreases quantity and total cost using current average buy price.
- Open positions require positive remaining quantity.
- Closed positions require near-zero quantity plus bought and sold quantity.

### Price

Purpose:

- Current price used to value holdings.

Representation:

- Stored on global `Asset.price`.
- Quote metadata: `quoteCheckedAt`, `quoteUpdatedAt`.

Providers:

- Finnhub for stocks/ETFs.
- CoinMarketCap for eligible crypto assets.

Business rules:

- Provider refresh persists changed price/timestamps only via `/api/assets?forceRefresh=1`.
- If provider unavailable/fails/no fresh quote, existing local price remains in use.

### Performance And Metrics

Purpose:

- Derived financial view for dashboards.

Implementation:

- `src/lib/portfolio-summary.ts` for portfolio-level holdings, totals, P/L, allocation, chart points.
- `src/lib/portfolio-positions.ts` for open and closed position analytics.

Consumers:

- `/`, `/portfolios`, `/portfolios/[id]`, position detail pages.

## Domain Relationship Map

```text
User
  -> Portfolios by ownerUserId

Portfolio
  -> Transactions embedded in transactions[]
  -> Asset snapshots embedded in assets[]
  -> Cash behavior enabled by managesCash

Transaction
  -> Optional Asset reference through assetId
  -> Denormalized asset metadata
  -> Buy/Sell affects derived holdings
  -> Cash In/Out affects derived cash when managesCash=true

Global Asset
  -> Current price for calculations
  -> External provider metadata
```


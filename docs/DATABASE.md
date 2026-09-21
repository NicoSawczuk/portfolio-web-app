# Database

## MongoDB Connection

Implementation: `src/lib/mongodb.ts`

- Uses native MongoDB driver.
- Requires `MONGODB_URI` and `MONGODB_DATABASE`.
- Rejects URIs containing unexpanded `${...}` placeholders.
- Creates one shared `MongoClient.connect()` promise.
- Stores the promise in `global.__mongoClientPromise` only outside production.

## Collections

### `users`

Purpose:

- Stores login users and account expiration.

Implementation:

- `src/lib/user-db.ts`

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated from `ObjectId().toHexString()`. |
| `email` | string | Normalized lower-case email. |
| `name` | string | Trimmed on create. |
| `password` | string | `saltHex:keyHex` from scrypt. |
| `expiration_date` | string | ISO date string used to allow/deny login. |
| `createdAt` | string | ISO creation timestamp. |
| `telegramUserId` | number/undefined | Telegram user id. Set directly in MongoDB; used to attribute n8n integration calls. |

Indexes:

- `{ id: 1 }`, unique.
- `{ email: 1 }`, unique.
- `{ expiration_date: 1 }`.
- `{ telegramUserId: 1 }`, sparse.

Read operations:

- `findUserByEmail(email)` -> `findOne({ email: normalized })`.
- `findUserByTelegramId(telegramUserId)` -> `findOne({ telegramUserId })`, null for non-positive integers.

Write operations:

- `createUser()` -> `insertOne(user)`.

Delete operations:

- None in runtime code.

Consumers:

- Auth login/register routes.

Performance considerations:

- Email lookup is indexed.

### `users_permissions`

Purpose:

- Stores per-user action permissions. One document per user + action. A user holds many permissions.
- Currently only asset actions are enforced. Missing document means denied (deny-by-default).

Implementation:

- `src/lib/permissions.ts` (action constants)
- `src/lib/user-permissions-db.ts`

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | string | Matches `users.id`. |
| `action` | string | Lower-cased on read/check (e.g. `assets:create`). |
| `createdAt` | string | ISO creation timestamp. |

Valid actions:

| Action | Grants |
| --- | --- |
| `assets:create` | `POST /api/assets` and the create button/modal on the assets page. |
| `assets:edit` | `PUT /api/assets` and the edit button/modal on the assets page. |
| `assets:delete` | `DELETE /api/assets` and the delete button on the assets page. |
| `assets:refresh` | `GET /api/assets?forceRefresh=1` and the refresh-quotes button on the assets page. |
| `n8n_transactions:create` | `POST /api/integrations/portfolios/[id]/transactions` for the caller identified by `telegramUserId`. |
| `dollar:create` | `POST /api/dollar-quotes` (`refresh`/`manual`) and the refresh + "Editar cotización" UI on the exchange-rate page. |
| `dollar:edit` | Per-row edit button on the dollar history (prefills the manual editor; saving still requires `dollar:create`). |
| `dollar:delete` | `DELETE /api/dollar-quotes` and the per-row delete button on the dollar history. |

Indexes:

- `{ userId: 1, action: 1 }`, unique.
- `{ userId: 1 }`.
- `{ action: 1 }`.

Read operations:

- `getUserPermissionActions(userId)` -> `find({ userId })`, returns normalized action strings.
- `hasUserPermission(userId, action)` -> `findOne({ userId, action })`, boolean.
- `getUserAssetPermissions(userId)` -> `{ canCreate, canEdit, canDelete, canRefresh }`.

Write operations:

- None in runtime code. Permissions are granted directly in MongoDB (no management UI or API).

Delete operations:

- None in runtime code. Permissions are revoked directly in MongoDB.

Grant example:

```js
db.users_permissions.insertMany([
  { userId: "<users.id>", action: "assets:create", createdAt: new Date().toISOString() },
  { userId: "<users.id>", action: "assets:edit", createdAt: new Date().toISOString() },
  { userId: "<users.id>", action: "assets:delete", createdAt: new Date().toISOString() },
  { userId: "<users.id>", action: "assets:refresh", createdAt: new Date().toISOString() },
]);
```

Consumers:

- Assets API route (POST/PUT/DELETE/forceRefresh enforcement, 403 on missing permission).
- Assets server page (loads `canCreate/canEdit/canDelete/canRefresh` for the view).
- Dollar quotes API route (`POST` requires `dollar:create`, `DELETE` requires `dollar:delete`, 403 otherwise).
- Exchange-rate server page (loads `canCreate/canEdit/canDelete` for the view; `dollar:edit` only gates the per-row prefill button).
- `GET /api/auth/me` and `POST /api/auth/login` (return `permissions: string[]`).
- Integration transactions endpoint (requires `n8n_transactions:create` for the `telegramUserId` caller).

Performance considerations:

- Permission checks are single indexed `findOne` queries per mutating request.

### `assets`

Purpose:

- Stores global asset catalog and current prices.

Implementation:

- `src/lib/asset-db.ts`

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated from `ObjectId().toHexString()`. |
| `symbol` | string | Uppercased on API create/update. |
| `name` | string | Required by API. |
| `type` | string | `stock`, `etf`, `crypto`, `bond`, `cash`, `other`, `cedear`. |
| `id_partner` | number/undefined | Used for CoinMarketCap crypto id. |
| `currency` | string/undefined | Quote currency `USD` or `ARS`. Missing in legacy docs resolves as `ARS` for `cedear`, `USD` otherwise. |
| `price` | number | Current/local price in the asset currency (`currency`, default `USD`). All assets (including ARS assets) store their price here. |
| `price_ars` | number/undefined | Legacy: ARS price only for old `cedear` documents without `currency`. Kept for backward compatibility; new writes clear it. |
| `priceSource` | string/undefined | Present in hydrated API responses but not persisted by `refreshAssetsQuotesWithCache()`. |
| `quoteCheckedAt` | string/undefined | Persisted on quote refresh. |
| `quoteUpdatedAt` | string/undefined | Persisted on quote refresh when provider returns quote. |
| `transactions` | array (legacy) | Removed from the `Asset` type. Old documents may still contain it; `normalizeAsset()` strips it on read and it is no longer written. |

Indexes:

- `{ id: 1 }`, unique.
- `{ symbol: 1 }`, non-unique.

Read operations:

- `readAssets({ minimal?: boolean })` -> `find({}).sort({ _id: -1 })`.
- `readAssetById(id)` -> `findOne({ id })`.

Write operations:

- `insertAsset(asset)` -> `insertOne`.
- `updateAssetById(id, fields)` -> `findOneAndUpdate({ id }, { $set: update })`.
- `writeAssets(assets)` -> `bulkWrite(upsert)`; if empty, `deleteMany({})`.

Delete operations:

- `deleteAssetById(id)` -> `deleteOne({ id })`.

Important queries:

- All assets are loaded for dashboards and asset selectors.
- Minimal projection is used in portfolio pages to avoid transaction payload. It includes `currency` and `price_ars` (`{ _id: 0, id: 1, symbol: 1, name: 1, type: 1, currency: 1, price: 1, price_ars: 1 }`).

Consumers:

- Assets page/API.
- Portfolio transaction forms.
- Portfolio calculations for current prices.
- Price provider refresh.
- Export.

Performance considerations:

- No unique index on `symbol`, so duplicate symbols are possible.
- Loading all assets on many pages may become expensive if catalog grows.
- `readAssets().sort({ _id: -1 })` sorts on `_id`, which is indexed by MongoDB by default.

### `portfolios`

Purpose:

- Stores user portfolios with embedded assets and transactions.

Implementation:

- `src/lib/portfolio-db.ts`

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated from `ObjectId().toHexString()`. |
| `ownerUserId` | string/undefined | Used by normal app auth filters. |
| `name` | string | Required. |
| `description` | string | Optional string default `""`. |
| `currency` | string | `USD` or `ARS`. Set at creation, immutable. Missing in legacy docs normalizes to `USD` on read. |
| `managesCash` | boolean | Normalized to boolean. |
| `createdAt` | string | ISO timestamp. |
| `assets` | Asset[] | Embedded asset snapshots. |
| `transactions` | Transaction[] | Embedded ledger. |

Embedded transaction fields:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated from ObjectId. |
| `type` | string | `buy`, `sell`, `cash_in`, `cash_out`. |
| `assetId` | string/undefined | Present for buy/sell. |
| `assetSymbol` | string/undefined | Denormalized metadata. |
| `assetName` | string/undefined | Denormalized metadata. |
| `assetType` | string/undefined | Denormalized metadata. |
| `quantity` | number/undefined | Present for buy/sell. |
| `price` | number | Unit price for buy/sell, amount for cash. |
| `date` | string | Expected date input value. |
| `notes` | string/undefined | Optional. |

Indexes:

- `{ id: 1 }`, unique.
- `{ createdAt: -1 }`.
- `{ ownerUserId: 1, createdAt: -1 }`.

Read operations:

- `readPortfolios(ownerUserId?)` -> optional owner filter, sort by `createdAt`.
- `readPortfolioById(id, ownerUserId?)` -> optional owner filter.

Write operations:

- `insertPortfolio(portfolio)` -> `insertOne`.
- `replacePortfolioById(id, portfolio, ownerUserId?)` -> `replaceOne`.
- `updatePortfolioFields(id, fields, ownerUserId?)` -> `findOneAndUpdate` with `$set`.

Delete operations:

- `deletePortfolioById(id, ownerUserId?)` -> `deleteOne`.

Important queries:

- Normal UI portfolio operations pass `session.userId`.
- Integration transaction ingestion does not pass owner id.

Consumers:

- Home, portfolio dashboard/detail/transactions/export.
- Portfolio and transaction API routes.
- Integration ingestion endpoint.

Performance considerations:

- All transactions for a portfolio are embedded and loaded as one document.
- Mutating one transaction replaces the entire portfolio document.
- Large transaction histories can create large documents and larger write payloads.
- No index can target embedded transactions for current runtime access because reads fetch whole portfolio documents by portfolio id.

### `dollar_quotes`

Purpose:

- Stores official dollar quote history (`buy`, `sell`, `datetime`). Only real changes are recorded.

Implementation:

- `src/lib/dollar-quote-db.ts` (persistence), `src/lib/dollar-quote-service.ts` (central rule), `src/lib/dolarapi-service.ts` (DolarAPI client).

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated from `ObjectId().toHexString()`. |
| `buy` | number | Compra en ARS, > 0. |
| `sell` | number | Venta en ARS, > 0. |
| `datetime` | string | ISO timestamp (from DolarAPI `fechaActualizacion` or creation time for manual). |
| `source` | string/undefined | `api` or `manual`. |

Indexes:

- `{ id: 1 }`, unique.
- `{ datetime: -1 }`.

Read operations:

- `readLatestDollarQuote()` -> single doc sorted by `datetime` DESC.
- `readDollarQuotesHistory()` -> all docs sorted by `datetime` DESC.

Write operations:

- `insertDollarQuote()` -> `insertOne` (only via `saveDollarQuoteIfChanged()` when `buy`/`sell` differ from latest).
- `deleteDollarQuoteById(id)` -> `deleteOne` (history action chosen by user).

### `dollar_quote_daily_checks`

Purpose:

- Tracks successful automatic DolarAPI consultations per day so the lazy daily check runs at most once per day. Consulting and recording are different rules: a day is marked even when the quote did not change.

Document structure:

| Field | Type | Notes |
| --- | --- | --- |
| `date` | string | `YYYY-MM-DD` in `APP_TIMEZONE` (default `America/Argentina/Buenos_Aires`). |
| `checkedAt` | string | ISO timestamp of the successful check. |

## Aggregations

No MongoDB aggregation pipelines were found. Financial aggregations are performed in JavaScript.

## Transactions

No MongoDB multi-document transactions are used.

## Serialization

- Reads use projection `{ _id: 0 }` for app-facing documents.
- IDs are application-level string ids, not exposed MongoDB `_id`.

## Legacy Data Scripts

Files:

- `scripts/import-pt-csv.js`
- `scripts/import-trades-from-pt-export.mjs`

They read/write `data/portfolios.json` and `data/assets.json`. The `data` directory was not present in the repository at audit time. README states runtime persistence uses MongoDB only and these files are legacy/import helpers.


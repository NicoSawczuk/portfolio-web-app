# Architecture

## Framework And Runtime

| Item | Current implementation |
| --- | --- |
| Framework | Next.js `16.2.9` with App Router. |
| React | `19.2.4`. |
| Language | TypeScript with `allowJs: true`. |
| Package manager | npm, confirmed by `package-lock.json`. |
| Database driver | `mongodb` `^7.4.0`. |
| Styling | Tailwind CSS v4 via PostCSS plus global CSS files. |
| Tests | No test/spec files found by repository search. |

Sources: `package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`.

## Application Structure

```text
src/
  app/                 Next.js App Router pages and API routes
  components/          Client UI components and display components
  lib/                 Domain types, persistence, auth, providers, calculations
  proxy.ts             Auth gate for routes
scripts/               Legacy/helper import scripts targeting data/*.json
public/logos/          Logo and favicon assets
```

## Routing

| Route | File | Behavior |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Global summary across user portfolios. |
| `/login` | `src/app/login/page.tsx` | Login/register client UI. |
| `/portfolios` | `src/app/portfolios/page.tsx` | Portfolio list/dashboard. |
| `/portfolios/[id]` | `src/app/portfolios/[id]/page.tsx` | Portfolio positions overview. |
| `/portfolios/[id]/transactions` | `src/app/portfolios/[id]/transactions/page.tsx` | Transaction table. |
| `/portfolios/[id]/assets/[symbol]` | `src/app/portfolios/[id]/assets/[symbol]/page.tsx` | Open position detail by symbol. |
| `/portfolios/[id]/closed/[assetId]` | `src/app/portfolios/[id]/closed/[assetId]/page.tsx` | Closed position detail by asset id. |
| `/assets` | `src/app/assets/page.tsx` | Global assets management. |
| `/settings` | `src/app/settings/page.tsx` | Configuración: transaction export + JSON import. |
| `/export` | `src/app/export/page.tsx` | Legacy redirect to `/settings`. |

Most data pages export `dynamic = "force-dynamic"` to avoid static caching. `src/app/portfolios/[id]/page.tsx` does not explicitly set it, but it calls `cookies()`, so it is request-bound.

## Request Flow

```text
Browser
  -> Server Component page loads cookies/session
  -> MongoDB read functions in src/lib/*-db.ts
  -> Client component receives initial props
  -> Client mutations use fetch() to API routes
  -> API route validates session/body
  -> MongoDB write/read
  -> JSON response
  -> Client state update
```

## Server/Client Boundaries

Server-side:

- `src/app/page.tsx` and route pages read cookies, verify session and load MongoDB data.
- `src/app/api/**/route.ts` handles mutations and API reads.
- `src/lib/*-db.ts`, `src/lib/auth.ts`, provider services are server-oriented.

Client-side:

- Components with `"use client"` manage modal state, form state, filters, sorting, pagination and API mutations.
- Client components also run calculation helpers imported from `src/lib/portfolio-summary.ts` and `src/lib/portfolio-positions.ts`.

Important:

- Financial calculations run in both server and client contexts depending on consumer.
- Calculation files import only types and pure logic, so they are currently browser-compatible.

## Theming

- The active theme lives in `<html data-theme>` (`"light"` | `"dark"`, default `"dark"`).
- `src/components/ThemeProvider.tsx` owns the state, persists it in `localStorage` under `portfolio-theme`, falls back to `prefers-color-scheme` and follows OS changes until the user picks a theme; an inline script in `src/app/layout.tsx` applies it pre-hydration. `src/components/ThemeToggle.tsx` is the header toggle.
- Dark styling is hardcoded in components; light-mode remaps live in `src/app/globals.css` as `[data-theme="light"]` overrides. Tailwind v4 `divide-*` targets `:where(& > :not(:last-child))`, so overrides must use that shape (not the v3 `~` sibling selector) to also cover the first row.

## Backend Architecture

API routes:

| Endpoint | Methods | File |
| --- | --- | --- |
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` |
| `/api/auth/register` | POST | `src/app/api/auth/register/route.ts` |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` |
| `/api/auth/me` | GET | `src/app/api/auth/me/route.ts` |
| `/api/assets` | GET, POST, PUT, DELETE | `src/app/api/assets/route.ts` |
| `/api/byma/cedears` | GET, POST | `src/app/api/byma/cedears/route.ts` |
| `/api/portfolios` | GET, POST, PUT, DELETE | `src/app/api/portfolios/route.ts` |
| `/api/portfolios/[id]` | GET, POST, PUT, DELETE | `src/app/api/portfolios/[id]/route.ts` |
| `/api/integrations/portfolios/[id]/transactions` | POST | `src/app/api/integrations/portfolios/[id]/transactions/route.ts` |

No server actions were found.

## Data Layer

MongoDB connection:

- `src/lib/mongodb.ts` reads `MONGODB_URI` and `MONGODB_DATABASE`.
- Throws at module load if required env vars are missing.
- Reuses `global.__mongoClientPromise` in non-production.

Persistence modules:

- `portfolio-db.ts`: collection `portfolios`.
- `asset-db.ts`: collection `assets`.
- `user-db.ts`: collection `users`.
- `user-permissions-db.ts`: collection `users_permissions`; `permissions.ts` holds the action constants.

Pattern:

- Collection initialization lazily creates indexes once per process.
- Reads project out `_id`.
- Portfolios and assets are normalized after reads.

## Authentication And Authorization

Auth:

- Passwords use `scrypt` with random salt.
- Session token is JWT-like: base64url header, payload, HMAC-SHA256 signature.
- Cookie name: `auth_token`.
- Session TTL: 7 days, capped by user `expiration_date`.
- In development, missing `AUTH_SECRET` falls back to `dev-auth-secret-change-me`.
- In production, missing `AUTH_SECRET` throws.

Authorization:

- `src/proxy.ts` redirects unauthenticated page requests to `/login`.
- API routes return 401 if unauthenticated, except public auth routes.
- Portfolio reads/writes from normal UI include `ownerUserId` filter.
- Asset mutations require a `users_permissions` document (deny-by-default): `POST /api/assets` needs `assets:create`, `PUT` needs `assets:edit`, `DELETE` needs `assets:delete`, and `GET /api/assets?forceRefresh=1` needs `assets:refresh`. Missing permission returns 403. Plain `GET /api/assets` stays open to authenticated users.
- The assets server page loads `{ canCreate, canEdit, canDelete, canRefresh }` and `AssetsPageClient` hides the corresponding buttons and guards the handlers client-side.
- `GET /api/auth/me` and `POST /api/auth/login` return `permissions: string[]`.
- Permissions are managed directly in MongoDB; there is no management UI or API.
- Integration endpoint requires `x-api-key` plus a body `telegramUserId` that must match an active user holding `n8n_transactions:create` and owning the portfolio in the URL (foreign portfolios return 404).

## External Services

Finnhub:

- File: `src/lib/finnhub-service.ts`.
- Endpoint: `${FINNHUB_API_BASE_URL}/quote?symbol=...&token=...`.
- Eligible: `stock`, `etf`.
- Fetch cache mode: `no-store`.

CoinMarketCap:

- File: `src/lib/coinmarketcap-service.ts`.
- Endpoint: `${COINMARKETCAP_API_BASE_URL}/v1/simple/price?ids=...`.
- Auth header: `X-CMC_PRO_API_KEY`.
- Eligible: `crypto` assets with valid `id_partner` or default symbol mapping.

BYMA (CEDEARs):

- File: `src/lib/byma-service.ts`.
- Base URL from `BYMA_CEDEARS_URL` (default `https://open.bymadata.com.ar`), path `/vanoms-be-core/rest/api/bymadata/free/cedears`.
- `POST` with body `{ excludeZeroPxAndQty: true, T1: true, T0: false }`, no auth.
- Returns the full CEDEAR list (`symbol`, `bidPrice`, ...); the service filters by requested symbols and keeps only finite `bidPrice > 0`. The full dump is cached in memory with TTL (`BYMA_CEDEARS_TTL_MINUTES`, default 15) and concurrent callers share the in-flight request.
- Eligible: `cedear` assets only. Refresh writes `price_ars` (ARS) and never touches `price`; invalid/out-of-market quotes are discarded without overwriting the stored price.
- Direct access: `GET /api/byma/cedears?symbols=AAPL,MELI` or `POST /api/byma/cedears` with `{ "symbols": [...] }`.

## Caching And Revalidation

Current implementation:

- Next pages generally force dynamic rendering.
- Provider fetch calls use `cache: "no-store"`.
- Quote freshness is implemented through persisted fields `quoteUpdatedAt` and `quoteCheckedAt`, with `FINNHUB_QUOTES_REFRESH_MINUTES` defaulting to 15. Freshness is evaluated against the effective price (`price_ars` for `cedear`, `price` otherwise).
- `/api/assets` refreshes live quotes only when `forceRefresh=1`; otherwise it returns stored assets.

UNKNOWN / REQUIRES CONFIRMATION:

- Whether normal dashboard loads are intended to auto-refresh prices. Current code does not call provider refresh from server pages.

## Error Handling

- API routes return JSON `{ error: string }` with status codes.
- Client components catch errors and display `String(err)`, which can include `Error: ...`.
- Provider refresh uses `Promise.allSettled`; per-symbol/provider failures are swallowed and fallback to existing/local prices.
- MongoDB/env errors can throw during module load.

## Build And Deployment

- Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- `next.config.ts` has no custom options.
- No deployment config files found except README guidance for Vercel.


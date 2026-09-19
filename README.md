This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## MongoDB Atlas Integration

The app now uses MongoDB as the persistence layer.

Important:

- Runtime persistence (API and UI) uses MongoDB only.
- `data/portfolios.json` and `data/assets.json` are legacy files used only by import scripts.
- They are not the source of truth for the running app.

Required environment variables in `.env.local`:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DATABASE=portfolio_web_app
PORTFOLIO_TRANSACTIONS_API_KEY=your_strong_api_key
```

## n8n Transaction Ingestion Endpoint

There is a dedicated integration endpoint to insert transactions into a portfolio:

- `POST /api/integrations/portfolios/:id/transactions`
- Header required: `x-api-key: PORTFOLIO_TRANSACTIONS_API_KEY`
- Content-Type: `application/json`

Body:

```json
{
	"type": "buy",
	"symbol": "BTC",
	"quantity": 0.5,
	"price": 35000,
	"date": "2026-07-30",
	"notes": "optional",
	"telegramUserId": 123456789
}
```

Validation rules:

- `type` is required and must be one of: `buy`, `sell`, `cash_in`, `cash_out`.
- `telegramUserId` is required, must be a positive integer, and must match a `users.telegramUserId` whose account is active, holds the `n8n_transactions:create` permission, and owns the portfolio in the URL. Otherwise the request is rejected (`400`/`401`/`403`, or `404` if the portfolio does not belong to that user).

- `type` is required and must be one of: `buy`, `sell`, `cash_in`, `cash_out`.
- `date` is required and must use `YYYY-MM-DD`.
- `price` is required and must be greater than `0`.
- For `buy`/`sell`: `symbol` (e.g. `BTC`, `AAPL`, `SPY`, resolved via `readAssetBySymbol`) and `quantity > 0` are required.
- For `cash_in`/`cash_out`: `symbol` and `quantity` are ignored.

Responses:

- `201` with `{ ok, portfolioId, transactionId, transaction }` when persisted.
- `401` when API key is missing/invalid, or the `telegramUserId` caller is unknown/inactive.
- `403` when the caller lacks the `n8n_transactions:create` permission.
- `400` for payload validation errors.
- `404` when portfolio or asset is not found (including portfolios owned by another user).
- `500` when `PORTFOLIO_TRANSACTIONS_API_KEY` is not configured.

## Finnhub Integration

This project can fetch live asset prices from Finnhub using the `/quote` endpoint.

Required environment variables in `.env.local`:

```bash
FINNHUB_API_BASE_URL=https://finnhub.io/api/v1
FINNHUB_API_TOKEN=YOUR_TOKEN
FINNHUB_QUOTES_REFRESH_MINUTES=15
COINMARKETCAP_API_BASE_URL=https://pro-api.coinmarketcap.com
COINMARKETCAP_API_KEY=YOUR_TOKEN
BYMA_CEDEARS_URL=https://open.bymadata.com.ar
DOLAR_API_URL=https://dolarapi.com
```

Service location:

- `src/lib/finnhub-service.ts`

Main functions:

- `getQuote(symbol)`
- `getCurrentPrice(symbol)`
- `hydrateAssetsWithFinnhubQuotes(assets)`

Current usage in the app:

- `GET /api/assets` enriches stored assets with live prices:
	- Finnhub for `stock` and `etf`.
	- CoinMarketCap for mapped `crypto` symbols.
	- BYMA for `cedear` symbols (`price_ars` in ARS; invalid quotes never overwrite the stored price).
- Quotes are refreshed only when stale according to `FINNHUB_QUOTES_REFRESH_MINUTES` (default: 15), avoiding calls on every page visit.
- If providers are not configured or fail for a symbol, the persisted local asset price is used as fallback.

## DolarAPI (Tipo de cambio)

Cotización del dólar oficial para `/configuracion/tipo-cambio`.

```bash
DOLAR_API_URL=https://dolarapi.com
```

Flujo:

```text
DolarAPI
    ↓
GET /v1/dolares/oficial
    ↓
DolarQuoteService (compara con última cotización)
    ↓
MongoDB / dollar_quotes
    ↓
Frontend
```

- `src/lib/dolarapi-service.ts` (cliente HTTP, mapea `compra` → `buy`, `venta` → `sell`, `fechaActualizacion` → `datetime`)
- `src/lib/dollar-quote-db.ts` (collection `dollar_quotes`)
- `src/lib/dollar-quote-service.ts` (regla central: solo inserta si `buy` o `sell` cambió; consulta automática diaria lazy en la page)
- `src/app/api/dollar-quotes/route.ts` (`GET` actual + histórico paginado, `POST` refresh/manual, `DELETE` histórico)
- La visualización normal lee MongoDB; DolarAPI solo se llama en la consulta diaria automática o con "Actualizar ahora".

## CoinMarketCap Crypto Mapping

CoinMarketCap authentication is sent via header:

- `X-CMC_PRO_API_KEY: COINMARKETCAP_API_KEY`

For crypto assets, quote mapping now prioritizes `id_partner` on each asset.
If `id_partner` is empty, it falls back to symbol mapping.

Mapped symbol defaults used by `src/lib/coinmarketcap-service.ts`:

- `BTC` -> `1`
- `USDT` -> `825`
- `BNB` -> `1839`
- `ETH` -> `1027`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

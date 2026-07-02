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

Required environment variables in `.env.local`:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGODB_DATABASE=portfolio_web_app
```

## Finnhub Integration

This project can fetch live asset prices from Finnhub using the `/quote` endpoint.

Required environment variables in `.env.local`:

```bash
FINNHUB_API_BASE_URL=https://finnhub.io/api/v1
FINNHUB_API_TOKEN=YOUR_TOKEN
FINNHUB_QUOTES_REFRESH_MINUTES=15
COINMARKETCAP_API_BASE_URL=https://pro-api.coinmarketcap.com
COINMARKETCAP_API_KEY=YOUR_TOKEN
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
- Quotes are refreshed only when stale according to `FINNHUB_QUOTES_REFRESH_MINUTES` (default: 15), avoiding calls on every page visit.
- If providers are not configured or fail for a symbol, the persisted local asset price is used as fallback.

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

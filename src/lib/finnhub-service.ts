import type { Asset } from "@/lib/portfolio";
import {
  getCoinMarketCapPricesForAssets,
  isCoinMarketCapConfigured,
  isCoinMarketCapEligibleAsset,
} from "@/lib/coinmarketcap-service";

const FINNHUB_API_BASE_URL = process.env.FINNHUB_API_BASE_URL ?? "https://finnhub.io/api/v1";
const FINNHUB_API_TOKEN = process.env.FINNHUB_API_TOKEN;
const FINNHUB_QUOTES_REFRESH_MINUTES = Number(process.env.FINNHUB_QUOTES_REFRESH_MINUTES ?? 15);

interface FinnhubQuoteResponse {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
  error?: string;
}

function hasFinnhubCredentials() {
  return Boolean(FINNHUB_API_TOKEN);
}

function getQuoteRefreshMs() {
  if (!Number.isFinite(FINNHUB_QUOTES_REFRESH_MINUTES) || FINNHUB_QUOTES_REFRESH_MINUTES <= 0) {
    return 15 * 60 * 1000;
  }

  return Math.round(FINNHUB_QUOTES_REFRESH_MINUTES * 60 * 1000);
}

function isFinnhubEligibleAsset(asset: Asset) {
  return (asset.type === "stock" || asset.type === "etf") && Boolean(asset.symbol?.trim());
}

function hasFreshQuote(asset: Asset, nowMs: number, refreshMs: number) {
  if (!asset.quoteUpdatedAt || asset.price <= 0) {
    return false;
  }

  const updatedAtMs = Date.parse(asset.quoteUpdatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return false;
  }

  return nowMs - updatedAtMs <= refreshMs;
}

async function finnhubGet<T>(path: string, params: Record<string, string>) {
  if (!FINNHUB_API_TOKEN) {
    throw new Error("Faltan las credenciales de Finnhub. Configurá FINNHUB_API_TOKEN.");
  }

  const query = new URLSearchParams({ ...params, token: FINNHUB_API_TOKEN });
  const url = `${FINNHUB_API_BASE_URL}${path}?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Finnhub respondió con estado ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getQuote(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error("El símbolo es obligatorio para pedir cotización.");
  }

  const quote = await finnhubGet<FinnhubQuoteResponse>("/quote", {
    symbol: normalizedSymbol,
  });

  if (quote.error) {
    throw new Error(quote.error);
  }

  return quote;
}

export async function getCurrentPrice(symbol: string) {
  const quote = await getQuote(symbol);
  return Number(quote.c ?? 0);
}

interface QuoteRefreshResult {
  hydratedAssets: Asset[];
  persistedAssets: Asset[];
  hasPersistenceChanges: boolean;
}

interface QuoteRefreshOptions {
  forceRefresh?: boolean;
}

export async function refreshAssetsQuotesWithCache(
  assets: Asset[],
  options?: QuoteRefreshOptions
): Promise<QuoteRefreshResult> {
  if (assets.length === 0) {
    return {
      hydratedAssets: [],
      persistedAssets: [],
      hasPersistenceChanges: false,
    };
  }

  const nowMs = Date.now();
  const refreshMs = getQuoteRefreshMs();
  const forceRefresh = options?.forceRefresh ?? false;
  const quoteBySymbol = new Map<string, { price: number; updatedAt: string }>();
  const cryptoQuoteByAssetId = new Map<string, { price: number; updatedAt: string }>();
  const loadFinnhubQuotes = async () => {
    if (!hasFinnhubCredentials()) {
      return;
    }

    const symbolsToRefresh = Array.from(
      new Set(
        assets
          .filter(
            (asset) => isFinnhubEligibleAsset(asset) && (forceRefresh || !hasFreshQuote(asset, nowMs, refreshMs))
          )
          .map((asset) => asset.symbol.trim().toUpperCase())
      )
    );

    await Promise.allSettled(
      symbolsToRefresh.map(async (symbol) => {
        const quote = await getQuote(symbol);
        const price = Number(quote.c ?? 0);
        if (price > 0) {
          const updatedAt = quote.t ? new Date(quote.t * 1000).toISOString() : new Date().toISOString();
          quoteBySymbol.set(symbol, { price, updatedAt });
        }
      })
    );
  };

  const loadCoinMarketCapQuotes = async () => {
    if (!isCoinMarketCapConfigured()) {
      return;
    }

    const assetsToRefresh = assets.filter(
      (asset) => isCoinMarketCapEligibleAsset(asset) && (forceRefresh || !hasFreshQuote(asset, nowMs, refreshMs))
    );

    const quotesByAssetId = await getCoinMarketCapPricesForAssets(assetsToRefresh);
    for (const [assetId, quote] of quotesByAssetId) {
      cryptoQuoteByAssetId.set(assetId, quote);
    }
  };

  await Promise.allSettled([loadFinnhubQuotes(), loadCoinMarketCapQuotes()]);

  const hydratedAssets = assets.map((asset) => {
    const isCryptoByCmc = isCoinMarketCapEligibleAsset(asset);
    const isLiveEligible = isFinnhubEligibleAsset(asset) || isCryptoByCmc;

    if (!isLiveEligible) {
      return {
        ...asset,
        priceSource: "local" as const,
        quoteUpdatedAt: undefined,
      };
    }

    const refreshedQuote = isCryptoByCmc
      ? cryptoQuoteByAssetId.get(asset.id)
      : quoteBySymbol.get(asset.symbol.trim().toUpperCase());

    if (refreshedQuote) {
      return {
        ...asset,
        price: refreshedQuote.price,
        priceSource: "live" as const,
        quoteUpdatedAt: refreshedQuote.updatedAt,
      };
    }

    if (hasFreshQuote(asset, nowMs, refreshMs)) {
      return {
        ...asset,
        priceSource: "live" as const,
      };
    }

    return {
      ...asset,
      priceSource: "local" as const,
      quoteUpdatedAt: undefined,
    };
  });

  const persistedAssets = assets.map((asset, index) => {
    const hydratedAsset = hydratedAssets[index];

    return {
      ...asset,
      price: hydratedAsset.price,
      quoteUpdatedAt: hydratedAsset.quoteUpdatedAt,
    };
  });

  const hasPersistenceChanges = persistedAssets.some(
    (asset, index) => asset.price !== assets[index]?.price || asset.quoteUpdatedAt !== assets[index]?.quoteUpdatedAt
  );

  return {
    hydratedAssets,
    persistedAssets,
    hasPersistenceChanges,
  };
}

export async function hydrateAssetsWithFinnhubQuotes(assets: Asset[]) {
  const result = await refreshAssetsQuotesWithCache(assets);
  return result.hydratedAssets;
}

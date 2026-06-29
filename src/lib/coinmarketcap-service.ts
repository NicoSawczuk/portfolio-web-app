import type { Asset } from "@/lib/portfolio";

const COINMARKETCAP_API_BASE_URL = process.env.COINMARKETCAP_API_BASE_URL ?? "https://pro-api.coinmarketcap.com";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY ?? process.env.COINMARKETCAP_API_TOKEN;

interface CoinMarketCapSimplePriceItem {
  id: number;
  price: number;
}

interface CoinMarketCapSimplePriceResponse {
  data?: CoinMarketCapSimplePriceItem[];
  status?: {
    timestamp?: string;
    error_code?: string | number;
    error_message?: string;
  };
}

const COINMARKETCAP_SYMBOL_TO_ID: Record<string, number> = {
  BTC: 1,
  USDT: 825,
  BNB: 1839,
  ETH: 1027,
};

const COINMARKETCAP_ID_TO_SYMBOL = new Map(
  Object.entries(COINMARKETCAP_SYMBOL_TO_ID).map(([symbol, id]) => [id, symbol])
);

function normalizeCryptoSymbol(symbol: string) {
  return symbol.trim().toUpperCase().split(/[\-_\/]/)[0] ?? "";
}

function getCoinMarketCapIdForSymbol(symbol: string) {
  const normalized = normalizeCryptoSymbol(symbol);
  return COINMARKETCAP_SYMBOL_TO_ID[normalized];
}

function getCoinMarketCapIdForAsset(asset: Asset) {
  const partnerId = Number(asset.id_partner);
  if (Number.isFinite(partnerId) && partnerId > 0) {
    return partnerId;
  }

  return getCoinMarketCapIdForSymbol(asset.symbol);
}

export function isCoinMarketCapConfigured() {
  return Boolean(COINMARKETCAP_API_KEY);
}

export function isCoinMarketCapEligibleAsset(asset: Asset) {
  if (asset.type !== "crypto" || !asset.symbol?.trim()) {
    return false;
  }

  return Boolean(getCoinMarketCapIdForAsset(asset));
}

async function coinMarketCapGet<T>(path: string, params: Record<string, string>) {
  if (!COINMARKETCAP_API_KEY) {
    throw new Error("Faltan credenciales de CoinMarketCap. Configurá COINMARKETCAP_API_KEY.");
  }

  const query = new URLSearchParams(params);
  const url = `${COINMARKETCAP_API_BASE_URL}${path}?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-CMC_PRO_API_KEY": COINMARKETCAP_API_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CoinMarketCap respondió con estado ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function getSimplePricesByIds(ids: number[]) {
  if (!ids.length) {
    return new Map<number, { price: number; updatedAt: string }>();
  }

  const uniqueIds = Array.from(new Set(ids));
  const response = await coinMarketCapGet<CoinMarketCapSimplePriceResponse>("/v1/simple/price", {
    ids: uniqueIds.join(","),
  });

  const updatedAt = response.status?.timestamp || new Date().toISOString();
  const result = new Map<number, { price: number; updatedAt: string }>();

  for (const item of response.data ?? []) {
    const price = Number(item.price ?? 0);
    if (item.id && price > 0) {
      result.set(Number(item.id), { price, updatedAt });
    }
  }

  return result;
}

export async function getCoinMarketCapPricesForSymbols(symbols: string[]) {
  const ids = symbols
    .map((symbol) => getCoinMarketCapIdForSymbol(symbol))
    .filter((id): id is number => typeof id === "number");

  const pricesById = await getSimplePricesByIds(ids);
  const pricesBySymbol = new Map<string, { price: number; updatedAt: string }>();

  for (const [id, quote] of pricesById) {
    const symbol = COINMARKETCAP_ID_TO_SYMBOL.get(id);
    if (symbol) {
      pricesBySymbol.set(symbol, quote);
    }
  }

  return pricesBySymbol;
}

export async function getCoinMarketCapPricesForAssets(assets: Asset[]) {
  const eligibleAssets = assets.filter(isCoinMarketCapEligibleAsset);
  const ids = eligibleAssets
    .map((asset) => getCoinMarketCapIdForAsset(asset))
    .filter((id): id is number => typeof id === "number");

  const pricesById = await getSimplePricesByIds(ids);
  const pricesByAssetId = new Map<string, { price: number; updatedAt: string }>();

  for (const asset of eligibleAssets) {
    const cmcId = getCoinMarketCapIdForAsset(asset);
    if (!cmcId) {
      continue;
    }

    const quote = pricesById.get(cmcId);
    if (quote) {
      pricesByAssetId.set(asset.id, quote);
    }
  }

  return pricesByAssetId;
}

export function normalizeCoinMarketCapSymbol(symbol: string) {
  return normalizeCryptoSymbol(symbol);
}

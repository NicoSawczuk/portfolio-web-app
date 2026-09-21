import type { Asset } from "@/lib/portfolio";
import { getAssetCurrency } from "@/lib/portfolio";

const DATA912_BASE_URL = process.env.DATA912_API_URL ?? "https://data912.com";

const DATA912_ARG_STOCKS_PATH = "/live/arg_stocks";

function getData912ArgStocksUrl() {
  return `${DATA912_BASE_URL.replace(/\/+$/, "")}${DATA912_ARG_STOCKS_PATH}`;
}

interface Data912ArgStockItem {
  symbol?: string;
  px_bid?: number;
}

interface Data912Quote {
  price: number;
  updatedAt: string;
}

function normalizeData912Symbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function isData912Configured() {
  return Boolean(DATA912_BASE_URL);
}

export function isData912EligibleAsset(asset: Asset) {
  // Data912 cotiza acciones argentinas en ARS. Un activo de tipo `stock`
  // cotizado en ARS debe tomar precio de acá y nunca de Finnhub (USD).
  return (
    asset.type === "stock" &&
    getAssetCurrency(asset) === "ARS" &&
    Boolean(asset.symbol?.trim())
  );
}

export function isValidData912Price(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0;
}

const DATA912_DUMP_TTL_MS = (() => {
  const minutes = Number(process.env.DATA912_TTL_MINUTES ?? 15);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 15 * 60_000;
})();

let data912DumpCache: { items: Data912ArgStockItem[]; fetchedAt: number } | null = null;
let data912DumpInflight: Promise<Data912ArgStockItem[]> | null = null;

async function fetchAllData912ArgStocks(): Promise<Data912ArgStockItem[]> {
  if (!DATA912_BASE_URL) {
    throw new Error("Faltan credenciales de Data912. Configurá DATA912_API_URL.");
  }

  const now = Date.now();
  if (data912DumpCache && now - data912DumpCache.fetchedAt < DATA912_DUMP_TTL_MS) {
    return data912DumpCache.items;
  }

  if (data912DumpInflight) {
    return data912DumpInflight;
  }

  data912DumpInflight = (async () => {
    const response = await fetch(getData912ArgStocksUrl(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Data912 respondió con estado ${response.status}.`);
    }

    const payload = (await response.json()) as Data912ArgStockItem[] | { data?: Data912ArgStockItem[] };

    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    data912DumpCache = { items, fetchedAt: Date.now() };
    return items;
  })();

  try {
    return await data912DumpInflight;
  } finally {
    data912DumpInflight = null;
  }
}

export async function getData912ArgStockPricesForSymbols(symbols: string[]) {
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizeData912Symbol).filter(Boolean))
  );

  if (normalizedSymbols.length === 0) {
    return new Map<string, Data912Quote>();
  }

  const wanted = new Set(normalizedSymbols);
  const items = await fetchAllData912ArgStocks();
  const updatedAt = new Date().toISOString();
  const result = new Map<string, Data912Quote>();

  for (const item of items) {
    const symbol = normalizeData912Symbol(String(item?.symbol ?? ""));

    // Fuera de horario de mercado Data912 puede devolver px_bid en 0 o ausente:
    // esos casos se descartan para no pisar el último precio válido.
    if (!symbol || !wanted.has(symbol) || !isValidData912Price(item?.px_bid)) {
      continue;
    }

    const price = Number(item?.px_bid);

    if (!result.has(symbol)) {
      result.set(symbol, { price, updatedAt });
    }
  }

  return result;
}

export async function getData912ArgStockPrice(symbol: string) {
  const normalized = normalizeData912Symbol(symbol);

  if (!normalized) {
    throw new Error("El símbolo es obligatorio para pedir cotización de acción ARS.");
  }

  const prices = await getData912ArgStockPricesForSymbols([normalized]);
  return prices.get(normalized) ?? null;
}

export async function getData912ArgStockPricesForAssets(assets: Asset[]) {
  const eligibleAssets = assets.filter(isData912EligibleAsset);
  const symbols = eligibleAssets.map((asset) => normalizeData912Symbol(asset.symbol));

  const pricesBySymbol = await getData912ArgStockPricesForSymbols(symbols);
  const pricesByAssetId = new Map<string, Data912Quote>();

  for (const asset of eligibleAssets) {
    const quote = pricesBySymbol.get(normalizeData912Symbol(asset.symbol));
    if (quote) {
      pricesByAssetId.set(asset.id, quote);
    }
  }

  return pricesByAssetId;
}
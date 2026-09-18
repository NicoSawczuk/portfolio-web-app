import type { Asset } from "@/lib/portfolio";

const BYMA_BASE_URL =
  process.env.BYMA_CEDEARS_URL ?? "https://open.bymadata.com.ar";

const BYMA_CEDEARS_PATH = "/vanoms-be-core/rest/api/bymadata/free/cedears";

function getBymaCedearsUrl() {
  return `${BYMA_BASE_URL.replace(/\/+$/, "")}${BYMA_CEDEARS_PATH}`;
}

interface BymaCedearItem {
  symbol?: string;
  bidPrice?: number;
  tradeHour?: string;
}

interface BymaQuote {
  price: number;
  updatedAt: string;
}

function normalizeBymaSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

export function isBymaConfigured() {
  return Boolean(BYMA_BASE_URL);
}

export function isBymaEligibleAsset(asset: Asset) {
  return asset.type === "cedear" && Boolean(asset.symbol?.trim());
}

export function isValidBymaPrice(value: unknown) {
  const price = Number(value);
  return Number.isFinite(price) && price > 0;
}

export function normalizeBymaCedearSymbol(symbol: string) {
  return normalizeBymaSymbol(symbol);
}

const BYMA_DUMP_TTL_MS = (() => {
  const minutes = Number(process.env.BYMA_CEDEARS_TTL_MINUTES ?? 15);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 15 * 60_000;
})();

let bymaDumpCache: { items: BymaCedearItem[]; fetchedAt: number } | null = null;
let bymaDumpInflight: Promise<BymaCedearItem[]> | null = null;

async function fetchAllBymaCedears(): Promise<BymaCedearItem[]> {
  if (!BYMA_BASE_URL) {
    throw new Error("Faltan credenciales de BYMA. Configurá BYMA_CEDEARS_URL.");
  }

  const now = Date.now();
  if (bymaDumpCache && now - bymaDumpCache.fetchedAt < BYMA_DUMP_TTL_MS) {
    return bymaDumpCache.items;
  }

  if (bymaDumpInflight) {
    return bymaDumpInflight;
  }

  bymaDumpInflight = (async () => {
    const response = await fetch(getBymaCedearsUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        excludeZeroPxAndQty: true,
        T1: true,
        T0: false,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`BYMA respondió con estado ${response.status}.`);
    }

    const payload = (await response.json()) as BymaCedearItem[] | { data?: BymaCedearItem[] };

    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    bymaDumpCache = { items, fetchedAt: Date.now() };
    return items;
  })();

  try {
    return await bymaDumpInflight;
  } finally {
    bymaDumpInflight = null;
  }
}

export async function getBymaCedearPricesForSymbols(symbols: string[]) {
  const normalizedSymbols = Array.from(
    new Set(symbols.map(normalizeBymaSymbol).filter(Boolean))
  );

  if (normalizedSymbols.length === 0) {
    return new Map<string, BymaQuote>();
  }

  const wanted = new Set(normalizedSymbols);
  const items = await fetchAllBymaCedears();
  const updatedAt = new Date().toISOString();
  const result = new Map<string, BymaQuote>();

  for (const item of items) {
    const symbol = normalizeBymaSymbol(String(item?.symbol ?? ""));

    // Fuera de horario de mercado BYMA puede devolver bidPrice en 0 o ausente:
    // esos casos se descartan para no pisar el último precio válido.
    if (!symbol || !wanted.has(symbol) || !isValidBymaPrice(item?.bidPrice)) {
      continue;
    }

    const price = Number(item?.bidPrice);

    if (!result.has(symbol)) {
      result.set(symbol, { price, updatedAt });
    }
  }

  return result;
}

export async function getBymaCedearPrice(symbol: string) {
  const normalized = normalizeBymaSymbol(symbol);

  if (!normalized) {
    throw new Error("El símbolo es obligatorio para pedir cotización de CEDEAR.");
  }

  const prices = await getBymaCedearPricesForSymbols([normalized]);
  return prices.get(normalized) ?? null;
}

export async function getBymaCedearPricesForAssets(assets: Asset[]) {
  const eligibleAssets = assets.filter(isBymaEligibleAsset);
  const symbols = eligibleAssets.map((asset) => normalizeBymaSymbol(asset.symbol));

  const pricesBySymbol = await getBymaCedearPricesForSymbols(symbols);
  const pricesByAssetId = new Map<string, BymaQuote>();

  for (const asset of eligibleAssets) {
    const quote = pricesBySymbol.get(normalizeBymaSymbol(asset.symbol));
    if (quote) {
      pricesByAssetId.set(asset.id, quote);
    }
  }

  return pricesByAssetId;
}

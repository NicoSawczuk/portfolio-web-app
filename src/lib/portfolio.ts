export type AssetType = "stock" | "etf" | "crypto" | "bond" | "cash" | "other" | "cedear";
export type TransactionType = "buy" | "sell" | "cash_in" | "cash_out";
export type AssetCurrency = "USD" | "ARS";

export interface Transaction {
  id: string;
  type: TransactionType;
  assetId?: string;
  assetSymbol?: string;
  assetName?: string;
  assetType?: AssetType;
  quantity?: number;
  price: number;
  date: string;
  notes?: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  // Moneda en la que cotiza el activo. Si no está presente se mantiene la
  // regla legacy: `cedear` → ARS, el resto → USD.
  currency?: AssetCurrency;
  id_partner?: number;
  // Precio actual/local en la moneda del activo (`currency`, default USD).
  // Todos los activos (incluidos los ARS) guardan su precio aquí.
  price: number;
  // Campo legacy: antes solo los CEDEARs guardaban su precio en ARS acá.
  // Se conserva por compatibilidad con documentos viejos sin `currency`.
  price_ars?: number;
  priceSource?: "live" | "local";
  quoteCheckedAt?: string;
  quoteUpdatedAt?: string;
}

export function isCedearAsset(asset: Pick<Asset, "type"> | Asset["type"]) {
  const type = typeof asset === "string" ? asset : asset.type;
  return type === "cedear";
}

export function normalizeAssetCurrency(value: unknown, type: Asset["type"] | undefined): AssetCurrency {
  if (value === "ARS" || value === "USD") {
    return value;
  }

  return type === "cedear" ? "ARS" : "USD";
}

export function getAssetCurrency(
  asset: ({ type: Asset["type"] } & Partial<Pick<Asset, "currency">>) | Asset["type"]
): AssetCurrency {
  if (typeof asset === "object" && asset.currency) {
    return asset.currency;
  }

  return isCedearAsset(asset) ? "ARS" : "USD";
}

export function getAssetCurrentPrice(
  asset: Pick<Asset, "type" | "currency" | "price"> & Partial<Pick<Asset, "price_ars">>
) {
  if (getAssetCurrency(asset) === "ARS") {
    const price = Number(asset.price ?? 0);

    // Nuevo modelo: los activos ARS guardan su precio en `price`.
    if (price > 0) {
      return price;
    }

    // Legacy: CEDEARs viejos guardan el precio en ARS en `price_ars`.
    return Number(asset.price_ars ?? 0);
  }

  return Number(asset.price ?? 0);
}

export interface Portfolio {
  id: string;
  ownerUserId?: string;
  name: string;
  description: string;
  currency: AssetCurrency;
  managesCash?: boolean;
  createdAt: string;
  assets: Asset[];
  transactions: Transaction[];
}

export function normalizePortfolioCurrency(value: unknown): AssetCurrency {
  return value === "ARS" ? "ARS" : "USD";
}

export function getPortfolioCurrency(
  portfolio?: Pick<Portfolio, "currency"> | { currency?: unknown } | null
): AssetCurrency {
  return normalizePortfolioCurrency((portfolio as { currency?: unknown } | null | undefined)?.currency);
}

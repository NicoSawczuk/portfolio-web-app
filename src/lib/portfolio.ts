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
  id_partner?: number;
  price: number;
  price_ars?: number;
  priceSource?: "live" | "local";
  quoteCheckedAt?: string;
  quoteUpdatedAt?: string;
}

export function isCedearAsset(asset: Pick<Asset, "type"> | Asset["type"]) {
  const type = typeof asset === "string" ? asset : asset.type;
  return type === "cedear";
}

export function getAssetCurrency(asset: Pick<Asset, "type"> | Asset["type"]): AssetCurrency {
  return isCedearAsset(asset) ? "ARS" : "USD";
}

export function getAssetCurrentPrice(asset: Pick<Asset, "type" | "price"> & Partial<Pick<Asset, "price_ars">>) {
  if (isCedearAsset(asset.type)) {
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

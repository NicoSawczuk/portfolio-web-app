export type AssetType = "stock" | "etf" | "crypto" | "bond" | "cash" | "other";
export type TransactionType = "buy" | "sell" | "cash_in" | "cash_out";

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
  price: number;
  transactions: Transaction[];
}

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  assets: Asset[];
  transactions: Transaction[];
}

import type { Asset, AssetType, Portfolio, Transaction } from "@/lib/portfolio";

export interface OpenPositionSummary {
  assetId: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  marketValue: number;
  pnl: number;
  pnlPct: number;
  sharePct: number;
  firstBuyDate: string | null;
  lastBuyDate: string | null;
}

export interface ClosedPositionSummary {
  assetId: string;
  symbol: string;
  name: string;
  type: AssetType;
  realizedPnl: number;
  realizedPnlPct: number;
  investedCapital: number;
  quantitySold: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  closedAt: string | null;
}

export interface PortfolioPositionsAnalytics {
  openPositions: OpenPositionSummary[];
  closedPositions: ClosedPositionSummary[];
  totalOpenMarketValue: number;
  allTransactions: Transaction[];
  transactionsByAssetId: Map<string, Transaction[]>;
}

interface PositionAccumulator {
  assetId: string;
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  totalCost: number;
  avgBuyPrice: number;
  totalBoughtQty: number;
  totalBoughtAmount: number;
  totalSoldQty: number;
  totalSoldAmount: number;
  realizedCost: number;
  realizedPnl: number;
  firstBuyDate: string | null;
  lastBuyDate: string | null;
  lastSellDate: string | null;
}

const POSITION_EPSILON = 1e-8;

function createAccumulator(assetId: string): PositionAccumulator {
  return {
    assetId,
    symbol: "",
    name: "",
    type: "other",
    quantity: 0,
    totalCost: 0,
    avgBuyPrice: 0,
    totalBoughtQty: 0,
    totalBoughtAmount: 0,
    totalSoldQty: 0,
    totalSoldAmount: 0,
    realizedCost: 0,
    realizedPnl: 0,
    firstBuyDate: null,
    lastBuyDate: null,
    lastSellDate: null,
  };
}

function toSortedTransactions(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date));
}

function patchAssetMetadata(acc: PositionAccumulator, transaction: Transaction, fallback: Asset | undefined) {
  acc.symbol = transaction.assetSymbol || acc.symbol || fallback?.symbol || "";
  acc.name = transaction.assetName || acc.name || fallback?.name || "Activo";
  acc.type = transaction.assetType || acc.type || fallback?.type || "other";
}

export function buildPortfolioPositionsAnalytics(
  portfolio: Portfolio,
  assets: Asset[]
): PortfolioPositionsAnalytics {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const sortedTransactions = toSortedTransactions(portfolio.transactions ?? []);
  const accByAssetId = new Map<string, PositionAccumulator>();

  for (const transaction of sortedTransactions) {
    if (!transaction.assetId || (transaction.type !== "buy" && transaction.type !== "sell")) {
      continue;
    }

    const quantity = Number(transaction.quantity ?? 0);
    const price = Number(transaction.price ?? 0);

    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    const acc = accByAssetId.get(transaction.assetId) ?? createAccumulator(transaction.assetId);
    patchAssetMetadata(acc, transaction, assetById.get(transaction.assetId));

    if (transaction.type === "buy") {
      const amount = quantity * price;
      acc.quantity += quantity;
      acc.totalCost += amount;
      acc.totalBoughtQty += quantity;
      acc.totalBoughtAmount += amount;
      acc.avgBuyPrice = acc.quantity > POSITION_EPSILON ? acc.totalCost / acc.quantity : 0;

      if (!acc.firstBuyDate || transaction.date < acc.firstBuyDate) {
        acc.firstBuyDate = transaction.date;
      }
      if (!acc.lastBuyDate || transaction.date > acc.lastBuyDate) {
        acc.lastBuyDate = transaction.date;
      }
    }

    if (transaction.type === "sell") {
      const sellQty = Math.min(acc.quantity, quantity);
      const costToRemove = sellQty * acc.avgBuyPrice;
      const proceeds = quantity * price;

      acc.quantity = Math.max(0, acc.quantity - quantity);
      acc.totalCost = Math.max(0, acc.totalCost - costToRemove);
      acc.totalSoldQty += quantity;
      acc.totalSoldAmount += proceeds;
      acc.realizedCost += costToRemove;
      acc.realizedPnl += proceeds - costToRemove;
      acc.avgBuyPrice = acc.quantity > POSITION_EPSILON ? acc.totalCost / acc.quantity : 0;

      if (!acc.lastSellDate || transaction.date > acc.lastSellDate) {
        acc.lastSellDate = transaction.date;
      }
    }

    accByAssetId.set(acc.assetId, acc);
  }

  const openPositions = Array.from(accByAssetId.values())
    .filter((item) => item.quantity > POSITION_EPSILON)
    .map<OpenPositionSummary>((item) => {
      const meta = assetById.get(item.assetId);
      const currentPrice = Number(meta?.price ?? 0);
      const marketValue = item.quantity * currentPrice;
      const investedValue = item.quantity * item.avgBuyPrice;
      const pnl = marketValue - investedValue;
      const pnlPct = investedValue > POSITION_EPSILON ? pnl / investedValue : 0;

      return {
        assetId: item.assetId,
        symbol: item.symbol || meta?.symbol || "",
        name: item.name || meta?.name || "Activo",
        type: item.type || meta?.type || "other",
        quantity: item.quantity,
        avgBuyPrice: item.avgBuyPrice,
        currentPrice,
        investedValue,
        marketValue,
        pnl,
        pnlPct,
        sharePct: 0,
        firstBuyDate: item.firstBuyDate,
        lastBuyDate: item.lastBuyDate,
      };
    })
    .sort((a, b) => {
      const byMarketValue = b.marketValue - a.marketValue;
      if (byMarketValue !== 0) {
        return byMarketValue;
      }

      return a.symbol.localeCompare(b.symbol, "es", { sensitivity: "base" });
    });

  const totalOpenMarketValue = openPositions.reduce((sum, item) => sum + item.marketValue, 0);

  const openPositionsWithShare = openPositions.map((item) => ({
    ...item,
    sharePct: totalOpenMarketValue > POSITION_EPSILON ? item.marketValue / totalOpenMarketValue : 0,
  }));

  const closedPositions = Array.from(accByAssetId.values())
    .filter((item) => item.quantity <= POSITION_EPSILON && item.totalBoughtQty > POSITION_EPSILON && item.totalSoldQty > POSITION_EPSILON)
    .map<ClosedPositionSummary>((item) => {
      const meta = assetById.get(item.assetId);
      const investedCapital = item.realizedCost;
      const realizedPnlPct = investedCapital > POSITION_EPSILON ? item.realizedPnl / investedCapital : 0;

      return {
        assetId: item.assetId,
        symbol: item.symbol || meta?.symbol || "",
        name: item.name || meta?.name || "Activo",
        type: item.type || meta?.type || "other",
        realizedPnl: item.realizedPnl,
        realizedPnlPct,
        investedCapital,
        quantitySold: item.totalSoldQty,
        avgBuyPrice: item.totalBoughtQty > POSITION_EPSILON ? item.totalBoughtAmount / item.totalBoughtQty : 0,
        avgSellPrice: item.totalSoldQty > POSITION_EPSILON ? item.totalSoldAmount / item.totalSoldQty : 0,
        closedAt: item.lastSellDate || item.lastBuyDate,
      };
    })
    .sort((a, b) => {
      const byDate = (b.closedAt || "").localeCompare(a.closedAt || "");
      if (byDate !== 0) {
        return byDate;
      }

      return a.symbol.localeCompare(b.symbol, "es", { sensitivity: "base" });
    });

  const allTransactions = [...(portfolio.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const transactionsByAssetId = new Map<string, Transaction[]>();

  for (const transaction of allTransactions) {
    if (!transaction.assetId) {
      continue;
    }

    const current = transactionsByAssetId.get(transaction.assetId) ?? [];
    current.push(transaction);
    transactionsByAssetId.set(transaction.assetId, current);
  }

  return {
    openPositions: openPositionsWithShare,
    closedPositions,
    totalOpenMarketValue,
    allTransactions,
    transactionsByAssetId,
  };
}

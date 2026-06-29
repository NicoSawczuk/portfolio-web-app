import type { Asset, Portfolio, Transaction } from "@/lib/portfolio";

export interface PortfolioHoldingSummary {
  assetId: string;
  symbol: string;
  name: string;
  type: Asset["type"];
  quantity: number;
  totalCost: number;
  avgBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPct: number;
}

export interface PortfolioPerformance {
  holdings: PortfolioHoldingSummary[];
  totalMarketValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  assetTypeBreakdown: Array<{ type: Asset["type"]; marketValue: number }>;
  chartPoints: Array<{ label: string; value: number }>;
}

export interface PortfolioSummarySnapshot {
  portfolioId: string;
  totalMarketValue: number;
  totalPnl: number;
  totalPnlPct: number;
}

function applyTransactionToHoldings(
  holdings: Map<string, PortfolioHoldingSummary>,
  transaction: Transaction
) {
  if (!transaction.assetId) {
    return;
  }

  const existing = holdings.get(transaction.assetId) ?? {
    assetId: transaction.assetId,
    symbol: transaction.assetSymbol ?? "",
    name: transaction.assetName ?? "",
    type: transaction.assetType ?? "other",
    quantity: 0,
    totalCost: 0,
    avgBuyPrice: 0,
    currentPrice: 0,
    marketValue: 0,
    costBasis: 0,
    pnl: 0,
    pnlPct: 0,
  };

  if (transaction.type === "buy") {
    const quantity = Number(transaction.quantity ?? 0);
    if (quantity > 0) {
      existing.quantity += quantity;
      existing.totalCost += quantity * Number(transaction.price ?? 0);
      existing.avgBuyPrice = existing.quantity ? existing.totalCost / existing.quantity : 0;
    }
  }

  if (transaction.type === "sell") {
    const quantity = Number(transaction.quantity ?? 0);
    if (quantity > 0) {
      const costToRemove = Math.min(existing.quantity, quantity) * existing.avgBuyPrice;
      existing.quantity = Math.max(0, existing.quantity - quantity);
      existing.totalCost = Math.max(0, existing.totalCost - costToRemove);
      existing.avgBuyPrice = existing.quantity ? existing.totalCost / existing.quantity : 0;
    }
  }

  if (transaction.assetSymbol) existing.symbol = transaction.assetSymbol;
  if (transaction.assetName) existing.name = transaction.assetName;
  if (transaction.assetType) existing.type = transaction.assetType;

  holdings.set(transaction.assetId, existing);
}

export function calculatePortfolioPerformance(
  portfolio: Portfolio | null | undefined,
  assets: Asset[]
): PortfolioPerformance | null {
  if (!portfolio) {
    return null;
  }

  const holdings = new Map<string, PortfolioHoldingSummary>();
  const sortedTransactions = [...(portfolio.transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  sortedTransactions.forEach((transaction) => applyTransactionToHoldings(holdings, transaction));

  const holdingsList = Array.from(holdings.values())
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const assetMeta = assets.find((asset) => asset.id === item.assetId);
      const currentPrice = assetMeta?.price ?? 0;
      const marketValue = item.quantity * currentPrice;
      const costBasis = item.quantity * item.avgBuyPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? pnl / costBasis : 0;

      return {
        ...item,
        currentPrice,
        marketValue,
        costBasis,
        pnl,
        pnlPct,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  const totalMarketValue = holdingsList.reduce((sum, item) => sum + item.marketValue, 0);
  const totalCostBasis = holdingsList.reduce((sum, item) => sum + item.costBasis, 0);
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

  const assetTypeBreakdown = holdingsList.reduce<Record<string, { type: Asset["type"]; marketValue: number }>>((acc, item) => {
    const bucket = acc[item.type] ?? { type: item.type, marketValue: 0 };
    bucket.marketValue += item.marketValue;
    acc[item.type] = bucket;
    return acc;
  }, {});

  const chartPoints = [{ label: "Inicio", value: 0 }];
  const transactionsByDate = sortedTransactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    if (!transaction.date) {
      return acc;
    }

    const bucket = acc[transaction.date] ?? [];
    bucket.push(transaction);
    acc[transaction.date] = bucket;
    return acc;
  }, {});

  const dates = Object.keys(transactionsByDate).sort();
  const chartHoldings = new Map<string, { assetId: string; quantity: number; totalCost: number; avgBuyPrice: number }>();

  const applyChartTransaction = (transaction: Transaction) => {
    if (!transaction.assetId) {
      return;
    }

    const existing = chartHoldings.get(transaction.assetId) ?? {
      assetId: transaction.assetId,
      quantity: 0,
      totalCost: 0,
      avgBuyPrice: 0,
    };

    if (transaction.type === "buy") {
      const quantity = Number(transaction.quantity ?? 0);
      if (quantity > 0) {
        existing.quantity += quantity;
        existing.totalCost += quantity * Number(transaction.price ?? 0);
        existing.avgBuyPrice = existing.quantity ? existing.totalCost / existing.quantity : 0;
      }
    }

    if (transaction.type === "sell") {
      const quantity = Number(transaction.quantity ?? 0);
      if (quantity > 0) {
        const costToRemove = Math.min(existing.quantity, quantity) * existing.avgBuyPrice;
        existing.quantity = Math.max(0, existing.quantity - quantity);
        existing.totalCost = Math.max(0, existing.totalCost - costToRemove);
        existing.avgBuyPrice = existing.quantity ? existing.totalCost / existing.quantity : 0;
      }
    }

    chartHoldings.set(transaction.assetId, existing);
  };

  dates.forEach((date) => {
    transactionsByDate[date]?.forEach(applyChartTransaction);
    const value = Array.from(chartHoldings.values()).reduce((sum, item) => {
      const assetMeta = assets.find((asset) => asset.id === item.assetId);
      return sum + item.quantity * (assetMeta?.price ?? 0);
    }, 0);
    chartPoints.push({ label: date, value });
  });

  chartPoints.push({ label: "Hoy", value: totalMarketValue });

  return {
    holdings: holdingsList,
    totalMarketValue,
    totalCostBasis,
    totalPnl,
    totalPnlPct,
    assetTypeBreakdown: Object.values(assetTypeBreakdown).sort((a, b) => b.marketValue - a.marketValue),
    chartPoints,
  };
}

export function getPortfolioSummary(
  portfolio: Portfolio | null | undefined,
  assets: Asset[]
): PortfolioSummarySnapshot | null {
  const performance = calculatePortfolioPerformance(portfolio, assets);

  if (!performance) {
    return null;
  }

  return {
    portfolioId: portfolio?.id ?? "",
    totalMarketValue: performance.totalMarketValue,
    totalPnl: performance.totalPnl,
    totalPnlPct: performance.totalPnlPct,
  };
}

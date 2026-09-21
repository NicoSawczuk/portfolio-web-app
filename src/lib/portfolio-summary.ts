import type { Asset, AssetCurrency, Portfolio, Transaction } from "@/lib/portfolio";
import { getAssetCurrency, getAssetCurrentPrice, getPortfolioCurrency } from "@/lib/portfolio";

export interface PortfolioHoldingSummary {
  assetId: string;
  symbol: string;
  name: string;
  type: Asset["type"];
  currency: AssetCurrency;
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
  currency: AssetCurrency;
  totalMarketValue: number;
  marketValueByCurrency: Record<AssetCurrency, number>;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  assetTypeBreakdown: Array<{ type: Asset["type"]; marketValue: number }>;
  chartPoints: Array<{ label: string; value: number }>;
}

export interface PortfolioSummarySnapshot {
  portfolioId: string;
  currency: AssetCurrency;
  totalMarketValue: number;
  marketValueByCurrency: Record<AssetCurrency, number>;
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
    currency: getAssetCurrency(transaction.assetType ?? "other"),
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
  if (transaction.assetType) {
    existing.type = transaction.assetType;
    existing.currency = getAssetCurrency(transaction.assetType);
  }

  holdings.set(transaction.assetId, existing);
}

interface CashMovement {
  balanceDelta: number;
  contributionDelta: number;
}

function getCashMovement(transaction: Transaction): CashMovement {
  const amount = Number(transaction.price ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { balanceDelta: 0, contributionDelta: 0 };
  }

  if (transaction.type === "cash_in") {
    return { balanceDelta: amount, contributionDelta: amount };
  }

  if (transaction.type === "cash_out") {
    return { balanceDelta: -amount, contributionDelta: -amount };
  }

  if (transaction.type === "buy" || transaction.type === "sell") {
    const quantity = Number(transaction.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { balanceDelta: 0, contributionDelta: 0 };
    }

    const tradeAmount = quantity * amount;
    return { balanceDelta: transaction.type === "buy" ? -tradeAmount : tradeAmount, contributionDelta: 0 };
  }

  return { balanceDelta: 0, contributionDelta: 0 };
}

export interface CashTotals {
  balance: number;
  netContributions: number;
}

export function calculateCashTotals(portfolio: Portfolio | null | undefined): CashTotals {
  let balance = 0;
  let netContributions = 0;

  if (!portfolio || !portfolio.managesCash) {
    return { balance, netContributions };
  }

  for (const transaction of portfolio.transactions ?? []) {
    const movement = getCashMovement(transaction);
    balance += movement.balanceDelta;
    netContributions += movement.contributionDelta;
  }

  return { balance, netContributions };
}

export interface PortfolioPerformanceOptions {
  includeChartPoints?: boolean;
}

export function calculatePortfolioPerformance(
  portfolio: Portfolio | null | undefined,
  assets: Asset[],
  options: PortfolioPerformanceOptions = {}
): PortfolioPerformance | null {
  if (!portfolio) {
    return null;
  }

  const holdings = new Map<string, PortfolioHoldingSummary>();
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const sortedTransactions = [...(portfolio.transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const managesCash = Boolean(portfolio.managesCash);
  const { balance: cashBalance, netContributions: cashNetContributions } = calculateCashTotals(portfolio);

  sortedTransactions.forEach((transaction) => {
    applyTransactionToHoldings(holdings, transaction);
  });

  const holdingsList = Array.from(holdings.values())
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const assetMeta = assetById.get(item.assetId);
      const currentPrice = assetMeta ? getAssetCurrentPrice(assetMeta) : 0;
      const currency = assetMeta ? getAssetCurrency(assetMeta) : getAssetCurrency(item.type);
      const marketValue = item.quantity * currentPrice;
      const costBasis = item.quantity * item.avgBuyPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? pnl / costBasis : 0;

      return {
        ...item,
        currency,
        currentPrice,
        marketValue,
        costBasis,
        pnl,
        pnlPct,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  if (managesCash) {
    const normalizedCashBalance = Math.abs(cashBalance) < 1e-8 ? 0 : cashBalance;
    const cashCurrency = getPortfolioCurrency(portfolio);
    holdingsList.unshift({
      assetId: `cash:${portfolio.id}`,
      symbol: cashCurrency,
      name: "Efectivo",
      type: "cash",
      currency: cashCurrency,
      quantity: normalizedCashBalance,
      totalCost: normalizedCashBalance,
      avgBuyPrice: 1,
      currentPrice: 1,
      marketValue: normalizedCashBalance,
      costBasis: normalizedCashBalance,
      pnl: 0,
      pnlPct: 0,
    });
  }

  const totalMarketValue = holdingsList.reduce((sum, item) => sum + item.marketValue, 0);
  const marketValueByCurrency: Record<AssetCurrency, number> = { USD: 0, ARS: 0 };
  for (const item of holdingsList) {
    marketValueByCurrency[item.currency] += item.marketValue;
  }
  const totalCostBasis = managesCash
    ? cashNetContributions
    : holdingsList.reduce((sum, item) => sum + item.costBasis, 0);
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

  const assetTypeBreakdown = holdingsList.reduce<Record<string, { type: Asset["type"]; marketValue: number }>>((acc, item) => {
    const bucket = acc[item.type] ?? { type: item.type, marketValue: 0 };
    bucket.marketValue += item.marketValue;
    acc[item.type] = bucket;
    return acc;
  }, {});

  const { includeChartPoints = true } = options;
  let chartPoints: Array<{ label: string; value: number }>;
  if (!includeChartPoints) {
    chartPoints = [
      { label: "Inicio", value: 0 },
      { label: "Hoy", value: totalMarketValue },
    ];
  } else {
    chartPoints = [{ label: "Inicio", value: 0 }];
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
    let chartCashBalance = 0;

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
      transactionsByDate[date]?.forEach((transaction) => {
        applyChartTransaction(transaction);
        if (managesCash) {
          const movement = getCashMovement(transaction);
          chartCashBalance += movement.balanceDelta;
        }
      });
      const value = Array.from(chartHoldings.values()).reduce((sum, item) => {
        const assetMeta = assetById.get(item.assetId);
        return sum + item.quantity * (assetMeta ? getAssetCurrentPrice(assetMeta) : 0);
      }, managesCash ? chartCashBalance : 0);
      chartPoints.push({ label: date, value });
    });

    chartPoints.push({ label: "Hoy", value: totalMarketValue });
  }

  return {
    holdings: holdingsList,
    currency: getPortfolioCurrency(portfolio),
    totalMarketValue,
    marketValueByCurrency,
    totalCostBasis,
    totalPnl,
    totalPnlPct,
    assetTypeBreakdown: Object.values(assetTypeBreakdown).sort((a, b) => b.marketValue - a.marketValue),
    chartPoints,
  };
}

export function getPortfolioSummary(
  portfolio: Portfolio | null | undefined,
  assets: Asset[],
  options: PortfolioPerformanceOptions = {}
): PortfolioSummarySnapshot | null {
  const performance = calculatePortfolioPerformance(portfolio, assets, options);

  if (!performance) {
    return null;
  }

  return {
    portfolioId: portfolio?.id ?? "",
    currency: getPortfolioCurrency(portfolio),
    totalMarketValue: performance.totalMarketValue,
    marketValueByCurrency: performance.marketValueByCurrency,
    totalPnl: performance.totalPnl,
    totalPnlPct: performance.totalPnlPct,
  };
}

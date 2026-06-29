"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Asset, Portfolio, Transaction, TransactionType } from "@/lib/portfolio";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

const assetTypeLabels: Record<Asset["type"], string> = {
  stock: "Acciones",
  etf: "ETF",
  crypto: "Cripto",
  bond: "Bonos",
  cash: "Efectivo",
  other: "Otros",
};

const assetPalette = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

function getAssetColor(assetId: string, index: number) {
  const base = Array.from(assetId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return assetPalette[(base + index) % assetPalette.length];
}

function emptyTransactionForm() {
  return {
    type: "buy" as TransactionType,
    assetId: "",
    date: new Date().toISOString().slice(0, 10),
    quantity: "1",
    price: "",
    notes: "",
  };
}

const transactionTypes: Array<{ value: TransactionType; label: string }> = [
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
  { value: "cash_in", label: "Ingreso de efectivo" },
  { value: "cash_out", label: "Egreso de efectivo" },
];

function getTransactionTypeLabel(type: TransactionType) {
  return transactionTypes.find((item) => item.value === type)?.label ?? type;
}

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm());
  const [sortBy, setSortBy] = useState<"date" | "symbol" | "price" | "quantity">("date");
  const [compositionView, setCompositionView] = useState<"valuation" | "type">("valuation");
  const [hoveredChartPoint, setHoveredChartPoint] = useState<{ label: string; value: number; index: number } | null>(null);

  const loadPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const [portfolioResponse, assetsResponse] = await Promise.all([
        fetch(`/api/portfolios/${params.id}`),
        fetch(`/api/assets`),
      ]);

      if (!portfolioResponse.ok) {
        throw new Error("No se pudo cargar el portfolio.");
      }

      if (!assetsResponse.ok) {
        throw new Error("No se pudieron cargar los activos.");
      }

      const portfolioData = (await portfolioResponse.json()) as Portfolio;
      const assetsData = (await assetsResponse.json()) as Asset[];
      setPortfolio(portfolioData);
      setAssets(assetsData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadPortfolio();
    }
  }, [params.id]);

  const transactionRows = useMemo(() => {
    if (!portfolio) return [];

    return (portfolio.transactions ?? []).map((transaction) => ({
      ...transaction,
      assetId: transaction.assetId ?? "",
      assetName: transaction.assetName ?? "Efectivo",
      assetSymbol: transaction.assetSymbol ?? "",
      assetType: transaction.assetType ?? "cash",
      assetPrice: 0,
    }));
  }, [portfolio]);

  const portfolioPerformance = useMemo(() => {
    if (!portfolio) {
      return null;
    }

    const holdings = new Map<
      string,
      {
        assetId: string;
        symbol: string;
        name: string;
        type: Asset["type"];
        quantity: number;
        totalCost: number;
        avgBuyPrice: number;
      }
    >();

    const applyTransaction = (transaction: Transaction) => {
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

      if (transaction.assetSymbol) {
        existing.symbol = transaction.assetSymbol;
      }
      if (transaction.assetName) {
        existing.name = transaction.assetName;
      }
      if (transaction.assetType) {
        existing.type = transaction.assetType;
      }

      holdings.set(transaction.assetId, existing);
    };

    const sortedTransactions = [...(portfolio.transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    sortedTransactions.forEach(applyTransaction);

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
  }, [assets, portfolio]);

  const sortedTransactions = useMemo(() => {
    const rows = [...transactionRows];

    rows.sort((a, b) => {
      if (sortBy === "date") {
        return b.date.localeCompare(a.date);
      }
      if (sortBy === "symbol") {
        return a.assetSymbol.localeCompare(b.assetSymbol);
      }
      if (sortBy === "price") {
        return b.price - a.price;
      }
      return (b.quantity ?? 0) - (a.quantity ?? 0);
    });

    return rows;
  }, [sortBy, transactionRows]);

  const openCreateTransactionModal = () => {
    setEditingTransaction(null);
    setTransactionForm(emptyTransactionForm());
    setError(null);
    setIsTransactionModalOpen(true);
  };

  const openEditTransactionModal = (transaction: Transaction & { assetId: string; assetName: string; assetSymbol: string; assetType: Asset["type"]; assetPrice: number }) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      type: transaction.type,
      assetId: transaction.assetId ?? "",
      date: transaction.date,
      quantity: String(transaction.quantity ?? 1),
      price: String(transaction.price),
      notes: transaction.notes || "",
    });
    setError(null);
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
    setTransactionForm(emptyTransactionForm());
    setError(null);
  };

  const handleSaveTransaction = async () => {
    const assetId = transactionForm.assetId;
    const quantity = Number(transactionForm.quantity);
    const price = Number(transactionForm.price);
    const isAssetTransaction = transactionForm.type === "buy" || transactionForm.type === "sell";

    if (isAssetTransaction) {
      if (!assetId || !transactionForm.date || !quantity || !price) {
        setError("Seleccioná un activo, fecha, cantidad y precio.");
        return;
      }
    } else if (!transactionForm.date || !price) {
      setError("Seleccioná fecha y monto para la operación de efectivo.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${params.id}`, {
        method: editingTransaction ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "transaction",
          transactionId: editingTransaction?.id,
          type: transactionForm.type,
          assetId: isAssetTransaction ? assetId : undefined,
          assetSymbol: isAssetTransaction ? assets.find((asset) => asset.id === assetId)?.symbol || "" : "",
          assetName: isAssetTransaction ? assets.find((asset) => asset.id === assetId)?.name || "" : "",
          assetType: isAssetTransaction ? assets.find((asset) => asset.id === assetId)?.type || "stock" : undefined,
          quantity: isAssetTransaction ? quantity : undefined,
          price,
          date: transactionForm.date,
          notes: transactionForm.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo guardar la transacción.");
      }

      const updatedPortfolio = (await response.json()) as Portfolio;
      setPortfolio(updatedPortfolio);
      closeTransactionModal();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = window.confirm("¿Querés eliminar esta transacción?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/portfolios/${params.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "transaction", transactionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo eliminar la transacción.");
      }

      const updatedPortfolio = (await response.json()) as Portfolio;
      setPortfolio(updatedPortfolio);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <Link href="/" className="text-sm font-medium text-sky-600 hover:text-sky-700">
            ← Volver a portfolios
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{portfolio?.name || "Portfolio"}</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {portfolio?.description || "Sin descripción"}
              </p>
            </div>
            {portfolioPerformance ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Total</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(portfolioPerformance.totalMarketValue)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="text-slate-600 dark:text-slate-300">USD</span>
                    <span className={`font-semibold ${portfolioPerformance.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(portfolioPerformance.totalPnl)}
                    </span>
                    <span className={`font-semibold ${portfolioPerformance.totalPnlPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ({formatPercent(portfolioPerformance.totalPnlPct)})
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {portfolioPerformance ? (
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Rendimientos</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Valuación en USD, evolución del portfolio y composición de la cartera.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Moneda: USD
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Evolución de la valuación</h3>
                      <p className="mt-1 text-sm text-slate-500">Líneas por activo y total del portfolio</p>
                    </div>
                    <div className="text-sm text-slate-500">Fechas de movimientos</div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <svg viewBox="0 0 320 180" className="h-48 min-w-[300px] w-full">
                      {[0, 1, 2].map((row) => (
                        <line
                          key={row}
                          x1="16"
                          y1={52 + row * 50}
                          x2="304"
                          y2={52 + row * 50}
                          stroke="currentColor"
                          strokeDasharray="4 4"
                          className="text-slate-300 dark:text-slate-700"
                        />
                      ))}
                      {(() => {
                        const maxValue = Math.max(...portfolioPerformance.chartPoints.map((point) => point.value), 1);
                        const minValue = Math.min(...portfolioPerformance.chartPoints.map((point) => point.value), 0);
                        const linePoints = portfolioPerformance.chartPoints.map((point, index) => {
                          const x = 16 + (index / Math.max(1, portfolioPerformance.chartPoints.length - 1)) * 288;
                          const normalized = maxValue === minValue ? 0.5 : (point.value - minValue) / (maxValue - minValue);
                          const y = 152 - normalized * 120;
                          return { ...point, x, y, index };
                        });

                        return (
                          <>
                            <polyline fill="none" stroke="#0ea5e9" strokeWidth="3" points={linePoints.map((point) => `${point.x},${point.y}`).join(" ")} />
                            {linePoints.map((point) => (
                              <g key={`${point.label}-${point.index}`}>
                                <circle
                                  cx={point.x}
                                  cy={point.y}
                                  r="4.5"
                                  fill="#ffffff"
                                  stroke="#0ea5e9"
                                  strokeWidth="2.5"
                                  onMouseEnter={() => setHoveredChartPoint({ label: point.label, value: point.value, index: point.index })}
                                  onMouseLeave={() => setHoveredChartPoint(null)}
                                />
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                    {hoveredChartPoint ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{hoveredChartPoint.label}</span>
                        <span className="text-slate-600 dark:text-slate-300">Valor: {formatCurrency(hoveredChartPoint.value)}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">Pasa el cursor sobre la gráfica para ver el valor en USD por fecha.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Composición</h3>
                      <p className="mt-1 text-sm text-slate-500">Elige cómo ver la tenencia</p>
                    </div>
                    <div className="inline-flex rounded-full bg-slate-200 p-1 dark:bg-slate-800">
                      <button type="button" onClick={() => setCompositionView("valuation")} className={`rounded-full px-3 py-1.5 text-sm font-medium ${compositionView === "valuation" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                        Por valuación
                      </button>
                      <button type="button" onClick={() => setCompositionView("type")} className={`rounded-full px-3 py-1.5 text-sm font-medium ${compositionView === "type" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
                        Por tipo
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {compositionView === "valuation" ? (
                      portfolioPerformance.holdings.length ? (
                        portfolioPerformance.holdings.map((holding, index) => {
                          const color = getAssetColor(holding.assetId, index);
                          return (
                            <div key={holding.assetId} className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{holding.name}</p>
                                    <p className="text-xs text-slate-500">{holding.symbol} · {assetTypeLabels[holding.type]}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(holding.marketValue)}</p>
                                  <p className="text-xs text-slate-500">{(holding.marketValue / portfolioPerformance.totalMarketValue * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span>Cant.: {holding.quantity}</span>
                                <span>Promedio: {formatCurrency(holding.avgBuyPrice)}</span>
                                <span>Actual: {formatCurrency(holding.currentPrice)}</span>
                                <span className={holding.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                  {holding.pnl >= 0 ? "+" : ""}{formatCurrency(holding.pnl)} ({formatPercent(holding.pnlPct)})
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          No hay posiciones abiertas para mostrar.
                        </div>
                      )
                    ) : portfolioPerformance.assetTypeBreakdown.length ? (
                      portfolioPerformance.assetTypeBreakdown.map((item) => (
                        <div key={item.type} className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{assetTypeLabels[item.type]}</span>
                            <span className="text-slate-500">{(item.marketValue / portfolioPerformance.totalMarketValue * 100).toFixed(1)}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-sky-500" style={{ width: `${portfolioPerformance.totalMarketValue ? (item.marketValue / portfolioPerformance.totalMarketValue) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Sin tipos de activos para mostrar.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Transacciones</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Listado cronológico con opción de editar o eliminar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as "date" | "symbol" | "price" | "quantity")}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="date">Fecha</option>
                <option value="symbol">Símbolo</option>
                <option value="price">Precio</option>
                <option value="quantity">Cantidad</option>
              </select>
              <button
                type="button"
                onClick={openCreateTransactionModal}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                + Agregar transacción
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Cargando transacciones...
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No hay transacciones cargadas aún.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.3fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
                <div>Fecha</div>
                <div>Tipo</div>
                <div>Símbolo</div>
                <div>Activo</div>
                <div>Precio</div>
                <div>Cantidad</div>
                <div></div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTransactions.map((transaction) => (
                  <div key={transaction.id} className="grid grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.7fr_0.3fr] gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                    <div>{transaction.date}</div>
                    <div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </div>
                    <div>{transaction.assetSymbol || "—"}</div>
                    <div>{transaction.assetName || "Efectivo"}</div>
                    <div>${transaction.price}</div>
                    <div>{transaction.quantity ?? "—"}</div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditTransactionModal(transaction)}
                        className="text-sky-600 hover:text-sky-700 dark:text-sky-400"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isTransactionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{editingTransaction ? "Editar transacción" : "Nueva transacción"}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Cargá fecha, activo, cantidad, precio y notas.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTransactionModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Tipo de transacción
                <select
                  value={transactionForm.type}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, type: event.target.value as TransactionType }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                >
                  {transactionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {transactionForm.type === "buy" || transactionForm.type === "sell" ? (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Activo
                  <select
                    value={transactionForm.assetId}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, assetId: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  >
                    <option value="">Seleccioná un activo</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.symbol} — {asset.name} — ${asset.price}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Fecha
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {transactionForm.type === "buy" || transactionForm.type === "sell" ? "Cantidad" : "Monto"}
                  <input
                    type="number"
                    value={transactionForm.quantity}
                    onChange={(event) => setTransactionForm((current) => ({ ...current, quantity: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Precio
                <input
                  type="number"
                  value={transactionForm.price}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, price: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Notas
                <textarea
                  value={transactionForm.notes}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, notes: event.target.value }))}
                  className="mt-2 min-h-[110px] w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeTransactionModal}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {saving ? "Guardando..." : editingTransaction ? "Guardar cambios" : "Agregar transacción"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

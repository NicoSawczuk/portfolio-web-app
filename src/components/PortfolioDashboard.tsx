"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Asset, Portfolio, Transaction } from "@/lib/portfolio";

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

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function emptyPortfolio(): Omit<Portfolio, "id" | "createdAt" | "assets"> {
  return {
    name: "",
    description: "",
    transactions: [],
  };
}

function getPortfolioSummary(portfolio: Portfolio, assets: Asset[]) {
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

    if (transaction.assetSymbol) existing.symbol = transaction.assetSymbol;
    if (transaction.assetName) existing.name = transaction.assetName;
    if (transaction.assetType) existing.type = transaction.assetType;

    holdings.set(transaction.assetId, existing);
  };

  const sortedTransactions = [...(portfolio.transactions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  sortedTransactions.forEach(applyTransaction);

  const positions = Array.from(holdings.values())
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const assetMeta = assets.find((asset) => asset.id === item.assetId);
      const currentPrice = assetMeta?.price ?? 0;
      const marketValue = item.quantity * currentPrice;
      const costBasis = item.quantity * item.avgBuyPrice;
      const pnl = marketValue - costBasis;
      const pnlPct = costBasis > 0 ? pnl / costBasis : 0;

      return { ...item, currentPrice, marketValue, costBasis, pnl, pnlPct };
    });

  const totalMarketValue = positions.reduce((sum, item) => sum + item.marketValue, 0);
  const totalCostBasis = positions.reduce((sum, item) => sum + item.costBasis, 0);
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

  return { totalMarketValue, totalPnl, totalPnlPct };
}

export default function PortfolioDashboard() {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [formState, setFormState] = useState(emptyPortfolio());

  const loadPortfolios = async () => {
    setLoading(true);
    setError(null);
    try {
      const [portfoliosResponse, assetsResponse] = await Promise.all([fetch("/api/portfolios"), fetch("/api/assets")]);

      if (!portfoliosResponse.ok) {
        throw new Error("No se pudieron cargar los portfolios.");
      }

      if (!assetsResponse.ok) {
        throw new Error("No se pudieron cargar los activos.");
      }

      const portfoliosData = (await portfoliosResponse.json()) as Portfolio[];
      const assetsData = (await assetsResponse.json()) as Asset[];
      setPortfolios(portfoliosData);
      setAssets(assetsData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolios();
  }, []);

  const openCreateModal = () => {
    setEditingPortfolio(null);
    setFormState(emptyPortfolio());
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setFormState({ name: portfolio.name, description: portfolio.description, transactions: portfolio.transactions ?? [] });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPortfolio(null);
    setFormState(emptyPortfolio());
    setError(null);
  };

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setError("El nombre del portfolio es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/portfolios", {
        method: editingPortfolio ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingPortfolio ? { id: editingPortfolio.id, ...formState } : formState
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Error al guardar el portfolio.");
      }

      const savedPortfolio = (await response.json()) as Portfolio;
      setPortfolios((current) => {
        if (editingPortfolio) {
          return current.map((item) => (item.id === savedPortfolio.id ? savedPortfolio : item));
        }
        return [savedPortfolio, ...current];
      });
      closeModal();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("¿Querés eliminar este portfolio?");
    if (!confirmed) return;

    try {
      const response = await fetch("/api/portfolios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo eliminar el portfolio.");
      }

      setPortfolios((current) => current.filter((portfolio) => portfolio.id !== id));
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/70 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Portfolios</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tus carteras</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Organiza tus objetivos de inversión en un solo lugar.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            + Nuevo portfolio
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            Cargando portfolios...
          </div>
        ) : portfolios.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-lg font-semibold">Aún no hay portfolios.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Creá el primero para empezar a organizar tus inversiones.
            </p>
          </div>
        ) : (
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Portfolios</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Elegí un portfolio para ver sus transacciones y entrar al detalle.
                </p>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              {portfolios.map((portfolio) => {
                const summary = getPortfolioSummary(portfolio, assets);

                return (
                  <div key={portfolio.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">{portfolio.name}</h3>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {portfolio.description || "Sin descripción"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(summary.totalMarketValue)}</span>
                        <span className="text-slate-500">USD</span>
                        <span className={`font-semibold ${summary.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatCurrency(summary.totalPnl)}
                        </span>
                        <span className={`font-semibold ${summary.totalPnlPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          ({formatPercent(summary.totalPnlPct)})
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Creado {formatDate(portfolio.createdAt)}
                      </p>
                    </button>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(portfolio)}
                        className="rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(portfolio.id)}
                        className="rounded-2xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{editingPortfolio ? "Editar portfolio" : "Crear portfolio"}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {editingPortfolio ? "Actualizá los datos del portfolio." : "Agregá un nuevo portfolio para empezar a ordenar tus inversiones."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre
                <input
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  placeholder="Ej. Jubilación"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Descripción
                <textarea
                  value={formState.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  className="mt-2 min-h-[110px] w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {saving ? "Guardando..." : editingPortfolio ? "Guardar cambios" : "Crear portfolio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

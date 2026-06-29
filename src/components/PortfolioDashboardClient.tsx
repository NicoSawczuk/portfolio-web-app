"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Asset, Portfolio } from "@/lib/portfolio";
import { getPortfolioSummary } from "@/lib/portfolio-summary";
import PortfolioMetricCard from "@/components/PortfolioMetricCard";

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}USD ${formatter.format(Math.abs(value))}`;
}

function formatPercent(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}${formatter.format(Math.abs(value * 100))}%`;
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

interface PortfolioDashboardClientProps {
  initialPortfolios: Portfolio[];
  initialAssets: Asset[];
}

export default function PortfolioDashboardClient({ initialPortfolios, initialAssets }: PortfolioDashboardClientProps) {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState(initialPortfolios);
  const [assets, setAssets] = useState(initialAssets);
  const [showAmounts, setShowAmounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [formState, setFormState] = useState(emptyPortfolio());

  const formatCurrencyByVisibility = (value: number) => (showAmounts ? formatCurrency(value) : "••••••");
  const formatPercentByVisibility = (value: number) => (showAmounts ? formatPercent(value) : "••••");

  const portfolioSummaries = useMemo(
    () => portfolios.map((portfolio) => ({ portfolio, summary: getPortfolioSummary(portfolio, assets) })),
    [assets, portfolios]
  );

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
        body: JSON.stringify(editingPortfolio ? { id: editingPortfolio.id, ...formState } : formState),
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
            aria-label="Agregar portfolio"
            title="Agregar portfolio"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {portfolios.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-lg font-semibold">Aún no hay portfolios.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Creá el primero para empezar a organizar tus inversiones.
            </p>
          </div>
        ) : (
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div>
                <h2 className="text-xl font-semibold">Portfolios</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Elegí un portfolio para ver sus transacciones y entrar al detalle.
                </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAmounts((value) => !value)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={showAmounts ? "Ocultar montos" : "Mostrar montos"}
                  title={showAmounts ? "Ocultar montos" : "Mostrar montos"}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {!showAmounts ? <path d="M3 3l18 18" /> : null}
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              {portfolioSummaries.map(({ portfolio, summary }) => (
                <div key={portfolio.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                  <button type="button" onClick={() => router.push(`/portfolios/${portfolio.id}`)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{portfolio.name}</h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {portfolio.description || "Sin descripción"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Creado {formatDate(portfolio.createdAt)}</p>
                  </button>

                  <div className="flex flex-col items-start gap-3 lg:min-w-[290px] lg:items-end">
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <PortfolioMetricCard title="Total" value={formatCurrencyByVisibility(summary?.totalMarketValue ?? 0)} subtitle="USD" compact />
                      <PortfolioMetricCard
                        title="Variación"
                        value={formatCurrencyByVisibility(summary?.totalPnl ?? 0)}
                        subtitle={formatPercentByVisibility(summary?.totalPnlPct ?? 0)}
                        tone={(summary?.totalPnl ?? 0) >= 0 ? "positive" : "negative"}
                        compact
                      />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(portfolio);
                        }}
                        aria-label="Editar portfolio"
                        title="Editar portfolio"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(portfolio.id);
                        }}
                        aria-label="Eliminar portfolio"
                        title="Eliminar portfolio"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300 text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/60 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

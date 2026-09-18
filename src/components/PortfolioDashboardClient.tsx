"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Asset, AssetCurrency, Portfolio } from "@/lib/portfolio";
import { getPortfolioCurrency } from "@/lib/portfolio";
import { getPortfolioSummary } from "@/lib/portfolio-summary";
import PortfolioValuationCard from "@/components/PortfolioValuationCard";

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
    currency: "USD",
    managesCash: false,
    transactions: [],
  };
}

const portfolioCurrencies: Array<{ value: AssetCurrency; label: string }> = [
  { value: "USD", label: "USD" },
  { value: "ARS", label: "ARS" },
];

interface PortfolioDashboardClientProps {
  initialPortfolios: Portfolio[];
  initialAssets: Asset[];
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="header-action-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EyeIcon({ hidden = false }: { hidden?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
      {hidden ? <path d="M3 3l18 18" /> : null}
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function PortfolioDashboardClient({ initialPortfolios, initialAssets }: PortfolioDashboardClientProps) {
  const [portfolios, setPortfolios] = useState(initialPortfolios);
  const [assets] = useState(initialAssets);
  const [showAmounts, setShowAmounts] = useState(true);
  const [selectedCurrencies, setSelectedCurrencies] = useState<AssetCurrency[]>(["USD", "ARS"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [formState, setFormState] = useState(emptyPortfolio());

  const portfolioSummaries = useMemo(
    () => portfolios.map((portfolio) => ({ portfolio, summary: getPortfolioSummary(portfolio, assets, { includeChartPoints: false }) })),
    [assets, portfolios]
  );

  const toggleCurrencyFilter = (currency: AssetCurrency) => {
    setSelectedCurrencies((current) =>
      current.includes(currency) ? current.filter((item) => item !== currency) : [...current, currency]
    );
  };

  const visiblePortfolioSummaries = useMemo(
    () =>
      portfolioSummaries.filter(({ portfolio }) =>
        selectedCurrencies.includes(getPortfolioCurrency(portfolio))
      ),
    [portfolioSummaries, selectedCurrencies]
  );

  const openCreateModal = () => {
    setEditingPortfolio(null);
    setFormState(emptyPortfolio());
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setFormState({
      name: portfolio.name,
      description: portfolio.description,
      currency: getPortfolioCurrency(portfolio),
      managesCash: Boolean(portfolio.managesCash),
      transactions: portfolio.transactions ?? [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPortfolio(null);
    setFormState(emptyPortfolio());
    setError(null);
  };

  const handleChange = (field: keyof typeof formState, value: string | boolean) => {
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
    <main className="page">
      <section className="page-container">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Portfolios</p>
            <h1 className="card-title card-title--page">Tus carteras</h1>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={openCreateModal}
              aria-label="Agregar portfolio"
              title="Agregar portfolio"
              className="button button-primary header-action-button"
            >
              <PlusIcon />
            </button>
          </div>
        </header>

        {error ? (
          <div className="alert-error">
            {error}
          </div>
        ) : null}

        {portfolios.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-700 bg-[#0e172a] px-6 py-12 text-center">
            <p className="text-lg font-semibold text-white">Aún no hay portfolios.</p>
            <p className="mt-2 text-sm text-slate-400">Creá el primero para empezar a organizar tus inversiones.</p>
          </div>
        ) : (
          <div className="card card--panel">
            <div className="card-header flex-wrap">
              <h2 className="card-title">Portfolios</h2>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                <div className="flex items-center gap-1.5" role="group" aria-label="Filtrar por moneda">
                  {portfolioCurrencies.map((item) => {
                    const isSelected = selectedCurrencies.includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => toggleCurrencyFilter(item.value)}
                        aria-pressed={isSelected}
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                          isSelected
                            ? "border-sky-400/40 bg-sky-400/15 text-sky-200"
                            : "border-slate-700 text-slate-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAmounts((value) => !value)}
                  className="button button-secondary inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium"
                  aria-label={showAmounts ? "Ocultar montos" : "Mostrar montos"}
                  title={showAmounts ? "Ocultar montos" : "Mostrar montos"}
                >
                  <EyeIcon hidden={!showAmounts} />
                  <span>{showAmounts ? "Ocultar" : "Mostrar"}</span>
                </button>
              </div>
            </div>

            <div className="card-content card-content--list">
              {visiblePortfolioSummaries.map(({ portfolio, summary }) => (
                <article
                  key={portfolio.id}
                  className="card-item relative"
                >
                  <Link
                    href={`/portfolios/${portfolio.id}`}
                    aria-label={`Abrir portfolio ${portfolio.name}`}
                    className="absolute inset-0 z-0 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/60"
                  />

                  <div className="pointer-events-none relative z-10 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-4">
                    <div className="min-w-0 p-1 pr-2">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="card-title">{portfolio.name}</h3>
                          <span className="inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                            {getPortfolioCurrency(portfolio)}
                          </span>
                        </div>
                        <p className="card-description line-clamp-2">{portfolio.description}</p>
                      </div>
                    </div>

                    <div className="w-full lg:w-[280px] lg:justify-self-end">
                      <PortfolioValuationCard
                        totalMarketValue={summary?.totalMarketValue ?? 0}
                        totalPnl={summary?.totalPnl ?? 0}
                        totalPnlPct={summary?.totalPnlPct ?? 0}
                        showAmounts={showAmounts}
                        className="w-full"
                        currency={summary?.currency ?? getPortfolioCurrency(portfolio)}
                        marketValueByCurrency={summary?.marketValueByCurrency}
                      />
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Creado {formatDate(portfolio.createdAt)}</p>

                    <div className="pointer-events-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          openEditModal(portfolio);
                        }}
                        aria-label="Editar portfolio"
                        title="Editar portfolio"
                        className="button button-secondary inline-flex h-10 w-10 items-center justify-center bg-[#0f172a]"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(portfolio.id);
                        }}
                        aria-label="Eliminar portfolio"
                        title="Eliminar portfolio"
                        className="button button-secondary inline-flex h-10 w-10 items-center justify-center bg-[#0f172a] hover:border-rose-500/70 hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal modal--narrow">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editingPortfolio ? "Editar portfolio" : "Crear portfolio"}</h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <label className="modal-field">
                Nombre
                <input
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  className="control modal-field-input"
                  placeholder="Ej. Jubilación"
                />
              </label>

              <label className="modal-field">
                Descripción
                <textarea
                  value={formState.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  className="control modal-field-input modal-textarea"
                  placeholder="Opcional"
                />
              </label>

              {editingPortfolio ? (
                <div className="modal-field">
                  <span className="text-sm text-slate-400">Moneda (no se puede cambiar)</span>
                  <div className="mt-1">
                    <span className="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      {getPortfolioCurrency(editingPortfolio)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="modal-field">
                  <span className="text-sm text-slate-400">Moneda del portfolio</span>
                  <div className="mt-1 flex items-center gap-2" role="group" aria-label="Moneda del portfolio">
                    {portfolioCurrencies.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleChange("currency", item.value)}
                        aria-pressed={formState.currency === item.value}
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          formState.currency === item.value
                            ? "border-sky-400/40 bg-sky-400/15 text-sky-200"
                            : "border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="modal-toggle-row">
                <span>Gestionar efectivo en este portfolio</span>
                <input
                  type="checkbox"
                  checked={Boolean(formState.managesCash)}
                  onChange={(event) => handleChange("managesCash", event.target.checked)}
                  className="modal-checkbox"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeModal}
                className="button button-secondary modal-button"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="button button-primary modal-button"
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

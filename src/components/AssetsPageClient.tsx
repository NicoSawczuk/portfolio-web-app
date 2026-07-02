"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset } from "@/lib/portfolio";

function emptyAssetForm() {
  return {
    symbol: "",
    name: "",
    type: "stock" as Asset["type"],
    id_partner: "",
    price: "",
  };
}

function formatPrice(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}USD ${formatter.format(Math.abs(value))}`;
}

function formatQuoteUpdatedAt(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const assetTypes: Array<{ value: Asset["type"]; label: string }> = [
  { value: "stock", label: "Acción" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Cripto" },
  { value: "bond", label: "Bono" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

interface AssetsPageClientProps {
  initialAssets: Asset[];
}

export default function AssetsPageClient({ initialAssets }: AssetsPageClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [assetForm, setAssetForm] = useState(emptyAssetForm());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assetsPerPage, setAssetsPerPage] = useState<10 | 20 | 50 | 100>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefreshQuotes = async () => {
    setRefreshingQuotes(true);
    setError(null);

    try {
      const response = await fetch("/api/assets?forceRefresh=1");
      if (!response.ok) {
        throw new Error("No se pudieron refrescar las cotizaciones.");
      }

      const refreshedAssets = (await response.json()) as Asset[];
      setAssets(refreshedAssets);
    } catch (err) {
      setError(String(err));
    } finally {
      setRefreshingQuotes(false);
    }
  };

  const resetAssetForm = () => {
    setAssetForm(emptyAssetForm());
    setEditingAssetId(null);
    setIsModalOpen(false);
  };

  const openAssetEditor = (asset?: Asset) => {
    if (asset) {
      setEditingAssetId(asset.id);
      setAssetForm({
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        id_partner: String(asset.id_partner ?? ""),
        price: String(asset.price),
      });
      setIsModalOpen(true);
      return;
    }

    setEditingAssetId(null);
    setAssetForm(emptyAssetForm());
    setError(null);
    setIsModalOpen(true);
  };

  const closeAssetModal = () => {
    setIsModalOpen(false);
    setEditingAssetId(null);
    setAssetForm(emptyAssetForm());
    setError(null);
  };

  const handleSaveAsset = async () => {
    if (!assetForm.symbol.trim() || !assetForm.name.trim()) {
      setError("El símbolo y el nombre son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/assets", {
        method: editingAssetId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingAssetId
            ? {
                id: editingAssetId,
                symbol: assetForm.symbol,
                name: assetForm.name,
                type: assetForm.type,
                id_partner:
                  assetForm.type === "crypto" && assetForm.id_partner.trim()
                    ? Number(assetForm.id_partner)
                    : undefined,
                price: Number(assetForm.price || 0),
              }
            : {
                symbol: assetForm.symbol,
                name: assetForm.name,
                type: assetForm.type,
                id_partner:
                  assetForm.type === "crypto" && assetForm.id_partner.trim()
                    ? Number(assetForm.id_partner)
                    : undefined,
                price: Number(assetForm.price || 0),
              }
        ),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo guardar el activo.");
      }

      const savedAsset = (await response.json()) as Asset;
      setAssets((current) => {
        if (editingAssetId) {
          return current.map((asset) => (asset.id === savedAsset.id ? savedAsset : asset));
        }
        return [savedAsset, ...current];
      });
      closeAssetModal();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const confirmed = window.confirm("¿Querés eliminar este activo?");
    if (!confirmed) return;

    try {
      const response = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo eliminar el activo.");
      }

      setAssets((current) => current.filter((asset) => asset.id !== assetId));
    } catch (err) {
      setError(String(err));
    }
  };

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter((asset) => {
      return (
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        asset.type.toLowerCase().includes(query)
      );
    });
  }, [assets, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / assetsPerPage));
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * assetsPerPage;
    return filteredAssets.slice(startIndex, startIndex + assetsPerPage);
  }, [assetsPerPage, currentPage, filteredAssets]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assetsPerPage, filteredAssets.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:gap-4 sm:p-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Módulo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Activos</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshQuotes}
              disabled={refreshingQuotes}
              aria-label="Refrescar cotizaciones"
              title="Refrescar cotizaciones"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:h-11 sm:w-11 sm:rounded-2xl"
            >
              <svg viewBox="0 0 24 24" className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshingQuotes ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openAssetEditor()}
              aria-label="Agregar activo"
              title="Agregar activo"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 sm:h-11 sm:w-11 sm:rounded-2xl"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/70 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Activos creados</h2>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                <div className="relative flex-1 sm:max-w-[220px]">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar"
                    className="h-8 w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-400 sm:h-9 sm:rounded-xl sm:pr-3 sm:text-sm"
                  />
                </div>
                <select
                  value={assetsPerPage}
                  onChange={(event) => setAssetsPerPage(Number(event.target.value) as 10 | 20 | 50 | 100)}
                  className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:h-9 sm:rounded-xl sm:px-3 sm:text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length ? (
                paginatedAssets.map((asset) => (
                  <div key={asset.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:gap-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold" title={asset.name}>{asset.symbol}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            asset.priceSource === "live"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {asset.priceSource === "live" ? "Cotización en vivo" : "Precio local"}
                        </span>
                        {asset.priceSource === "live" && asset.quoteUpdatedAt ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Actualizado {formatQuoteUpdatedAt(asset.quoteUpdatedAt)}
                          </span>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:px-3 sm:py-1 sm:text-xs">
                        {assetTypes.find((item) => item.value === asset.type)?.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(asset.price)}</span>
                      <button
                        type="button"
                        onClick={() => openAssetEditor(asset)}
                        aria-label={`Editar ${asset.symbol}`}
                        title={`Editar ${asset.symbol}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-sky-600 transition hover:bg-slate-50 hover:text-sky-700 dark:border-slate-700 dark:text-sky-400 dark:hover:bg-slate-800 sm:h-8 sm:w-8 sm:rounded-xl"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        aria-label={`Eliminar ${asset.symbol}`}
                        title={`Eliminar ${asset.symbol}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-300 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 dark:border-rose-700/60 dark:text-rose-400 dark:hover:bg-rose-950/50 sm:h-8 sm:w-8 sm:rounded-xl"
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
                ))
              ) : (
                <div className="py-4 text-sm text-slate-500 dark:text-slate-400">
                  No hay activos que coincidan con la búsqueda.
                </div>
              )}
            </div>

            {filteredAssets.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  Página {currentPage} de {totalPages} ({filteredAssets.length} activos)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{editingAssetId ? "Editar activo" : "Crear activo"}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Completá símbolo, nombre, tipo y precio para guardar el activo.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssetModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Símbolo
                  <input
                    value={assetForm.symbol}
                    onChange={(event) => setAssetForm((current) => ({ ...current, symbol: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="AAPL"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre
                  <input
                    value={assetForm.name}
                    onChange={(event) => setAssetForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="Apple"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Tipo
                  <select
                    value={assetForm.type}
                    onChange={(event) => setAssetForm((current) => ({ ...current, type: event.target.value as Asset["type"] }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                  >
                    {assetTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  ID partner (Cripto)
                  <input
                    type="number"
                    value={assetForm.id_partner}
                    onChange={(event) => setAssetForm((current) => ({ ...current, id_partner: event.target.value }))}
                    disabled={assetForm.type !== "crypto"}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="1"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Precio actual
                  <input
                    type="number"
                    value={assetForm.price}
                    onChange={(event) => setAssetForm((current) => ({ ...current, price: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
                    placeholder="0"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeAssetModal}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAsset}
                disabled={saving}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {saving ? "Guardando..." : editingAssetId ? "Guardar cambios" : "Agregar activo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

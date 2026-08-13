"use client";

import { useMemo, useState } from "react";
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

function getQuoteCheckedLabel(asset: Asset) {
  const checkedAt = formatQuoteUpdatedAt(asset.quoteCheckedAt);
  if (checkedAt) {
    return `Consultado ${checkedAt}`;
  }

  const updatedAt = formatQuoteUpdatedAt(asset.quoteUpdatedAt);
  if (updatedAt) {
    return `Consultado ${updatedAt}`;
  }

  return "Consulta sin fecha";
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

    const matchedAssets = !query
      ? assets
      : assets.filter((asset) => {
          return (
            asset.symbol.toLowerCase().includes(query) ||
            asset.name.toLowerCase().includes(query) ||
            asset.type.toLowerCase().includes(query)
          );
        });

    return [...matchedAssets].sort((a, b) => {
      const bySymbol = a.symbol.localeCompare(b.symbol, "es", { sensitivity: "base" });
      if (bySymbol !== 0) {
        return bySymbol;
      }

      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [assets, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / assetsPerPage));
  const boundedCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAssets = useMemo(() => {
    const startIndex = (boundedCurrentPage - 1) * assetsPerPage;
    return filteredAssets.slice(startIndex, startIndex + assetsPerPage);
  }, [assetsPerPage, boundedCurrentPage, filteredAssets]);

  return (
    <main className="page">
      <section className="page-container">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Módulo</p>
            <h1 className="card-title card-title--page">Activos</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              onClick={handleRefreshQuotes}
              disabled={refreshingQuotes}
              aria-label="Refrescar cotizaciones"
              title="Refrescar cotizaciones"
              className="button button-secondary header-action-button"
            >
              <svg
                viewBox="0 0 24 24"
                className={`header-action-icon ${refreshingQuotes ? "spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => openAssetEditor()}
              aria-label="Agregar activo"
              title="Agregar activo"
              className="button button-primary header-action-button"
            >
              <svg
                viewBox="0 0 24 24"
                className="header-action-icon"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </header>

        {error ? <div className="alert-error">{error}</div> : null}

        <div className="card card--panel">
          <div className="card-header assets-panel-header">
            <div>
              <h2 className="card-title">Activos creados</h2>
            </div>
            <div className="assets-toolbar">
              <div className="assets-search">
                <svg
                  viewBox="0 0 24 24"
                  className="assets-search-icon"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar"
                  className="control assets-search-control"
                />
              </div>
              <select
                value={assetsPerPage}
                onChange={(event) => {
                  setAssetsPerPage(Number(event.target.value) as 10 | 20 | 50 | 100);
                  setCurrentPage(1);
                }}
                className="control assets-page-size"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="card-content">
            <div className="assets-list">
              {filteredAssets.length ? (
                paginatedAssets.map((asset) => (
                  <div key={asset.id} className="assets-row">
                    <div>
                      <p className="assets-symbol" title={asset.name}>
                        {asset.symbol}
                      </p>
                    </div>
                    <div className="assets-row-meta">
                      <div className="assets-quote">
                        <span
                          className={`assets-badge ${
                            asset.priceSource === "live" ? "assets-badge--live" : "assets-badge--local"
                          }`}
                        >
                          {asset.priceSource === "live" ? "Cotización en vivo" : "Precio local"}
                        </span>
                        <span className="assets-quote-time">{getQuoteCheckedLabel(asset)}</span>
                      </div>
                      <span className="assets-type">
                        {assetTypes.find((item) => item.value === asset.type)?.label}
                      </span>
                      <span className="assets-price">{formatPrice(asset.price)}</span>
                      <button
                        type="button"
                        onClick={() => openAssetEditor(asset)}
                        aria-label={`Editar ${asset.symbol}`}
                        title={`Editar ${asset.symbol}`}
                        className="button button-secondary assets-row-action"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="assets-icon"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset.id)}
                        aria-label={`Eliminar ${asset.symbol}`}
                        title={`Eliminar ${asset.symbol}`}
                        className="button button-secondary assets-row-action assets-row-action-delete"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="assets-icon"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
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
                <div className="assets-empty">No hay activos que coincidan con la búsqueda.</div>
              )}
            </div>

            {filteredAssets.length > 0 ? (
              <div className="assets-pagination">
                <p className="assets-pagination-text">
                  Página {boundedCurrentPage} de {totalPages} ({filteredAssets.length} activos)
                </p>
                <div className="assets-pagination-actions">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.max(1, Math.min(value, totalPages) - 1))}
                    disabled={boundedCurrentPage === 1}
                    className="button button-secondary assets-pagination-button"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1))}
                    disabled={boundedCurrentPage >= totalPages}
                    className="button button-secondary assets-pagination-button"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {editingAssetId ? "Editar activo" : "Crear activo"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAssetModal}
                aria-label="Cerrar"
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <div className="modal-form-grid">
                <label className="modal-field">
                  Símbolo
                  <input
                    value={assetForm.symbol}
                    onChange={(event) =>
                      setAssetForm((current) => ({ ...current, symbol: event.target.value }))
                    }
                    className="control modal-field-input"
                    placeholder="AAPL"
                  />
                </label>
                <label className="modal-field">
                  Nombre
                  <input
                    value={assetForm.name}
                    onChange={(event) =>
                      setAssetForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="control modal-field-input"
                    placeholder="Apple"
                  />
                </label>
              </div>

              <div className="modal-form-grid">
                <label className="modal-field">
                  Tipo
                  <select
                    value={assetForm.type}
                    onChange={(event) =>
                      setAssetForm((current) => ({
                        ...current,
                        type: event.target.value as Asset["type"],
                      }))
                    }
                    className="control modal-field-input"
                  >
                    {assetTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="modal-field">
                  ID partner (Cripto)
                  <input
                    type="number"
                    value={assetForm.id_partner}
                    onChange={(event) =>
                      setAssetForm((current) => ({ ...current, id_partner: event.target.value }))
                    }
                    disabled={assetForm.type !== "crypto"}
                    className="control modal-field-input"
                    placeholder="1"
                  />
                </label>
              </div>

              <div className="modal-form-grid">
                <label className="modal-field">
                  Precio actual
                  <input
                    type="number"
                    value={assetForm.price}
                    onChange={(event) =>
                      setAssetForm((current) => ({ ...current, price: event.target.value }))
                    }
                    className="control modal-field-input"
                    placeholder="0"
                  />
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeAssetModal}
                className="button button-secondary modal-button"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAsset}
                disabled={saving}
                className="button button-primary modal-button"
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

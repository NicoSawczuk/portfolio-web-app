"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, AssetCurrency } from "@/lib/portfolio";
import { getAssetCurrency, getAssetCurrentPrice, isCedearAsset } from "@/lib/portfolio";
import { getAssetTypeChipClass, getCurrencyChipClass } from "@/lib/portfolio-format";

function emptyAssetForm() {
  return {
    symbol: "",
    name: "",
    type: "stock" as Asset["type"],
    currency: "USD" as AssetCurrency,
    id_partner: "",
    price: "",
  };
}

function formatPrice(value: number, currency: "USD" | "ARS" = "USD") {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${currency} ${formatter.format(Math.abs(value))}`;
}

function formatQuoteUpdatedAt(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function getQuoteCheckedLabel(asset: Asset) {
  const checkedAt = formatQuoteUpdatedAt(asset.quoteCheckedAt);
  if (checkedAt) {
    return checkedAt;
  }

  const updatedAt = formatQuoteUpdatedAt(asset.quoteUpdatedAt);
  if (updatedAt) {
    return updatedAt;
  }

  return "Sin fecha";
}

const assetTypes: Array<{ value: Asset["type"]; label: string }> = [
  { value: "stock", label: "Acción" },
  { value: "etf", label: "ETF" },
  { value: "cedear", label: "CEDEAR" },
  { value: "crypto", label: "Cripto" },
  { value: "bond", label: "Bono" },
  { value: "cash", label: "Efectivo" },
  { value: "other", label: "Otro" },
];

const currencyOptions: Array<{ value: AssetCurrency; label: string }> = [
  { value: "USD", label: "USD" },
  { value: "ARS", label: "ARS" },
];

interface AssetsPageClientProps {
  initialAssets: Asset[];
  initialPermissions?: AssetPermissions;
}

export interface AssetPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canRefresh?: boolean;
}

export default function AssetsPageClient({
  initialAssets,
  initialPermissions = { canCreate: false, canEdit: false, canDelete: false, canRefresh: false },
}: AssetsPageClientProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [assetForm, setAssetForm] = useState(emptyAssetForm());
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Array<Asset["type"]>>([]);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Array<AssetCurrency>>([]);
  const [currencyFilterOpen, setCurrencyFilterOpen] = useState(false);
  const currencyFilterRef = useRef<HTMLDivElement>(null);
  const [assetsPerPage, setAssetsPerPage] = useState<10 | 20 | 50 | 100>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefreshQuotes = async () => {
    if (!initialPermissions.canRefresh) {
      setError("No tenés permiso para refrescar cotizaciones.");
      return;
    }
    setRefreshingQuotes(true);
    setError(null);

    try {
      const response = await fetch("/api/assets?forceRefresh=1");
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudieron refrescar las cotizaciones.");
      }

      const refreshedAssets = (await response.json()) as Asset[];
      setAssets(refreshedAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshingQuotes(false);
    }
  };

  const toggleTypeFilter = (type: Asset["type"]) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
    setCurrentPage(1);
  };

  const clearTypeFilter = () => {
    setSelectedTypes([]);
    setCurrentPage(1);
  };

  const toggleCurrencyFilter = (currency: AssetCurrency) => {
    setSelectedCurrencies((current) =>
      current.includes(currency) ? current.filter((item) => item !== currency) : [...current, currency]
    );
    setCurrentPage(1);
  };

  const clearCurrencyFilter = () => {
    setSelectedCurrencies([]);
    setCurrentPage(1);
  };

  useEffect(() => {
    const isAnyOpen = typeFilterOpen || currencyFilterOpen;
    if (!isAnyOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (typeFilterOpen && typeFilterRef.current && !typeFilterRef.current.contains(target)) {
        setTypeFilterOpen(false);
      }
      if (currencyFilterOpen && currencyFilterRef.current && !currencyFilterRef.current.contains(target)) {
        setCurrencyFilterOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTypeFilterOpen(false);
        setCurrencyFilterOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [typeFilterOpen, currencyFilterOpen]);

  const openAssetEditor = (asset?: Asset) => {
    if (asset && !initialPermissions.canEdit) {
      setError("No tenés permiso para editar activos.");
      return;
    }
    if (!asset && !initialPermissions.canCreate) {
      setError("No tenés permiso para crear activos.");
      return;
    }
    if (asset) {
      setEditingAssetId(asset.id);
      setAssetForm({
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        currency: asset.currency ?? (isCedearAsset(asset) ? "ARS" : "USD"),
        id_partner: String(asset.id_partner ?? ""),
        price: String(getAssetCurrentPrice(asset)),
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
    if (editingAssetId && !initialPermissions.canEdit) {
      setError("No tenés permiso para editar activos.");
      return;
    }
    if (!editingAssetId && !initialPermissions.canCreate) {
      setError("No tenés permiso para crear activos.");
      return;
    }
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
        body: JSON.stringify({
          ...(editingAssetId ? { id: editingAssetId } : {}),
          symbol: assetForm.symbol,
          name: assetForm.name,
          type: assetForm.type,
          currency: assetForm.currency,
          id_partner:
            assetForm.type === "crypto" && assetForm.id_partner.trim()
              ? Number(assetForm.id_partner)
              : undefined,
          price: Number(assetForm.price || 0),
        }),
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
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!initialPermissions.canDelete) {
      setError("No tenés permiso para eliminar activos.");
      return;
    }
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
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const assetCountByType = useMemo(() => {
    const counts = new Map<Asset["type"], number>();
    for (const asset of assets) {
      counts.set(asset.type, (counts.get(asset.type) ?? 0) + 1);
    }
    return counts;
  }, [assets]);

  const assetCountByCurrency = useMemo(() => {
    const counts = new Map<AssetCurrency, number>();
    for (const asset of assets) {
      const currency = getAssetCurrency(asset);
      counts.set(currency, (counts.get(currency) ?? 0) + 1);
    }
    return counts;
  }, [assets]);

  const typeFilterLabel =
    selectedTypes.length === 0
      ? "Todos los tipos"
      : selectedTypes.length === 1
        ? (assetTypes.find((item) => item.value === selectedTypes[0])?.label ?? "1 tipo")
        : `${selectedTypes.length} tipos`;

  const currencyFilterLabel =
    selectedCurrencies.length === 0
      ? "Todas las monedas"
      : selectedCurrencies.length === 1
        ? selectedCurrencies[0]
        : `${selectedCurrencies.length} monedas`;

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matchedAssets = assets.filter((asset) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(asset.type)) {
        return false;
      }

      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(getAssetCurrency(asset))) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        asset.type.toLowerCase().includes(query) ||
        getAssetCurrency(asset).toLowerCase().includes(query)
      );
    });

    return [...matchedAssets].sort((a, b) => {
      const bySymbol = a.symbol.localeCompare(b.symbol, "es", { sensitivity: "base" });
      if (bySymbol !== 0) {
        return bySymbol;
      }

      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [assets, searchQuery, selectedCurrencies, selectedTypes]);

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
            <p className="eyebrow">Activos</p>
            <h1 className="card-title card-title--page">Activos disponibles</h1>
          </div>
          <div className="header-actions">
            {initialPermissions.canRefresh ? (
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
            ) : null}
            {initialPermissions.canCreate ? (
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
            ) : null}
          </div>
        </header>

        {error ? <div className="alert-error">{error}</div> : null}

        <div className="card card--panel">
          <div className="card-header assets-panel-header">
            <div>
              <h2 className="card-title">Activos creados</h2>
            </div>
            <div className="assets-toolbar">
              <div className="assets-toolbar-row">
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
              <div className="assets-toolbar-row">
                <div className="assets-type-dropdown" ref={typeFilterRef}>
                  <button
                    type="button"
                    onClick={() => setTypeFilterOpen((value) => !value)}
                    aria-expanded={typeFilterOpen}
                    aria-haspopup="listbox"
                    className="control assets-type-dropdown-button"
                  >
                    <span>{typeFilterLabel}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`assets-type-dropdown-chevron${typeFilterOpen ? " assets-type-dropdown-chevron--open" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {typeFilterOpen ? (
                    <div className="assets-type-dropdown-panel" role="listbox" aria-label="Filtrar por tipo" aria-multiselectable="true">
                      {assetTypes.map((item) => (
                        <label key={item.value} className="assets-type-dropdown-option">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(item.value)}
                            onChange={() => toggleTypeFilter(item.value)}
                            className="modal-checkbox"
                          />
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAssetTypeChipClass(item.value)}`}>
                            {item.label}
                          </span>
                          <span className="assets-type-dropdown-count">{assetCountByType.get(item.value) ?? 0}</span>
                        </label>
                      ))}
                      {selectedTypes.length > 0 ? (
                        <button type="button" onClick={clearTypeFilter} className="assets-type-dropdown-clear">
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="assets-type-dropdown" ref={currencyFilterRef}>
                  <button
                    type="button"
                    onClick={() => setCurrencyFilterOpen((value) => !value)}
                    aria-expanded={currencyFilterOpen}
                    aria-haspopup="listbox"
                    className="control assets-type-dropdown-button"
                  >
                    <span>{currencyFilterLabel}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className={`assets-type-dropdown-chevron${currencyFilterOpen ? " assets-type-dropdown-chevron--open" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {currencyFilterOpen ? (
                    <div className="assets-type-dropdown-panel" role="listbox" aria-label="Filtrar por moneda" aria-multiselectable="true">
                      {currencyOptions.map((item) => (
                        <label key={item.value} className="assets-type-dropdown-option">
                          <input
                            type="checkbox"
                            checked={selectedCurrencies.includes(item.value)}
                            onChange={() => toggleCurrencyFilter(item.value)}
                            className="modal-checkbox"
                          />
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getCurrencyChipClass(item.value)}`}>
                            {item.label}
                          </span>
                          <span className="assets-type-dropdown-count">{assetCountByCurrency.get(item.value) ?? 0}</span>
                        </label>
                      ))}
                      {selectedCurrencies.length > 0 ? (
                        <button type="button" onClick={clearCurrencyFilter} className="assets-type-dropdown-clear">
                          Limpiar
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="card-content">
            <div className="assets-list">
              {filteredAssets.length ? (
                paginatedAssets.map((asset) => (
                  <div key={asset.id} className="assets-row">
                    <div className="assets-symbol-line">
                      <p className="assets-symbol" title={asset.name}>
                        {asset.symbol}
                      </p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAssetTypeChipClass(asset.type)}`}>
                        {assetTypes.find((item) => item.value === asset.type)?.label}
                      </span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getCurrencyChipClass(getAssetCurrency(asset))}`}>
                        {getAssetCurrency(asset)}
                      </span>
                    </div>
                    <p className="assets-name">{asset.name}</p>
                    <p className="assets-price">{formatPrice(getAssetCurrentPrice(asset), getAssetCurrency(asset))}</p>
                    <div className="assets-row-foot">
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
                      <div className="assets-row-actions">
                        {initialPermissions.canEdit ? (
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
                        ) : null}
                        {initialPermissions.canDelete ? (
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
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="assets-empty">No hay activos que coincidan con los filtros.</div>
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
                    onChange={(event) => {
                      const nextType = event.target.value as Asset["type"];
                      setAssetForm((current) => ({
                        ...current,
                        type: nextType,
                        currency: nextType === "cedear" ? "ARS" : current.currency,
                      }));
                    }}
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
                  Moneda
                  <select
                    value={assetForm.currency}
                    onChange={(event) =>
                      setAssetForm((current) => ({
                        ...current,
                        currency: event.target.value as AssetCurrency,
                      }))
                    }
                    disabled={assetForm.type === "cedear"}
                    className="control modal-field-input"
                  >
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </label>
                <label className="modal-field">
                  Precio actual ({assetForm.currency})
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

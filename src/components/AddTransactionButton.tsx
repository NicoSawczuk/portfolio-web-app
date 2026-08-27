"use client";

import { useMemo, useState } from "react";
import type { Asset, Portfolio, TransactionType } from "@/lib/portfolio";
import { formatCurrency } from "@/lib/portfolio-format";

const assetTransactionTypes: Array<{ value: TransactionType; label: string }> = [
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
];

const allTransactionTypes: Array<{ value: TransactionType; label: string }> = [
  ...assetTransactionTypes,
  { value: "cash_in", label: "Ingreso" },
  { value: "cash_out", label: "Egreso" },
];

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTransactionForm() {
  return {
    type: "buy" as TransactionType,
    assetId: "",
    date: getTodayDateInputValue(),
    quantity: "1",
    price: "",
    notes: "",
  };
}

function parsePositiveDecimalInput(value: string) {
  const normalized = value.trim().replace(/,/g, ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isAssetTransactionType(type: TransactionType) {
  return type === "buy" || type === "sell";
}

interface AddTransactionButtonProps {
  portfolioId: string;
  assets: Asset[];
  onPortfolioUpdated: (next: Portfolio) => void;
  buttonClassName?: string;
}

export default function AddTransactionButton({
  portfolioId,
  assets,
  onPortfolioUpdated,
  buttonClassName = "",
}: AddTransactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTransactionForm());
  const [assetSelectorQuery, setAssetSelectorQuery] = useState("");

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const bySymbol = a.symbol.localeCompare(b.symbol, "es", { sensitivity: "base" });
      if (bySymbol !== 0) {
        return bySymbol;
      }

      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }, [assets]);

  const selectableAssets = useMemo(() => {
    const query = normalizeSearchText(assetSelectorQuery);
    if (!query) {
      return sortedAssets;
    }

    return sortedAssets.filter((asset) => {
      return (
        normalizeSearchText(asset.symbol).includes(query) ||
        normalizeSearchText(asset.name).includes(query) ||
        normalizeSearchText(asset.type).includes(query)
      );
    });
  }, [assetSelectorQuery, sortedAssets]);

  const openModal = () => {
    setForm(emptyTransactionForm());
    setAssetSelectorQuery("");
    setError(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setForm(emptyTransactionForm());
    setAssetSelectorQuery("");
    setError(null);
  };

  const handleSave = async () => {
    const isAssetTransaction = isAssetTransactionType(form.type);
    const quantity = parsePositiveDecimalInput(form.quantity);
    const price = parsePositiveDecimalInput(form.price);
    const selectedAsset = isAssetTransaction ? assets.find((asset) => asset.id === form.assetId) : null;

    if (isAssetTransaction) {
      if (!form.assetId || !form.date || !quantity || !price) {
        setError("Seleccioná un activo, fecha, cantidad y precio.");
        return;
      }
    } else if (!form.date || !price) {
      setError("Seleccioná fecha y monto para la operación de efectivo.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "transaction",
          type: form.type,
          assetId: isAssetTransaction ? form.assetId : undefined,
          assetSymbol: isAssetTransaction ? selectedAsset?.symbol || "" : "Efectivo",
          assetName: isAssetTransaction ? selectedAsset?.name || "" : "Efectivo",
          assetType: isAssetTransaction ? selectedAsset?.type || "stock" : "cash",
          quantity: isAssetTransaction ? quantity : undefined,
          price,
          date: form.date,
          notes: form.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo guardar la transacción.");
      }

      const updatedPortfolio = (await response.json()) as Portfolio;
      onPortfolioUpdated(updatedPortfolio);
      closeModal();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Agregar transacción"
        title="Agregar transacción"
        className={`button button-primary portfolio-detail-add-button ${buttonClassName}`.trim()}
      >
        <svg viewBox="0 0 24 24" className="portfolio-detail-add-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>

      {isOpen ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Nueva transacción</h3>
              </div>
              <button type="button" onClick={closeModal} aria-label="Cerrar" className="modal-close">
                ✕
              </button>
            </div>

            {error ? <div className="alert-error mt-4">{error}</div> : null}

            <div className="modal-form">
              <label className="modal-field">
                Tipo de transacción
                <select
                  value={form.type}
                  onChange={(event) => {
                    const nextType = event.target.value as TransactionType;
                    setForm((current) => {
                      const nextForm = { ...current, type: nextType };

                      if (!isAssetTransactionType(nextType)) {
                        if (!nextForm.price && nextForm.quantity) {
                          nextForm.price = nextForm.quantity;
                        }
                        nextForm.quantity = "1";
                        nextForm.assetId = "";
                      } else if (!nextForm.quantity) {
                        nextForm.quantity = "1";
                      }

                      return nextForm;
                    });
                  }}
                  className="control modal-field-input"
                >
                  {allTransactionTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {isAssetTransactionType(form.type) ? (
                <label className="modal-field">
                  Activo
                  <div className="modal-inline-controls modal-inline-controls--asset-picker">
                    <input
                      type="search"
                      value={assetSelectorQuery}
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        setAssetSelectorQuery(nextQuery);

                        const query = normalizeSearchText(nextQuery);
                        const nextMatches = query
                          ? sortedAssets.filter(
                              (asset) =>
                                normalizeSearchText(asset.symbol).includes(query) ||
                                normalizeSearchText(asset.name).includes(query)
                            )
                          : sortedAssets;

                        if (!nextMatches.length) {
                          setForm((current) => ({ ...current, assetId: "" }));
                          return;
                        }

                        setForm((current) => {
                          if (!nextQuery.trim() || current.assetId === nextMatches[0].id) {
                            return current;
                          }

                          return { ...current, assetId: nextMatches[0].id };
                        });
                      }}
                      placeholder="Buscar"
                      className="control modal-field-input"
                    />
                    <select
                      value={form.assetId}
                      onChange={(event) => setForm((current) => ({ ...current, assetId: event.target.value }))}
                      className="control modal-field-input"
                    >
                      <option value="">Seleccioná un activo</option>
                      {selectableAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.symbol} - {asset.name} - {formatCurrency(asset.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              ) : null}

              {isAssetTransactionType(form.type) ? (
                <>
                  <div className="modal-form-grid modal-form-grid--single">
                    <label className="modal-field">
                      Fecha
                      <input
                        type="date"
                        value={form.date}
                        onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                        className="control modal-field-input-date"
                      />
                    </label>
                  </div>

                  <div className="modal-form-grid modal-form-grid--pair">
                    <label className="modal-field">
                      Cantidad
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={form.quantity}
                        onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                        className="control modal-field-input"
                      />
                    </label>

                    <label className="modal-field">
                      Precio
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={form.price}
                        onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                        className="control modal-field-input"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <div className="modal-form-grid">
                  <label className="modal-field">
                    Fecha
                    <input
                      type="date"
                      value={form.date}
                      onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                      className="control modal-field-input"
                    />
                  </label>

                  <label className="modal-field">
                    Monto
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={form.price}
                      onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                      className="control modal-field-input"
                    />
                  </label>
                </div>
              )}

              <label className="modal-field">
                Notas
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="control modal-field-input modal-textarea modal-textarea--compact"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={closeModal} className="button button-secondary modal-button">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="button button-primary modal-button">
                {saving ? "Guardando..." : "Agregar transacción"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

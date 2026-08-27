"use client";

import { useMemo, useState } from "react";
import type { Asset, Portfolio, Transaction, TransactionType } from "@/lib/portfolio";

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}USD ${formatter.format(Math.abs(value))}`;
}

const transactionTypes: Array<{ value: TransactionType; label: string }> = [
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
  { value: "cash_in", label: "Ingreso" },
  { value: "cash_out", label: "Egreso" },
];

const assetOnlyTransactionTypes: Array<{ value: TransactionType; label: string }> = [
  { value: "buy", label: "Compra" },
  { value: "sell", label: "Venta" },
];

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTransactionForm(initialDate = getTodayDateInputValue()) {
  return {
    type: "buy" as TransactionType,
    assetId: "",
    date: initialDate,
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

function getTransactionTypeLabel(type: TransactionType) {
  return transactionTypes.find((item) => item.value === type)?.label ?? type;
}

function filterAssetsByQuery(assets: Asset[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return assets;
  }

  return assets.filter((asset) => {
    return (
      normalizeSearchText(asset.symbol).includes(normalizedQuery) ||
      normalizeSearchText(asset.name).includes(normalizedQuery) ||
      normalizeSearchText(asset.type).includes(normalizedQuery)
    );
  });
}

interface TransactionRow extends Transaction {
  assetId: string;
  assetName: string;
  assetSymbol: string;
  assetType: Asset["type"];
}

interface PortfolioTransactionsTableProps {
  portfolioId: string;
  portfolio: Portfolio;
  assets: Asset[];
  title: string;
  searchPlaceholder?: string;
  lockedAssetId?: string;
  hideSymbolColumn?: boolean;
  onPortfolioUpdated: (next: Portfolio) => void;
}

export default function PortfolioTransactionsTable({
  portfolioId,
  portfolio,
  assets,
  title,
  searchPlaceholder = "Buscar activo",
  lockedAssetId,
  hideSymbolColumn = false,
  onPortfolioUpdated,
}: PortfolioTransactionsTableProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRow | null>(null);
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm());
  const [assetSelectorQuery, setAssetSelectorQuery] = useState("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "symbol" | "price" | "quantity">("date");
  const [transactionsPerPage, setTransactionsPerPage] = useState<10 | 20 | 50 | 100>(20);
  const [currentPage, setCurrentPage] = useState(1);

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
    return filterAssetsByQuery(sortedAssets, assetSelectorQuery);
  }, [assetSelectorQuery, sortedAssets]);

  const transactionTypeOptions = lockedAssetId ? assetOnlyTransactionTypes : transactionTypes;

  const transactionRows = useMemo<TransactionRow[]>(() => {
    return (portfolio.transactions ?? [])
      .filter((transaction) => {
        if (!lockedAssetId) {
          return true;
        }

        return transaction.assetId === lockedAssetId;
      })
      .map((transaction) => {
        const isAssetTransaction = isAssetTransactionType(transaction.type);

        return {
          ...transaction,
          assetId: transaction.assetId ?? "",
          assetName: transaction.assetName?.trim() || "Efectivo",
          assetSymbol: transaction.assetSymbol?.trim() || (isAssetTransaction ? "" : "Efectivo"),
          assetType: transaction.assetType || (isAssetTransaction ? "other" : "cash"),
        };
      });
  }, [lockedAssetId, portfolio.transactions]);

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

  const filteredTransactions = useMemo(() => {
    const query = transactionSearchQuery.trim().toLowerCase();

    if (!query) {
      return sortedTransactions;
    }

    return sortedTransactions.filter((transaction) => {
      return (
        transaction.assetSymbol.toLowerCase().includes(query) ||
        transaction.assetName.toLowerCase().includes(query) ||
        transaction.assetType.toLowerCase().includes(query) ||
        transaction.date.toLowerCase().includes(query)
      );
    });
  }, [sortedTransactions, transactionSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / transactionsPerPage));
  const boundedCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (boundedCurrentPage - 1) * transactionsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);
  }, [boundedCurrentPage, filteredTransactions, transactionsPerPage]);

  const getTransactionAmount = (transaction: TransactionRow) => {
    if (!isAssetTransactionType(transaction.type)) {
      const amount = Number(transaction.price ?? 0);
      return Number.isFinite(amount) ? amount : null;
    }

    const quantity = Number(transaction.quantity);
    if (!Number.isFinite(quantity)) {
      return null;
    }

    return Number(transaction.price ?? 0) * quantity;
  };

  const openCreateTransactionModal = () => {
    setEditingTransaction(null);
    setAssetSelectorQuery("");
    setTransactionForm({
      ...emptyTransactionForm(),
      assetId: lockedAssetId || "",
      type: "buy",
    });
    setError(null);
    setIsTransactionModalOpen(true);
  };

  const openEditTransactionModal = (transaction: TransactionRow) => {
    setEditingTransaction(transaction);
    setAssetSelectorQuery("");
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
    setAssetSelectorQuery("");
    setTransactionForm(emptyTransactionForm());
    setError(null);
  };

  const handleSaveTransaction = async () => {
    const isAssetTransaction = isAssetTransactionType(transactionForm.type);
    const assetId = lockedAssetId || transactionForm.assetId;
    const quantity = parsePositiveDecimalInput(transactionForm.quantity);
    const price = parsePositiveDecimalInput(transactionForm.price);
    const selectedAsset = isAssetTransaction ? assets.find((asset) => asset.id === assetId) : null;

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
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: editingTransaction ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "transaction",
          transactionId: editingTransaction?.id,
          type: transactionForm.type,
          assetId: isAssetTransaction ? assetId : undefined,
          assetSymbol: isAssetTransaction ? selectedAsset?.symbol || "" : "Efectivo",
          assetName: isAssetTransaction ? selectedAsset?.name || "" : "Efectivo",
          assetType: isAssetTransaction ? selectedAsset?.type || "stock" : "cash",
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
      onPortfolioUpdated(updatedPortfolio);
      closeTransactionModal();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    const confirmed = window.confirm("¿Querés eliminar esta transacción?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "transaction", transactionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "No se pudo eliminar la transacción.");
      }

      const updatedPortfolio = (await response.json()) as Portfolio;
      onPortfolioUpdated(updatedPortfolio);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <section className="card portfolio-detail-section">
      <div className="portfolio-detail-section-header portfolio-detail-transactions-header">
        <div>
          <h2 className="portfolio-detail-section-title">{title}</h2>
        </div>
        <div className="portfolio-detail-toolbar portfolio-detail-transactions-toolbar">
          <div className="portfolio-detail-search">
            <svg viewBox="0 0 24 24" className="portfolio-detail-search-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={transactionSearchQuery}
              onChange={(event) => {
                setTransactionSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="control portfolio-detail-search-input"
            />
          </div>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as "date" | "symbol" | "price" | "quantity");
              setCurrentPage(1);
            }}
            className="control portfolio-detail-select"
          >
            <option value="date">Fecha</option>
            {!hideSymbolColumn ? <option value="symbol">Símbolo</option> : null}
            <option value="price">Precio</option>
            <option value="quantity">Cantidad</option>
          </select>
          <select
            value={transactionsPerPage}
            onChange={(event) => {
              setTransactionsPerPage(Number(event.target.value) as 10 | 20 | 50 | 100);
              setCurrentPage(1);
            }}
            className="control portfolio-detail-select"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
          <button
            type="button"
            onClick={openCreateTransactionModal}
            aria-label="Agregar transacción"
            title="Agregar transacción"
            className="button button-primary portfolio-detail-add-button"
          >
            <svg viewBox="0 0 24 24" className="portfolio-detail-add-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {error ? <div className="alert-error mt-4">{error}</div> : null}

      {filteredTransactions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 sm:mt-6 sm:p-6">
          {transactionSearchQuery.trim() ? "No hay transacciones para ese filtro." : "No hay transacciones cargadas aún."}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-700/80 sm:mt-6">
          <table className="min-w-[720px] w-full border-collapse text-left">
            <thead className="bg-[#111c30] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
              <tr>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Tipo</th>
                {!hideSymbolColumn ? <th className="px-3 py-3">Símbolo</th> : null}
                <th className="px-3 py-3 text-right">Cantidad</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200 sm:text-sm">
              {paginatedTransactions.map((transaction) => {
                const amount = getTransactionAmount(transaction);

                return (
                  <tr key={transaction.id}>
                    <td className="px-3 py-3">{transaction.date}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {getTransactionTypeLabel(transaction.type)}
                      </span>
                    </td>
                    {!hideSymbolColumn ? <td className="px-3 py-3">{transaction.assetSymbol || "-"}</td> : null}
                    <td className="px-3 py-3 text-right">{transaction.quantity ?? "-"}</td>
                    <td className="px-3 py-3 text-right">{formatCurrency(transaction.price)}</td>
                    <td className="px-3 py-3 text-right">{amount === null ? "-" : formatCurrency(amount)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditTransactionModal(transaction)}
                          aria-label="Editar transacción"
                          title="Editar transacción"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-[#0f172a] text-sky-400 transition hover:border-slate-500 hover:bg-[#162238]"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          aria-label="Eliminar transacción"
                          title="Eliminar transacción"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-[#0f172a] text-rose-400 transition hover:border-rose-500/70 hover:bg-rose-500/10"
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredTransactions.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3">
          <p className="text-xs text-slate-400 sm:text-sm">
            Página {boundedCurrentPage} de {totalPages} ({filteredTransactions.length} transacciones)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.max(1, Math.min(value, totalPages) - 1))}
              disabled={boundedCurrentPage === 1}
              className="rounded-lg border border-slate-700 bg-[#111c30] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1))}
              disabled={boundedCurrentPage >= totalPages}
              className="rounded-lg border border-slate-700 bg-[#111c30] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      {isTransactionModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{editingTransaction ? "Editar transacción" : "Nueva transacción"}</h3>
              </div>
              <button
                type="button"
                onClick={closeTransactionModal}
                aria-label="Cerrar"
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-form">
              <label className="modal-field">
                Tipo de transacción
                <select
                  value={transactionForm.type}
                  onChange={(event) => {
                    const nextType = event.target.value as TransactionType;
                    setTransactionForm((current) => {
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

                      if (lockedAssetId) {
                        nextForm.assetId = lockedAssetId;
                      }

                      return nextForm;
                    });
                  }}
                  className="control modal-field-input"
                >
                  {transactionTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {isAssetTransactionType(transactionForm.type) ? (
                lockedAssetId ? (
                  <label className="modal-field">
                    Activo
                    <input
                      disabled
                      value={assets.find((asset) => asset.id === lockedAssetId)?.symbol || "Activo"}
                      className="control modal-field-input mt-2"
                    />
                  </label>
                ) : (
                  <label className="modal-field">
                    Activo
                    <div className="modal-inline-controls modal-inline-controls--asset-picker">
                      <input
                        type="search"
                        value={assetSelectorQuery}
                        onChange={(event) => {
                          const nextQuery = event.target.value;
                          setAssetSelectorQuery(nextQuery);

                          const nextMatches = filterAssetsByQuery(sortedAssets, nextQuery);
                          if (!nextMatches.length) {
                            setTransactionForm((current) => ({ ...current, assetId: "" }));
                            return;
                          }

                          setTransactionForm((current) => {
                            if (!nextQuery.trim()) {
                              return current;
                            }

                            if (current.assetId === nextMatches[0].id) {
                              return current;
                            }

                            return {
                              ...current,
                              assetId: nextMatches[0].id,
                            };
                          });
                        }}
                        placeholder="Buscar"
                        className="control modal-field-input"
                      />
                      <select
                        value={transactionForm.assetId}
                        onChange={(event) => setTransactionForm((current) => ({ ...current, assetId: event.target.value }))}
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
                )
              ) : null}

              {isAssetTransactionType(transactionForm.type) ? (
                <>
                  <div className="modal-form-grid modal-form-grid--single">
                    <label className="modal-field">
                      Fecha
                      <input
                        type="date"
                        value={transactionForm.date}
                        onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))}
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
                        value={transactionForm.quantity}
                        onChange={(event) => setTransactionForm((current) => ({ ...current, quantity: event.target.value }))}
                        className="control modal-field-input"
                      />
                    </label>

                    <label className="modal-field">
                      Precio
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={transactionForm.price}
                        onChange={(event) => setTransactionForm((current) => ({ ...current, price: event.target.value }))}
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
                      value={transactionForm.date}
                      onChange={(event) => setTransactionForm((current) => ({ ...current, date: event.target.value }))}
                      className="control modal-field-input"
                    />
                  </label>

                  <label className="modal-field">
                    Monto
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={transactionForm.price}
                      onChange={(event) => setTransactionForm((current) => ({ ...current, price: event.target.value }))}
                      className="control modal-field-input"
                    />
                  </label>
                </div>
              )}

              <label className="modal-field">
                Notas
                <textarea
                  value={transactionForm.notes}
                  onChange={(event) => setTransactionForm((current) => ({ ...current, notes: event.target.value }))}
                  className="control modal-field-input modal-textarea modal-textarea--compact"
                  placeholder="Opcional"
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeTransactionModal}
                className="button button-secondary modal-button"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTransaction}
                disabled={saving}
                className="button button-primary modal-button"
              >
                {saving ? "Guardando..." : editingTransaction ? "Guardar cambios" : "Agregar transacción"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

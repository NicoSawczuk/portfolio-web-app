"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DollarQuote } from "@/lib/dollar-quote-db";

interface HistoryResponse {
  current: DollarQuote | null;
  history: DollarQuote[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
}

interface TipoCambioClientProps {
  initialCurrent: DollarQuote | null;
  initialHistory: DollarQuote[];
  initialTotal: number;
  initialPageSize?: number;
  initialPermissions?: DollarPermissions;
}

export interface DollarPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function formatARS(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-$ " : "$ ";
  return `${prefix}${formatter.format(Math.abs(value))}`;
}

function formatDatetime(value?: string) {
  if (!value) {
    return "Sin datos";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin datos";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function parseMonetaryInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  // Acepta "1.485,00" (es-AR) o "1485.00".
  const hasComma = trimmed.includes(",");
  const normalized = hasComma ? trimmed.replace(/\./g, "").replace(/,/g, ".") : trimmed.replace(/,/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatInputPreview(value: string) {
  const parsed = parseMonetaryInput(value);
  return parsed === null ? null : formatARS(parsed);
}

export default function TipoCambioClient({
  initialCurrent,
  initialHistory,
  initialTotal,
  initialPageSize = 20,
  initialPermissions = { canCreate: false, canEdit: false, canDelete: false },
}: TipoCambioClientProps) {
  const [current, setCurrent] = useState<DollarQuote | null>(initialCurrent);
  const [history, setHistory] = useState<DollarQuote[]>(initialHistory);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(() => Math.max(1, Math.ceil(initialTotal / initialPageSize)));
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [buyInput, setBuyInput] = useState("");
  const [sellInput, setSellInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSizeRef = useRef<number>(initialPageSize);
  const searchTermRef = useRef<string>("");

  const fetchHistory = useCallback(async (nextPage: number, nextPageSize: number, nextSearch: string) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(nextPageSize),
        search: nextSearch,
      });
      const response = await fetch(`/api/dollar-quotes?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo cargar el histórico.");
      }
      const data = (await response.json()) as HistoryResponse;
      setCurrent(data.current);
      setHistory(data.history);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    const term = value.trim();
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(term);
      searchTermRef.current = term;
      fetchHistory(1, pageSizeRef.current, term);
    }, 350);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    pageSizeRef.current = next;
    fetchHistory(1, next, searchTermRef.current);
  };

  const handleRefresh = async () => {
    if (!initialPermissions.canCreate) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    if (refreshing) {
      return;
    }
    setRefreshing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo actualizar la cotización.");
      }
      setCurrent(data.quote as DollarQuote);
      if (data.created) {
        setNotice({ kind: "success", text: "Cotización actualizada." });
      } else {
        setNotice({ kind: "success", text: "La cotización ya estaba actualizada." });
      }
      await fetchHistory(1, pageSize, debouncedSearch);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setRefreshing(false);
    }
  };

  const openEditor = () => {
    if (!initialPermissions.canCreate) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    setBuyInput(current ? String(current.buy) : "");
    setSellInput(current ? String(current.sell) : "");
    setNotice(null);
    setEditing(true);
  };

  const openEditorFromQuote = (quote: DollarQuote) => {
    if (!initialPermissions.canEdit) {
      setNotice({ kind: "error", text: "No tenés permiso para editar cotizaciones." });
      return;
    }
    // El histórico es inmutable: precarga los valores de la fila en el
    // editor manual. Al guardar se crea un registro nuevo si cambió.
    setBuyInput(String(quote.buy));
    setSellInput(String(quote.sell));
    setNotice(null);
    setEditing(true);
    requestAnimationFrame(() => {
      document.getElementById("dollar-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const closeEditor = () => {
    setEditing(false);
    setBuyInput("");
    setSellInput("");
  };

  const handleSaveManual = async () => {
    if (!initialPermissions.canCreate) {
      setNotice({ kind: "error", text: "No tenés permiso para agregar cotizaciones." });
      return;
    }
    const buy = parseMonetaryInput(buyInput);
    const sell = parseMonetaryInput(sellInput);
    if (buy === null || sell === null) {
      setNotice({ kind: "error", text: "Compra y venta son obligatorios, numéricos y mayores que 0." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual", buy, sell }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar la cotización.");
      }
      setCurrent(data.quote as DollarQuote);
      if (data.created) {
        setNotice({ kind: "success", text: "Cotización guardada." });
      } else {
        setNotice({ kind: "success", text: "Sin cambios: no se generó un nuevo registro." });
      }
      closeEditor();
      await fetchHistory(1, pageSize, debouncedSearch);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!initialPermissions.canDelete) {
      setNotice({ kind: "error", text: "No tenés permiso para eliminar cotizaciones." });
      return;
    }
    const confirmed = window.confirm("¿Querés eliminar esta cotización del histórico?");
    if (!confirmed || deletingId) {
      return;
    }
    setDeletingId(id);
    setNotice(null);
    try {
      const response = await fetch("/api/dollar-quotes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo eliminar la cotización.");
      }
      setNotice({ kind: "success", text: "Cotización eliminada." });
      await fetchHistory(page, pageSize, debouncedSearch);
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setDeletingId(null);
    }
  };

  const buyPreview = formatInputPreview(buyInput);
  const sellPreview = formatInputPreview(sellInput);

  return (
    <>
      {notice ? (
        <div className={notice.kind === "success" ? "alert-success" : "alert-error"} role="status">
          {notice.text}
        </div>
      ) : null}

      <section className="card card--panel" aria-label="Cotización actual">
        <div className="dollar-current-head">
          <div className="dollar-title-row">
            <h2 className="card-title">Dólar Oficial</h2>
            <span className="dollar-badge-actual">Actual</span>
          </div>
          <div className="dollar-update-row">
            <span className="dollar-update-label">
              <svg viewBox="0 0 24 24" className="dollar-inline-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              Última actualización
              <strong>{formatDatetime(current?.datetime)}</strong>
            </span>
            {initialPermissions.canCreate ? (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="button button-secondary dollar-refresh-button"
              >
                <svg viewBox="0 0 24 24" className={`dollar-inline-icon ${refreshing ? "spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
                <span className="dollar-refresh-label">{refreshing ? "Actualizando..." : "Actualizar ahora"}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="dollar-values">
          <div className="dollar-value">
            <p className="dollar-value-label">Compra</p>
            <p className="dollar-value-number">{current ? formatARS(current.buy) : "—"}</p>
          </div>
          <div className="dollar-value dollar-value--divider">
            <p className="dollar-value-label">Venta</p>
            <p className="dollar-value-number">{current ? formatARS(current.sell) : "—"}</p>
          </div>
          <div className="dollar-edit-wrap">
            {!editing && initialPermissions.canCreate ? (
              <button type="button" onClick={openEditor} className="button button-primary dollar-edit-button">
                <svg viewBox="0 0 24 24" className="dollar-inline-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Editar cotización
              </button>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="dollar-editor" id="dollar-editor">
            <div className="dollar-editor-head">
              <div>
                <h3 className="dollar-editor-title">Editar cotización</h3>
                <p className="card-description">Ingresá manualmente los valores de compra y venta del dólar oficial.</p>
              </div>
              <div className="dollar-editor-actions dollar-editor-actions--top">
                <button type="button" onClick={closeEditor} className="button button-secondary dollar-editor-button">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveManual}
                  disabled={saving}
                  className="button button-primary dollar-editor-button"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
            <div className="dollar-editor-grid">
              <label className="dollar-field">
                Compra (ARS)
                <span className="dollar-input-wrap">
                  <span aria-hidden="true" className="dollar-input-prefix">$</span>
                  <input
                    value={buyInput}
                    onChange={(event) => setBuyInput(event.target.value)}
                    inputMode="decimal"
                    placeholder="1.485,00"
                    className="control dollar-input"
                    aria-label="Compra en ARS"
                  />
                </span>
                {buyPreview ? <span className="dollar-field-hint">{buyPreview}</span> : null}
              </label>
              <label className="dollar-field">
                Venta (ARS)
                <span className="dollar-input-wrap">
                  <span aria-hidden="true" className="dollar-input-prefix">$</span>
                  <input
                    value={sellInput}
                    onChange={(event) => setSellInput(event.target.value)}
                    inputMode="decimal"
                    placeholder="1.495,00"
                    className="control dollar-input"
                    aria-label="Venta en ARS"
                  />
                </span>
                {sellPreview ? <span className="dollar-field-hint">{sellPreview}</span> : null}
              </label>
            </div>
            <div className="dollar-editor-actions dollar-editor-actions--bottom">
              <button type="button" onClick={closeEditor} className="button button-secondary dollar-editor-button">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveManual}
                disabled={saving}
                className="button button-primary dollar-editor-button"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card portfolio-detail-section asset-tx-section" aria-label="Histórico de cotizaciones">
        <div className="portfolio-detail-section-header portfolio-detail-transactions-header">
          <div>
            <h2 className="portfolio-detail-section-title">Histórico de cotizaciones</h2>
          </div>
          <div className="portfolio-detail-toolbar portfolio-detail-transactions-toolbar">
            <div className="portfolio-detail-search">
              <svg viewBox="0 0 24 24" className="portfolio-detail-search-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Buscar por fecha"
                aria-label="Buscar por fecha"
                className="control portfolio-detail-search-input"
              />
            </div>
            <select
              value={pageSize}
              onChange={(event) => handlePageSizeChange(Number(event.target.value))}
              className="control portfolio-detail-select"
              aria-label="Cantidad por página"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
          </div>
        </div>

        {historyError ? <div className="alert-error mt-4">{historyError}</div> : null}

        {loadingHistory ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 sm:mt-6 sm:p-6">
            Cargando cotizaciones...
          </div>
        ) : history.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 sm:mt-6 sm:p-6">
            Todavía no hay cotizaciones registradas.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-700/80 sm:mt-6">
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead className="bg-[#111c30] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.2em]">
                <tr>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3 text-right">Compra</th>
                  <th className="px-3 py-3 text-right">Venta</th>
                  <th className="px-3 py-3">Origen</th>
                  <th className="px-3 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs text-slate-200 sm:text-sm">
                {history.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-3 py-3">{formatDatetime(quote.datetime)}</td>
                    <td className="px-3 py-3 text-right">{formatARS(quote.buy)}</td>
                    <td className="px-3 py-3 text-right">{formatARS(quote.sell)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {quote.source === "manual" ? "Manual" : "API"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center gap-2">
                        {initialPermissions.canEdit ? (
                          <button
                            type="button"
                            onClick={() => openEditorFromQuote(quote)}
                            aria-label={`Editar cotización ${formatDatetime(quote.datetime)}`}
                            title="Editar cotización"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-[#0f172a] text-sky-400 transition hover:border-slate-500 hover:bg-[#162238]"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        ) : null}
                        {initialPermissions.canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(quote.id)}
                            disabled={deletingId === quote.id}
                            aria-label={`Eliminar cotización ${formatDatetime(quote.datetime)}`}
                            title="Eliminar cotización"
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
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3">
            <p className="text-xs text-slate-400 sm:text-sm">
              Página {page} de {totalPages} ({total} {total === 1 ? "cotización" : "cotizaciones"})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, page - 1);
                  setPage(next);
                  fetchHistory(next, pageSize, debouncedSearch);
                }}
                disabled={page <= 1 || loadingHistory}
                className="rounded-lg border border-slate-700 bg-[#111c30] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(totalPages, page + 1);
                  setPage(next);
                  fetchHistory(next, pageSize, debouncedSearch);
                }}
                disabled={page >= totalPages || loadingHistory}
                className="rounded-lg border border-slate-700 bg-[#111c30] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

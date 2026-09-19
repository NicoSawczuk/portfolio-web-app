"use client";

import { useEffect, useRef, useState } from "react";
import type { DollarQuote } from "@/lib/dollar-quote-db";
import { formatARS, formatDatetime } from "./dollar-quote-utils";

interface HistoryTableClientProps {
  history: DollarQuote[];
  total: number;
  page: number;
  pageSize: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (quote: DollarQuote) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (search: string) => void;
  loading: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function HistoryTableClient({
  history,
  total,
  page,
  pageSize,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  loading,
}: HistoryTableClientProps) {
  const [search, setSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    const term = value.trim();
    searchTimer.current = setTimeout(() => {
      onSearchChange(term);
    }, 350);
  };

  const handlePageChange = (nextPage: number) => {
    onPageChange(nextPage);
  };

  const handlePageSizeChange = (next: number) => {
    onPageSizeChange(next);
  };

  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 sm:mt-6 sm:p-6">
        Cargando cotizaciones...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400 sm:mt-6 sm:p-6">
        Todavía no hay cotizaciones registradas.
      </div>
    );
  }

  return (
    <>
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
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(quote)}
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
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => onDelete(quote.id)}
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

        {total > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:mt-4 sm:gap-3">
            <p className="text-xs text-slate-400 sm:text-sm">
              Página {page} de {Math.max(1, Math.ceil(total / pageSize))} ({total} {total === 1 ? "cotización" : "cotizaciones"})
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border border-slate-700 bg-[#111c30] px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-[#162238] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(Math.max(1, Math.ceil(total / pageSize)), page + 1))}
                disabled={page >= Math.max(1, Math.ceil(total / pageSize)) || loading}
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
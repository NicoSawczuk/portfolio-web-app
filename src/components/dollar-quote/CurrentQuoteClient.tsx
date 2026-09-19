"use client";

import type { DollarQuote } from "@/lib/dollar-quote-db";
import { formatARS, formatDatetime } from "./dollar-quote-utils";

interface CurrentQuoteClientProps {
  current: DollarQuote | null;
  refreshing: boolean;
  onRefresh: () => void;
  canCreate: boolean;
  onOpenEditor: () => void;
}

export default function CurrentQuoteClient({
  current,
  refreshing,
  onRefresh,
  canCreate,
  onOpenEditor,
}: CurrentQuoteClientProps) {
  return (
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
          {canCreate ? (
            <button
              type="button"
              onClick={onRefresh}
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
          {!canCreate ? null : (
            <button type="button" onClick={onOpenEditor} className="button button-primary dollar-edit-button">
              <svg viewBox="0 0 24 24" className="dollar-inline-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Editar cotización
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
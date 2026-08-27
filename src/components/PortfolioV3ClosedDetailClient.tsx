"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Asset, Portfolio } from "@/lib/portfolio";
import { buildPortfolioPositionsAnalytics } from "@/lib/portfolio-positions";
import {
  assetTypeLabels,
  formatCurrency,
  formatIsoDate,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
  getAssetTypeChipClass,
  getAssetColor,
} from "@/lib/portfolio-format";
import PortfolioTransactionsTable from "@/components/PortfolioTransactionsTable";

interface PortfolioV3ClosedDetailClientProps {
  portfolioId: string;
  assetId: string;
  initialPortfolio: Portfolio;
  initialAssets: Asset[];
}

export default function PortfolioV3ClosedDetailClient({
  portfolioId,
  assetId,
  initialPortfolio,
  initialAssets,
}: PortfolioV3ClosedDetailClientProps) {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const analytics = useMemo(() => buildPortfolioPositionsAnalytics(portfolio, initialAssets), [initialAssets, portfolio]);

  const closedPosition = analytics.closedPositions.find((position) => position.assetId === assetId);

  if (!closedPosition) {
    return (
      <main className="page">
        <div className="page-container">
          <section className="card portfolio-detail-section">
            <div className="card-content">
              <h1 className="card-title">Posición cerrada no encontrada</h1>
              <p className="card-description mt-2">La posición puede no estar completamente cerrada actualmente.</p>
              <Link href={`/portfolios/${portfolioId}`} className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:text-sky-300">
                Volver al portfolio
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const color = getAssetColor(closedPosition.assetId, 0);

  return (
    <main className="page">
      <div className="page-container">
        <section className="card portfolio-detail-section">
          <div className="card-content">
            <Link href={`/portfolios/${portfolioId}`} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              <span aria-hidden="true">←</span>
              Volver
            </Link>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  <h1 className="text-2xl font-semibold text-white">{closedPosition.name}</h1>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-400">{closedPosition.symbol}</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAssetTypeChipClass(closedPosition.type)}`}>
                    {assetTypeLabels[closedPosition.type]}
                  </span>
                </div>
              </div>
              <span className="rounded-full border border-slate-700 bg-[#0f172a] px-3 py-1 text-xs font-medium text-slate-300">
                CERRADA
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700/80 bg-[#111c30] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-400">Resultado total</p>
                  <p className={`mt-1 text-xl font-semibold ${closedPosition.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatSignedCurrency(closedPosition.realizedPnl)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Rendimiento realizado</p>
                  <p className={`mt-1 text-xl font-semibold ${closedPosition.realizedPnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatPercent(closedPosition.realizedPnlPct)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Capital invertido</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(closedPosition.investedCapital)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700/70 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Cantidad vendida</p>
                  <p className="mt-1 text-sm text-slate-100">{formatNumber(closedPosition.quantitySold)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Precio prom. compra</p>
                  <p className="mt-1 text-sm text-slate-100">{formatCurrency(closedPosition.avgBuyPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Precio prom. venta</p>
                  <p className="mt-1 text-sm text-slate-100">{formatCurrency(closedPosition.avgSellPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Fecha de cierre</p>
                  <p className="mt-1 text-sm text-slate-100">{formatIsoDate(closedPosition.closedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tipo</p>
                  <p className="mt-1 text-sm text-slate-100">{assetTypeLabels[closedPosition.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Símbolo</p>
                  <p className="mt-1 text-sm text-slate-100">{closedPosition.symbol}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PortfolioTransactionsTable
          portfolioId={portfolioId}
          portfolio={portfolio}
          assets={initialAssets}
          title="Transacciones de esta posición"
          searchPlaceholder="Buscar en transacciones"
          lockedAssetId={closedPosition.assetId}
          hideSymbolColumn
          onPortfolioUpdated={setPortfolio}
        />
      </div>
    </main>
  );
}

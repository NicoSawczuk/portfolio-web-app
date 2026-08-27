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
  formatUnsignedPercent,
  getAssetTypeChipClass,
  getAssetColor,
} from "@/lib/portfolio-format";
import PortfolioTransactionsTable from "@/components/PortfolioTransactionsTable";

interface PortfolioV3AssetDetailClientProps {
  portfolioId: string;
  symbol: string;
  initialPortfolio: Portfolio;
  initialAssets: Asset[];
}

export default function PortfolioV3AssetDetailClient({
  portfolioId,
  symbol,
  initialPortfolio,
  initialAssets,
}: PortfolioV3AssetDetailClientProps) {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const analytics = useMemo(() => buildPortfolioPositionsAnalytics(portfolio, initialAssets), [initialAssets, portfolio]);

  const openPosition = analytics.openPositions.find(
    (position) => position.symbol.toLowerCase() === symbol.toLowerCase()
  );

  if (!openPosition) {
    return (
      <main className="page">
        <div className="page-container">
          <section className="card portfolio-detail-section">
            <div className="card-content">
              <h1 className="card-title">Activo no encontrado en posiciones abiertas</h1>
              <p className="card-description mt-2">
                El activo puede estar cerrado o no tener posición abierta actualmente.
              </p>
              <Link href={`/portfolios/${portfolioId}`} className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:text-sky-300">
                Volver al portfolio
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const color = getAssetColor(openPosition.assetId, 0);
  const formatCurrencyByVisibility = (value: number) => formatCurrency(value);

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
                  <h1 className="text-2xl font-semibold text-white">{openPosition.name}</h1>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-400">{openPosition.symbol}</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAssetTypeChipClass(openPosition.type)}`}>
                    {assetTypeLabels[openPosition.type]}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700/80 bg-[#111c30] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-400">Valor actual</p>
                  <p className="mt-1 text-xl font-semibold text-white">{formatCurrencyByVisibility(openPosition.marketValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Ganancia total</p>
                  <p className={`mt-1 text-xl font-semibold ${openPosition.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatSignedCurrency(openPosition.pnl)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Rendimiento</p>
                  <p className={`mt-1 text-xl font-semibold ${openPosition.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatPercent(openPosition.pnlPct)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-700/70 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400">Cantidad</p>
                  <p className="mt-1 text-sm text-slate-100">{formatNumber(openPosition.quantity)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Precio actual</p>
                  <p className="mt-1 text-sm text-slate-100">{formatCurrencyByVisibility(openPosition.currentPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Precio promedio de compra</p>
                  <p className="mt-1 text-sm text-slate-100">{formatCurrencyByVisibility(openPosition.avgBuyPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Valor invertido</p>
                  <p className="mt-1 text-sm text-slate-100">{formatCurrencyByVisibility(openPosition.investedValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">% del portfolio</p>
                  <p className="mt-1 text-sm text-slate-100">{formatUnsignedPercent(openPosition.sharePct)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Tipo</p>
                  <p className="mt-1 text-sm text-slate-100">{assetTypeLabels[openPosition.type]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Fecha primera compra</p>
                  <p className="mt-1 text-sm text-slate-100">{formatIsoDate(openPosition.firstBuyDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Fecha última compra</p>
                  <p className="mt-1 text-sm text-slate-100">{formatIsoDate(openPosition.lastBuyDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PortfolioTransactionsTable
          portfolioId={portfolioId}
          portfolio={portfolio}
          assets={initialAssets}
          title="Transacciones de este activo"
          searchPlaceholder="Buscar en transacciones"
          lockedAssetId={openPosition.assetId}
          hideSymbolColumn
          onPortfolioUpdated={setPortfolio}
        />
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Asset, Portfolio } from "@/lib/portfolio";
import { buildPortfolioPositionsAnalytics } from "@/lib/portfolio-positions";
import { getPortfolioSummary } from "@/lib/portfolio-summary";
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
import PortfolioValuationCard from "@/components/PortfolioValuationCard";
import AddTransactionButton from "@/components/AddTransactionButton";

interface PortfolioV3MainClientProps {
  portfolioId: string;
  initialPortfolio: Portfolio;
  initialAssets: Asset[];
}

export default function PortfolioV3MainClient({ portfolioId, initialPortfolio, initialAssets }: PortfolioV3MainClientProps) {
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [showAmounts, setShowAmounts] = useState(true);
  const [positionsSearchQuery, setPositionsSearchQuery] = useState("");

  const summary = useMemo(() => getPortfolioSummary(portfolio, initialAssets), [initialAssets, portfolio]);
  const analytics = useMemo(() => buildPortfolioPositionsAnalytics(portfolio, initialAssets), [initialAssets, portfolio]);

  const normalizeSearchText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filteredOpenPositions = useMemo(() => {
    const query = normalizeSearchText(positionsSearchQuery);
    if (!query) {
      return analytics.openPositions;
    }

    return analytics.openPositions.filter((position) => {
      return (
        normalizeSearchText(position.name).includes(query) ||
        normalizeSearchText(position.symbol).includes(query) ||
        normalizeSearchText(assetTypeLabels[position.type]).includes(query)
      );
    });
  }, [analytics.openPositions, positionsSearchQuery]);

  const filteredClosedPositions = useMemo(() => {
    const query = normalizeSearchText(positionsSearchQuery);
    if (!query) {
      return analytics.closedPositions;
    }

    return analytics.closedPositions.filter((position) => {
      return (
        normalizeSearchText(position.name).includes(query) ||
        normalizeSearchText(position.symbol).includes(query) ||
        normalizeSearchText(assetTypeLabels[position.type]).includes(query)
      );
    });
  }, [analytics.closedPositions, positionsSearchQuery]);

  const formatCurrencyByVisibility = (value: number) => (showAmounts ? formatCurrency(value) : "••••••");
  const formatPercentByVisibility = (value: number) => (showAmounts ? formatPercent(value) : "••••");
  const formatNumberByVisibility = (value: number, maxDigits = 6) => (showAmounts ? formatNumber(value, maxDigits) : "••••");

  return (
    <main className="page">
      <div className="page-container">
        <section className="card">
          <div className="card-header portfolio-detail-header">
            <div className="portfolio-detail-header-copy">
              <p className="eyebrow">Portfolio</p>
              <h1 className="card-title card-title--page">{initialPortfolio.name}</h1>
            </div>
            {summary ? (
              <div className="portfolio-detail-summary portfolio-detail-summary--header">
                <PortfolioValuationCard
                  totalMarketValue={summary.totalMarketValue}
                  totalPnl={summary.totalPnl}
                  totalPnlPct={summary.totalPnlPct}
                  showAmounts={showAmounts}
                  onToggleVisibility={() => setShowAmounts((value) => !value)}
                />
              </div>
            ) : null}
            {portfolio.description ? (
              <p className="card-description portfolio-detail-header-description">{portfolio.description}</p>
            ) : null}
          </div>
        </section>

        <section className="card portfolio-detail-section">
          <div className="portfolio-detail-section-header">
            <div className="flex w-full items-center justify-between gap-3 sm:contents">
              <h2 className="portfolio-detail-section-title">Posiciones</h2>
              <AddTransactionButton
                portfolioId={portfolioId}
                assets={initialAssets}
                onPortfolioUpdated={setPortfolio}
                buttonClassName="portfolio-add-transaction--mobile"
              />
            </div>
            <div className="portfolio-positions-controls">
              <div className="segmented-control">
                <button
                  type="button"
                  onClick={() => setActiveTab("open")}
                  className={`segmented-button ${activeTab === "open" ? "segmented-button--active" : ""}`}
                >
                  Abiertas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("closed")}
                  className={`segmented-button ${activeTab === "closed" ? "segmented-button--active" : ""}`}
                >
                  Cerradas
                </button>
              </div>
              <div className="portfolio-positions-search">
                <svg viewBox="0 0 24 24" className="portfolio-positions-search-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  value={positionsSearchQuery}
                  onChange={(event) => setPositionsSearchQuery(event.target.value)}
                  placeholder="Buscar posiciones"
                  className="control portfolio-positions-search-input"
                />
              </div>
              <AddTransactionButton
                portfolioId={portfolioId}
                assets={initialAssets}
                onPortfolioUpdated={setPortfolio}
                buttonClassName="portfolio-add-transaction--desktop"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3 sm:mt-6">
            {activeTab === "open" ? (
              filteredOpenPositions.length ? (
                filteredOpenPositions.map((position, index) => {
                  const color = getAssetColor(position.assetId, index);

                  return (
                    <Link
                      key={position.assetId}
                      href={`/portfolios/${portfolioId}/assets/${encodeURIComponent(position.symbol)}`}
                      className="block rounded-2xl border border-slate-700/80 bg-[#111c30] p-3 transition hover:border-slate-500/80 hover:bg-[#162238]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                            <p className="portfolio-asset-name-mobile text-base font-semibold leading-5 text-white">{position.name}</p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-400">{position.symbol}</p>
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAssetTypeChipClass(position.type)}`}>
                              {assetTypeLabels[position.type]}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 min-w-[7.5rem] text-right">
                          <p className="text-base font-semibold text-white">{formatCurrencyByVisibility(position.marketValue)}</p>
                          <p className={`text-sm font-semibold ${position.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {showAmounts ? formatSignedCurrency(position.pnl) : "••••••"}
                          </p>
                          <p className={`text-xs ${position.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                            {formatPercentByVisibility(position.pnlPct)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-700/70 pt-3 text-xs sm:text-sm">
                        <div>
                          <p className="text-slate-400">Cantidad</p>
                          <p className="mt-0.5 text-slate-100">{formatNumberByVisibility(position.quantity)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Precio actual</p>
                          <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.currentPrice)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Precio prom.</p>
                          <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.avgBuyPrice)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Valor invertido</p>
                          <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.investedValue)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">% del portfolio</p>
                          <p className="mt-0.5 text-slate-100">{showAmounts ? formatUnsignedPercent(position.sharePct) : "••••"}</p>
                        </div>
                        <div className="flex items-end justify-end text-slate-400">
                          <span className="text-xl leading-none">›</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  {positionsSearchQuery.trim()
                    ? "No hay posiciones abiertas que coincidan con la búsqueda."
                    : "No hay posiciones abiertas para mostrar."}
                </div>
              )
            ) : filteredClosedPositions.length ? (
              filteredClosedPositions.map((position, index) => {
                const color = getAssetColor(position.assetId, index);

                return (
                  <Link
                    key={position.assetId}
                    href={`/portfolios/${portfolioId}/closed/${position.assetId}`}
                    className="block rounded-2xl border border-slate-700/80 bg-[#111c30] p-3 transition hover:border-slate-500/80 hover:bg-[#162238]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                          <p className="portfolio-asset-name-mobile text-base font-semibold leading-5 text-white">{position.name}</p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-slate-400">{position.symbol}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAssetTypeChipClass(position.type)}`}>
                            {assetTypeLabels[position.type]}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 min-w-[7.5rem] text-right">
                        <p className={`text-base font-semibold ${position.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {showAmounts ? formatSignedCurrency(position.realizedPnl) : "••••••"}
                        </p>
                        <p className={`text-xs ${position.realizedPnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {formatPercentByVisibility(position.realizedPnlPct)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-700/70 pt-3 text-xs sm:grid-cols-5 sm:text-sm">
                      <div>
                        <p className="text-slate-400">Cantidad vendida</p>
                        <p className="mt-0.5 text-slate-100">{formatNumberByVisibility(position.quantitySold)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Precio prom. compra</p>
                        <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.avgBuyPrice)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Precio prom. venta</p>
                        <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.avgSellPrice)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Capital invertido</p>
                        <p className="mt-0.5 text-slate-100">{formatCurrencyByVisibility(position.investedCapital)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Fecha de cierre</p>
                        <p className="mt-0.5 text-slate-100">{formatIsoDate(position.closedAt)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                {positionsSearchQuery.trim()
                  ? "No hay posiciones cerradas que coincidan con la búsqueda."
                  : "No hay posiciones cerradas para mostrar."}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-700/70 pt-4">
            <Link
              href={`/portfolios/${portfolioId}/transactions`}
              className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 transition hover:text-sky-300"
            >
              Ver todas las transacciones
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

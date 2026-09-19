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
  formatUsdEquivalent,
  getAssetTypeChipClass,
  getAssetColor,
} from "@/lib/portfolio-format";
import PortfolioTransactionsTable from "@/components/PortfolioTransactionsTable";

interface PortfolioV3AssetDetailClientProps {
  portfolioId: string;
  symbol: string;
  initialPortfolio: Portfolio;
  initialAssets: Asset[];
  dollarQuoteSell?: number | null;
}

export default function PortfolioV3AssetDetailClient({
  portfolioId,
  symbol,
  initialPortfolio,
  initialAssets,
  dollarQuoteSell,
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
  const formatCurrencyByVisibility = (value: number) => formatCurrency(value, openPosition.currency);
  const isPositive = openPosition.pnl >= 0;
  const usdEquivalent = formatUsdEquivalent(openPosition.marketValue, openPosition.currency, dollarQuoteSell);

  return (
    <main className="page">
      <div className="page-container asset-detail-page">
        {/* Encabezado directamente sobre el fondo: sin card */}
        <div className="asset-detail-top">
          <Link href={`/portfolios/${portfolioId}`} className="asset-detail-back">
            <span aria-hidden="true">←</span>
            Volver
          </Link>

          <div className="asset-detail-heading">
            <span className="asset-detail-dot" style={{ backgroundColor: color }} />
            <h1 className="asset-detail-name">{openPosition.name}</h1>
            <p className="asset-detail-symbol">{openPosition.symbol}</p>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAssetTypeChipClass(openPosition.type)}`}>
              {assetTypeLabels[openPosition.type]}
            </span>
          </div>
        </div>

        {/* Resumen financiero: un único bloque plano, sin card anidada */}
        <section className="card portfolio-detail-section asset-detail-summary" aria-label="Resumen del activo">
          <div className="asset-detail-primary">
            <div className="asset-detail-hero">
              <p className="asset-detail-label">Valor actual</p>
              <p className="asset-detail-hero-value">{formatCurrencyByVisibility(openPosition.marketValue)}</p>
              {usdEquivalent ? <p className="usd-equivalent">{usdEquivalent}</p> : null}
            </div>
            <div>
              <p className="asset-detail-label">Ganancia</p>
              <p className={`asset-detail-metric ${isPositive ? "asset-detail-metric--up" : "asset-detail-metric--down"}`}>
                {formatSignedCurrency(openPosition.pnl, openPosition.currency)}
              </p>
            </div>
            <div>
              <p className="asset-detail-label">Rendimiento</p>
              <p className={`asset-detail-metric ${isPositive ? "asset-detail-metric--up" : "asset-detail-metric--down"}`}>
                {formatPercent(openPosition.pnlPct)}
              </p>
            </div>
          </div>

          <dl className="asset-detail-secondary">
            <div>
              <dt>Cantidad</dt>
              <dd>{formatNumber(openPosition.quantity)}</dd>
            </div>
            <div>
              <dt>Precio actual</dt>
              <dd>{formatCurrencyByVisibility(openPosition.currentPrice)}</dd>
            </div>
            <div>
              <dt>Precio promedio</dt>
              <dd>{formatCurrencyByVisibility(openPosition.avgBuyPrice)}</dd>
            </div>
            <div>
              <dt>Valor invertido</dt>
              <dd>{formatCurrencyByVisibility(openPosition.investedValue)}</dd>
            </div>
            <div>
              <dt>% del portfolio</dt>
              <dd>{formatUnsignedPercent(openPosition.sharePct)}</dd>
            </div>
            <div>
              <dt>Primera compra</dt>
              <dd>{formatIsoDate(openPosition.firstBuyDate)}</dd>
            </div>
            <div>
              <dt>Última compra</dt>
              <dd>{formatIsoDate(openPosition.lastBuyDate)}</dd>
            </div>
          </dl>
        </section>

        <PortfolioTransactionsTable
          portfolioId={portfolioId}
          portfolio={portfolio}
          assets={initialAssets}
          title="Transacciones de este activo"
          searchPlaceholder="Buscar en transacciones"
          lockedAssetId={openPosition.assetId}
          hideSymbolColumn
          sectionClassName="asset-tx-section"
          onPortfolioUpdated={setPortfolio}
        />
      </div>
    </main>
  );
}

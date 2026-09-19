"use client";

import { useState } from "react";
import type { AssetCurrency } from "@/lib/portfolio";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatUsdEquivalent,
} from "@/lib/portfolio-format";

export interface HomeHeroTotals {
  currency: AssetCurrency;
  totalMarketValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  portfolioCount: number;
}

export default function HomeHeroCard({ totals, dollarQuoteSell }: { totals: HomeHeroTotals[]; dollarQuoteSell?: number | null }) {
  const [selected, setSelected] = useState<AssetCurrency>(() => {
    if (totals.some((t) => t.currency === "USD")) return "USD";
    return totals[0]?.currency ?? "USD";
  });

  const active = totals.find((t) => t.currency === selected) ?? totals[0];

  if (!active) {
    return null;
  }

  const usdEquivalent = formatUsdEquivalent(active.totalMarketValue, active.currency, dollarQuoteSell);

  return (
    <div className="home-hero-card">
      <div className="home-hero-main">
        <div className="home-hero-top-row">
          <p className="home-hero-eyebrow">
            Valor actual
            <span className="home-currency-badge">{active.currency}</span>
          </p>
          {totals.length > 1 ? (
            <div className="home-currency-switch" role="group" aria-label="Moneda del resumen">
              {totals.map((t) => (
                <button
                  key={t.currency}
                  type="button"
                  onClick={() => setSelected(t.currency)}
                  aria-pressed={selected === t.currency}
                  className={`home-currency-switch-btn ${selected === t.currency ? "home-currency-switch-btn--active" : ""}`}
                >
                  {t.currency}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="home-hero-value">{formatCurrency(active.totalMarketValue, active.currency)}</p>
        {usdEquivalent ? <p className="usd-equivalent">{usdEquivalent}</p> : null}
      </div>
      <div className="home-hero-side">
        <div className="home-hero-mini">
          <span className="home-hero-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5.5" rx="7.5" ry="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
          <span className="home-hero-mini-copy">
            <span className="home-hero-mini-label">Valor invertido</span>
            <span className="home-hero-mini-value">
              {formatCurrency(active.totalCostBasis, active.currency)}
            </span>
          </span>
        </div>
        <div className="home-hero-mini">
          <span className="home-hero-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 20v-6M11 20V9M17 20v-9M23 20H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="home-hero-mini-copy">
            <span className="home-hero-mini-label">Ganancia</span>
            <span className="home-hero-mini-value">
              <span className={active.totalPnl >= 0 ? "home-value-positive" : "home-value-negative"}>
                {formatSignedCurrency(active.totalPnl, active.currency)}
              </span>
              <span className={`home-hero-mini-pct ${active.totalPnlPct >= 0 ? "home-value-positive" : "home-value-negative"}`}>
                {formatPercent(active.totalPnlPct)}
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

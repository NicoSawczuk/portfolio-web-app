import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { readAssets } from "@/lib/asset-db";
import { readPortfolios } from "@/lib/portfolio-db";
import { calculatePortfolioPerformance } from "@/lib/portfolio-summary";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import HomeHeroCard from "@/components/HomeHeroCard";
import type { Asset, AssetCurrency } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

const homeAmountFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const homePercentFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function formatCurrency(value: number, currency: AssetCurrency = "USD") {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}${currency} ${homeAmountFormatter.format(Math.abs(value))}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : "-"}${homePercentFormatter.format(Math.abs(value * 100))}%`;
}

function formatSignedCurrency(value: number, currency: AssetCurrency = "USD") {
  if (value > 0) {
    return `+${formatCurrency(value, currency)}`;
  }
  if (value < 0) {
    return `-${formatCurrency(Math.abs(value), currency)}`;
  }
  return formatCurrency(0, currency);
}

function getAssetBarColor(type: Asset["type"]): string {
  switch (type) {
    case "stock":
      return "#0ea5e9";
    case "etf":
      return "#10b981";
    case "crypto":
      return "#f59e0b";
    case "bond":
      return "#8b5cf6";
    case "cash":
      return "#94a3b8";
    case "cedear":
      return "#22d3ee";
    default:
      return "#6366f1";
  }
}

function HomeDonut({ pct, label }: { pct: number; label: string }) {
  const size = 64;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="home-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(30 41 59 / 0.9)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0ea5e9"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="home-donut-label">{label}</span>
    </div>
  );
}

const assetTypeLabels: Record<Asset["type"], string> = {
  stock: "Acciones",
  etf: "ETF",
  crypto: "Cripto",
  bond: "Bonos",
  cash: "Efectivo",
  other: "Otros",
  cedear: "CEDEARs",
};

interface HomePortfolioItem {
  portfolio: {
    id: string;
    name: string;
    currency: AssetCurrency;
  };
  performance: NonNullable<ReturnType<typeof calculatePortfolioPerformance>>;
}

interface HomeCurrencyTotals {
  currency: AssetCurrency;
  totalMarketValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  portfolioCount: number;
}

interface HomeViewData {
  portfolioPerformances: HomePortfolioItem[];
  totalsByCurrency: HomeCurrencyTotals[];
  totalMarketByCurrency: Record<string, number>;
  portfolioDistribution: HomePortfolioItem[];
  portfolioGainsRanking: HomePortfolioItem[];
}

const CURRENCY_ORDER: AssetCurrency[] = ["USD", "ARS"];

function sortCurrencies(a: AssetCurrency, b: AssetCurrency) {
  const orderA = CURRENCY_ORDER.indexOf(a);
  const orderB = CURRENCY_ORDER.indexOf(b);
  if (orderA === -1 && orderB === -1) return a.localeCompare(b);
  if (orderA === -1) return 1;
  if (orderB === -1) return -1;
  return orderA - orderB;
}

async function getHomeViewData(userId: string): Promise<HomeViewData> {
  const [portfolios, assets] = await Promise.all([readPortfolios(userId), readAssets({ minimal: true })]);

  const portfolioPerformances = portfolios
    .map((portfolio) => {
      const performance = calculatePortfolioPerformance(portfolio, assets, { includeChartPoints: false });
      if (!performance) {
        return null;
      }

      return {
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          currency: performance.currency,
        },
        performance,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Totales agrupados por moneda del portfolio. No se mezclan USD con ARS.
  const totalsAccumulator = new Map<AssetCurrency, { market: number; cost: number; count: number }>();
  for (const item of portfolioPerformances) {
    const currency = item.performance.currency;
    const bucket = totalsAccumulator.get(currency) ?? { market: 0, cost: 0, count: 0 };
    bucket.market += item.performance.totalMarketValue;
    bucket.cost += item.performance.totalCostBasis;
    bucket.count += 1;
    totalsAccumulator.set(currency, bucket);
  }

  const totalsByCurrency: HomeCurrencyTotals[] = Array.from(totalsAccumulator.entries())
    .map(([currency, bucket]) => {
      const totalPnl = bucket.market - bucket.cost;
      return {
        currency,
        totalMarketValue: bucket.market,
        totalCostBasis: bucket.cost,
        totalPnl,
        totalPnlPct: bucket.cost > 0 ? totalPnl / bucket.cost : 0,
        portfolioCount: bucket.count,
      };
    })
    .sort((a, b) => sortCurrencies(a.currency, b.currency));

  const totalMarketByCurrency: Record<string, number> = {};
  for (const totals of totalsByCurrency) {
    totalMarketByCurrency[totals.currency] = totals.totalMarketValue;
  }

  const portfolioDistribution = [...portfolioPerformances].sort(
    (a, b) => b.performance.totalMarketValue - a.performance.totalMarketValue
  );
  const portfolioGainsRanking = [...portfolioPerformances].sort(
    (a, b) => b.performance.totalPnl - a.performance.totalPnl
  );

  return {
    portfolioPerformances,
    totalsByCurrency,
    totalMarketByCurrency,
    portfolioDistribution,
    portfolioGainsRanking,
  };
}

function HomeFallback() {
  return (
    <>
      <div className="home-skeleton-grid">
        <div className="home-skeleton-card" />
        <div className="home-skeleton-card" />
        <div className="home-skeleton-card" />
      </div>
      <div className="home-skeleton-panel" />
    </>
  );
}

async function HomeStreamedContent({ dataPromise }: { dataPromise: Promise<HomeViewData> }) {
  const {
    portfolioPerformances,
    totalsByCurrency,
    totalMarketByCurrency,
    portfolioDistribution,
    portfolioGainsRanking,
  } = await dataPromise;

  return (
    <>
      <HomeHeroCard totals={totalsByCurrency} />

      {portfolioPerformances.length === 0 ? (
        <div className="portfolio-empty-state">
          <p className="portfolio-empty-title">Todavía no hay información consolidada.</p>
          <p className="portfolio-empty-description">
            Creá portfolios y cargá transacciones para ver el resumen global.
          </p>
          <Link
            href="/portfolios"
            className="button button-primary home-empty-link"
          >
            Ir a Portfolios
          </Link>
        </div>
      ) : (
        <>
          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Inversión por portfolio</h2>
              <span className="home-section-chevron" aria-hidden="true">›</span>
            </div>
            <div className="card-content home-section-content">
              <div className="home-cards-grid home-donut-grid">
              {portfolioDistribution.map(({ portfolio, performance }) => {
                const currency = performance.currency;
                const currencyTotal = totalMarketByCurrency[currency] ?? 0;
                const share = currencyTotal > 0 ? (performance.totalMarketValue / currencyTotal) * 100 : 0;

                return (
                  <Link
                    key={portfolio.id}
                    href={`/portfolios/${portfolio.id}`}
                    className="home-donut-card"
                  >
                    <p className="home-link-title">
                      {portfolio.name}{" "}
                      <span className="home-currency-badge">{currency}</span>
                    </p>
                    <HomeDonut pct={share} label={`${share.toFixed(1)}%`} />
                    <p className="home-donut-value">{formatCurrency(performance.totalMarketValue, currency)}</p>
                  </Link>
                );
              })}
            </div>
          </div>
          </div>

          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Ganancias por portfolio</h2>
              <span className="home-section-chevron" aria-hidden="true">›</span>
            </div>
            <div className="card-content home-section-content">
              <div className="home-list home-gains-list">
              {portfolioGainsRanking.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="home-gain-row"
                >
                  <span className="home-gain-row-main">
                    <span className="home-link-title">
                      {portfolio.name}{" "}
                      <span className="home-currency-badge">{performance.currency}</span>
                    </span>
                  </span>
                  <span className="home-gain-row-values">
                    <span className={`home-gain-value ${performance.totalPnl >= 0 ? "home-value-positive" : "home-value-negative"}`}>
                      {formatSignedCurrency(performance.totalPnl, performance.currency)}
                    </span>
                    <span className={`home-link-subtle ${performance.totalPnlPct >= 0 ? "home-value-positive" : "home-value-negative"}`}>
                      {formatPercent(performance.totalPnlPct)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          </div>

          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Activos por portfolio</h2>
              <span className="home-section-chevron" aria-hidden="true">›</span>
            </div>
            <div className="card-content home-section-content">
              <div className="home-cards-grid home-cards-grid--wide">
              {portfolioDistribution.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="home-link-card home-link-card--dense"
                >
                  <p className="home-link-title">
                    {portfolio.name}{" "}
                    <span className="home-currency-badge">{performance.currency}</span>
                  </p>
                  <div className="home-assets-breakdown">
                    {performance.assetTypeBreakdown.length ? (
                      performance.assetTypeBreakdown.map((item) => {
                        const pct = performance.totalMarketValue > 0
                          ? (item.marketValue / performance.totalMarketValue) * 100
                          : 0;

                        return (
                          <div key={item.type} className="home-assets-row">
                            <div className="home-assets-row-top">
                              <span>{assetTypeLabels[item.type]}</span>
                              <span className="home-link-subtle">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="home-progress-track home-assets-bar">
                              <div
                                className="home-progress-fill"
                                style={{ width: `${pct}%`, background: getAssetBarColor(item.type) }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="home-muted-text">Sin posiciones abiertas.</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
          </div>

        </>
      )}
    </>
  );
}

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const homeDataPromise = getHomeViewData(session.userId);

  return (
    <main className="page">
      <section className="page-container home-page">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Home</p>
            <h1 className="card-title card-title--page">Resumen global</h1>
          </div>
        </header>
        <Suspense fallback={<HomeFallback />}>
          <HomeStreamedContent dataPromise={homeDataPromise} />
        </Suspense>
      </section>
    </main>
  );
}

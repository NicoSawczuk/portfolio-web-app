import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { readAssets } from "@/lib/asset-db";
import { readPortfolios } from "@/lib/portfolio-db";
import { calculatePortfolioPerformance } from "@/lib/portfolio-summary";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import type { Asset } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  const prefix = value < 0 ? "-" : "";
  return `${prefix}USD ${formatter.format(Math.abs(value))}`;
}

function formatPercent(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  return `${value >= 0 ? "+" : "-"}${formatter.format(Math.abs(value * 100))}%`;
}

const assetTypeLabels: Record<Asset["type"], string> = {
  stock: "Acciones",
  etf: "ETF",
  crypto: "Cripto",
  bond: "Bonos",
  cash: "Efectivo",
  other: "Otros",
};

interface HomeViewData {
  portfolioPerformances: Array<{
    portfolio: {
      id: string;
      name: string;
    };
    performance: NonNullable<ReturnType<typeof calculatePortfolioPerformance>>;
  }>;
  totalMarketValue: number;
  totalCostBasis: number;
  totalPnl: number;
  totalPnlPct: number;
  portfolioDistribution: Array<{
    portfolio: {
      id: string;
      name: string;
    };
    performance: NonNullable<ReturnType<typeof calculatePortfolioPerformance>>;
  }>;
  portfolioGainsRanking: Array<{
    portfolio: {
      id: string;
      name: string;
    };
    performance: NonNullable<ReturnType<typeof calculatePortfolioPerformance>>;
  }>;
}

async function getHomeViewData(userId: string): Promise<HomeViewData> {
  const [portfolios, assets] = await Promise.all([readPortfolios(userId), readAssets()]);

  const portfolioPerformances = portfolios
    .map((portfolio) => {
      const performance = calculatePortfolioPerformance(portfolio, assets);
      if (!performance) {
        return null;
      }

      return {
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
        },
        performance,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const totalMarketValue = portfolioPerformances.reduce(
    (sum, item) => sum + item.performance.totalMarketValue,
    0
  );
  const totalCostBasis = portfolioPerformances.reduce((sum, item) => sum + item.performance.totalCostBasis, 0);
  const totalPnl = totalMarketValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

  const portfolioDistribution = [...portfolioPerformances].sort(
    (a, b) => b.performance.totalMarketValue - a.performance.totalMarketValue
  );
  const portfolioGainsRanking = [...portfolioPerformances].sort(
    (a, b) => b.performance.totalPnl - a.performance.totalPnl
  );

  return {
    portfolioPerformances,
    totalMarketValue,
    totalCostBasis,
    totalPnl,
    totalPnlPct,
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
    totalMarketValue,
    totalCostBasis,
    totalPnl,
    totalPnlPct,
    portfolioDistribution,
    portfolioGainsRanking,
  } = await dataPromise;

  return (
    <>
      <div className="home-metrics-grid">
        <div className="card-item home-metric-card">
          <p className="home-metric-label">Ganancia total</p>
          <p className={`home-metric-value ${totalPnl >= 0 ? "home-value-positive" : "home-value-negative"}`}>
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="card-item home-metric-card">
          <p className="home-metric-label">Rendimiento total</p>
          <p className={`home-metric-value ${totalPnlPct >= 0 ? "home-value-positive" : "home-value-negative"}`}>
            {formatPercent(totalPnlPct)}
          </p>
        </div>
        <div className="card-item home-metric-card">
          <p className="home-metric-label">Capital actual total</p>
          <p className="home-metric-value home-value-neutral">{formatCurrency(totalMarketValue)}</p>
        </div>
      </div>

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
            </div>
            <div className="card-content home-section-content">
              <div className="home-list">
              {portfolioDistribution.map(({ portfolio, performance }) => {
                const share = totalMarketValue > 0 ? (performance.totalMarketValue / totalMarketValue) * 100 : 0;

                return (
                  <Link
                    key={portfolio.id}
                    href={`/portfolios/${portfolio.id}`}
                    className="home-link-card"
                  >
                    <div className="home-row">
                      <p className="home-link-title">{portfolio.name}</p>
                      <div className="home-link-right">
                        <p className="home-link-value">{formatCurrency(performance.totalMarketValue)}</p>
                        <p className="home-link-subtle">{share.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="home-progress-track">
                      <div className="home-progress-fill home-progress-fill--sky" style={{ width: `${share}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          </div>

          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Activos por portfolio</h2>
            </div>
            <div className="card-content home-section-content">
              <div className="home-list home-list--spaced">
              {portfolioDistribution.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="home-link-card home-link-card--dense"
                >
                  <p className="home-link-title">{portfolio.name}</p>
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
                            <div className="home-progress-track">
                              <div className="home-progress-fill home-progress-fill--emerald" style={{ width: `${pct}%` }} />
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

          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Ganancias por portfolio</h2>
            </div>
            <div className="card-content home-section-content">
              <div className="home-list">
              {portfolioGainsRanking.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="home-link-card home-link-card--row"
                >
                  <p className="home-link-title">{portfolio.name}</p>
                  <div className="home-link-right">
                    <p className={`home-link-value ${performance.totalPnl >= 0 ? "home-value-positive" : "home-value-negative"}`}>
                      {performance.totalPnl >= 0 ? "+" : ""}
                      {formatCurrency(performance.totalPnl)}
                    </p>
                    <p className={`home-link-subtle ${performance.totalPnlPct >= 0 ? "home-value-positive" : "home-value-negative"}`}>
                      {formatPercent(performance.totalPnlPct)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          </div>

          <div className="card card--panel home-section">
            <div className="card-header">
              <h2 className="card-title">Ganancias totales</h2>
            </div>
            <div className="card-content home-section-content">
              <div className="home-totals-grid">
              <div className="card-item home-total-card">
                <p className="home-total-label">Costo total invertido</p>
                <p className="home-total-value">{formatCurrency(totalCostBasis)}</p>
              </div>
              <div className="card-item home-total-card">
                <p className="home-total-label">Valor actual consolidado</p>
                <p className="home-total-value">{formatCurrency(totalMarketValue)}</p>
              </div>
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

import Link from "next/link";
import { Suspense } from "react";
import { readAssets } from "@/lib/asset-db";
import { readPortfolios } from "@/lib/portfolio-db";
import { calculatePortfolioPerformance } from "@/lib/portfolio-summary";
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

async function getHomeViewData(): Promise<HomeViewData> {
  const [portfolios, assets] = await Promise.all([readPortfolios(), readAssets()]);

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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-[106px] animate-pulse rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5" />
        <div className="h-[106px] animate-pulse rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5" />
        <div className="h-[106px] animate-pulse rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5" />
      </div>
      <div className="h-[280px] animate-pulse rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" />
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ganancia total</p>
          <p className={`mt-2 text-2xl font-semibold ${totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rendimiento total</p>
          <p className={`mt-2 text-2xl font-semibold ${totalPnlPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatPercent(totalPnlPct)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Capital actual total</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalMarketValue)}</p>
        </div>
      </div>

      {portfolioPerformances.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <p className="text-lg font-semibold">Todavía no hay información consolidada.</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Creá portfolios y cargá transacciones para ver el resumen global.
          </p>
          <Link
            href="/portfolios"
            className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Ir a Portfolios
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-semibold">Inversión por portfolio</h2>
            <div className="mt-5 space-y-3">
              {portfolioDistribution.map(({ portfolio, performance }) => {
                const share = totalMarketValue > 0 ? (performance.totalMarketValue / totalMarketValue) * 100 : 0;

                return (
                  <Link
                    key={portfolio.id}
                    href={`/portfolios/${portfolio.id}`}
                    className="block w-full cursor-pointer rounded-2xl border border-slate-200/70 bg-slate-50 p-3 transition hover:border-sky-300 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-sky-600/70 dark:hover:bg-slate-900/70"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <p className="font-semibold">{portfolio.name}</p>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(performance.totalMarketValue)}</p>
                        <p className="text-xs text-slate-500">{share.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${share}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-semibold">Activos por portfolio</h2>
            <div className="mt-5 space-y-4">
              {portfolioDistribution.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="block w-full cursor-pointer rounded-2xl border border-slate-200/70 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-sky-600/70 dark:hover:bg-slate-900/70"
                >
                  <p className="font-semibold">{portfolio.name}</p>
                  <div className="mt-3 space-y-2">
                    {performance.assetTypeBreakdown.length ? (
                      performance.assetTypeBreakdown.map((item) => {
                        const pct = performance.totalMarketValue > 0
                          ? (item.marketValue / performance.totalMarketValue) * 100
                          : 0;

                        return (
                          <div key={item.type}>
                            <div className="flex items-center justify-between text-sm">
                              <span>{assetTypeLabels[item.type]}</span>
                              <span className="text-slate-500">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Sin posiciones abiertas.</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-semibold">Ganancias por portfolio</h2>
            <div className="mt-5 space-y-3">
              {portfolioGainsRanking.map(({ portfolio, performance }) => (
                <Link
                  key={portfolio.id}
                  href={`/portfolios/${portfolio.id}`}
                  className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-3 transition hover:border-sky-300 hover:bg-slate-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-sky-600/70 dark:hover:bg-slate-900/70"
                >
                  <p className="font-semibold">{portfolio.name}</p>
                  <div className="text-right">
                    <p className={`font-semibold ${performance.totalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {performance.totalPnl >= 0 ? "+" : ""}
                      {formatCurrency(performance.totalPnl)}
                    </p>
                    <p className={`text-xs ${performance.totalPnlPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatPercent(performance.totalPnlPct)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h2 className="text-xl font-semibold">Ganancias totales</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-sm text-slate-500">Costo total invertido</p>
                <p className="mt-1 text-xl font-semibold">{formatCurrency(totalCostBasis)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-sm text-slate-500">Valor actual consolidado</p>
                <p className="mt-1 text-xl font-semibold">{formatCurrency(totalMarketValue)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default async function HomePage() {
  const homeDataPromise = getHomeViewData();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-600">Home</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Resumen global</h1>
        </div>
        <Suspense fallback={<HomeFallback />}>
          <HomeStreamedContent dataPromise={homeDataPromise} />
        </Suspense>
      </section>
    </main>
  );
}

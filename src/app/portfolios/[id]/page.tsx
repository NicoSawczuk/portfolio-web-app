import { notFound } from "next/navigation";
import PortfolioDetailClient from "@/components/PortfolioDetailClient";
import { readAssets, writeAssets } from "@/lib/asset-db";
import { refreshAssetsQuotesWithCache } from "@/lib/finnhub-service";
import { readPortfolios } from "@/lib/portfolio-db";

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
  const portfolios = await readPortfolios();
  const portfolio = portfolios.find((item) => item.id === id);

  if (!portfolio) {
    notFound();
  }

  const assets = await readAssets();
  const { hydratedAssets, persistedAssets, hasPersistenceChanges } = await refreshAssetsQuotesWithCache(assets);

  if (hasPersistenceChanges) {
    await writeAssets(persistedAssets);
  }

  return <PortfolioDetailClient portfolioId={id} initialPortfolio={portfolio} initialAssets={hydratedAssets} />;
}

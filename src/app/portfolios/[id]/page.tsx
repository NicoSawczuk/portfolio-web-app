import { notFound } from "next/navigation";
import PortfolioDetailClient from "@/components/PortfolioDetailClient";
import { readAssets } from "@/lib/asset-db";
import { readPortfolioById } from "@/lib/portfolio-db";

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
  const [portfolio, assets] = await Promise.all([readPortfolioById(id), readAssets()]);

  if (!portfolio) {
    notFound();
  }

  return <PortfolioDetailClient portfolioId={id} initialPortfolio={portfolio} initialAssets={assets} />;
}

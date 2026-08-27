import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolioById } from "@/lib/portfolio-db";
import PortfolioV3AssetDetailClient from "@/components/PortfolioV3AssetDetailClient";

export const dynamic = "force-dynamic";

interface PortfolioAssetDetailPageProps {
  params: Promise<{ id: string; symbol: string }>;
}

export default async function PortfolioAssetDetailPage({ params }: PortfolioAssetDetailPageProps) {
  const { id, symbol } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const [portfolio, assets] = await Promise.all([readPortfolioById(id, session.userId), readAssets()]);

  if (!portfolio) {
    notFound();
  }

  return (
    <PortfolioV3AssetDetailClient
      portfolioId={id}
      symbol={decodeURIComponent(symbol)}
      initialPortfolio={portfolio}
      initialAssets={assets}
    />
  );
}

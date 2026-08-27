import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolioById } from "@/lib/portfolio-db";
import PortfolioV3ClosedDetailClient from "@/components/PortfolioV3ClosedDetailClient";

export const dynamic = "force-dynamic";

interface PortfolioClosedDetailPageProps {
  params: Promise<{ id: string; assetId: string }>;
}

export default async function PortfolioClosedDetailPage({ params }: PortfolioClosedDetailPageProps) {
  const { id, assetId } = await params;
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
    <PortfolioV3ClosedDetailClient
      portfolioId={id}
      assetId={assetId}
      initialPortfolio={portfolio}
      initialAssets={assets}
    />
  );
}

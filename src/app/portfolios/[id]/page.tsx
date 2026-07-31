import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import PortfolioDetailClient from "@/components/PortfolioDetailClient";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolioById } from "@/lib/portfolio-db";

interface PortfolioDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioDetailPage({ params }: PortfolioDetailPageProps) {
  const { id } = await params;
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

  return <PortfolioDetailClient portfolioId={id} initialPortfolio={portfolio} initialAssets={assets} />;
}

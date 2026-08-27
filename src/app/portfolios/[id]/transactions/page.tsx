import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolioById } from "@/lib/portfolio-db";
import PortfolioV3TransactionsPageClient from "@/components/PortfolioV3TransactionsPageClient";

export const dynamic = "force-dynamic";

interface PortfolioTransactionsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioTransactionsPage({ params }: PortfolioTransactionsPageProps) {
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

  return <PortfolioV3TransactionsPageClient portfolioId={id} initialPortfolio={portfolio} initialAssets={assets} />;
}

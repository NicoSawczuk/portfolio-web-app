import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import PortfolioV3MainClient from "@/components/PortfolioV3MainClient";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolioById } from "@/lib/portfolio-db";
import { readLatestDollarQuote } from "@/lib/dollar-quote-db";
import { DollarQuoteProvider } from "@/lib/dollar-quote-context";

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

  const [portfolio, assets, dollarQuote] = await Promise.all([
    readPortfolioById(id, session.userId),
    readAssets({ minimal: true }),
    readLatestDollarQuote(),
  ]);

  if (!portfolio) {
    notFound();
  }

  return (
    <DollarQuoteProvider initialSellQuote={dollarQuote ? Number(dollarQuote.sell) : null}>
      <PortfolioV3MainClient
        portfolioId={id}
        initialPortfolio={portfolio}
        initialAssets={assets}
      />
    </DollarQuoteProvider>
  );
}


import { readAssets } from "@/lib/asset-db";
import { readPortfolios } from "@/lib/portfolio-db";
import PortfolioDashboardClient from "@/components/PortfolioDashboardClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [portfolios, assets] = await Promise.all([readPortfolios(), readAssets()]);

  return <PortfolioDashboardClient initialPortfolios={portfolios} initialAssets={assets} />;
}

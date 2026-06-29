import TransactionsExportPanel from "@/components/TransactionsExportPanel";
import { readAssets } from "@/lib/asset-db";
import { readPortfolios } from "@/lib/portfolio-db";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const [portfolios, assets] = await Promise.all([readPortfolios(), readAssets()]);

  return <TransactionsExportPanel initialPortfolios={portfolios} initialAssets={assets} />;
}

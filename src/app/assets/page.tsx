import AssetsPageClient from "@/components/AssetsPageClient";
import { readAssets, writeAssets } from "@/lib/asset-db";
import { refreshAssetsQuotesWithCache } from "@/lib/finnhub-service";

export default async function AssetsPage() {
  const assets = await readAssets();
  const { hydratedAssets, persistedAssets, hasPersistenceChanges } = await refreshAssetsQuotesWithCache(assets);

  if (hasPersistenceChanges) {
    await writeAssets(persistedAssets);
  }

  return <AssetsPageClient initialAssets={hydratedAssets} />;
}

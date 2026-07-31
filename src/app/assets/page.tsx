import AssetsPageClient from "@/components/AssetsPageClient";
import { readAssets } from "@/lib/asset-db";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await readAssets();

  return <AssetsPageClient initialAssets={assets} />;
}

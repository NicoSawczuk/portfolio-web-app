import { cookies } from "next/headers";
import AssetsPageClient from "@/components/AssetsPageClient";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getUserAssetPermissions } from "@/lib/user-permissions-db";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  const [assets, permissions] = await Promise.all([
    readAssets(),
    session ? getUserAssetPermissions(session.userId) : Promise.resolve({ canCreate: false, canEdit: false, canDelete: false, canRefresh: false }),
  ]);

  return <AssetsPageClient initialAssets={assets} initialPermissions={permissions} />;
}

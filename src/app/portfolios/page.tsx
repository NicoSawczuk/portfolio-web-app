import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolios } from "@/lib/portfolio-db";
import PortfolioDashboardClient from "@/components/PortfolioDashboardClient";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const [portfolios, assets] = await Promise.all([readPortfolios(session.userId), readAssets()]);

  return <PortfolioDashboardClient initialPortfolios={portfolios} initialAssets={assets} />;
}

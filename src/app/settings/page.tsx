import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TransactionsExportPanel from "@/components/TransactionsExportPanel";
import TransactionsImportPanel from "@/components/TransactionsImportPanel";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolios } from "@/lib/portfolio-db";

// Configuración debe reflejar datos actuales de DB en cada request.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const [portfolios, assets] = await Promise.all([readPortfolios(session.userId), readAssets({ minimal: true })]);

  return (
    <main className="page">
      <section className="page-container card-content--list">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h1 className="card-title card-title--page">Configuración</h1>
            <p className="card-description">Exportá tus transacciones o importá nuevas desde un JSON.</p>
          </div>
        </header>

        <TransactionsExportPanel initialPortfolios={portfolios} initialAssets={assets} />
        <TransactionsImportPanel portfolios={portfolios} />
      </section>
    </main>
  );
}

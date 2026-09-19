import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import TransactionsExportPanel from "@/components/TransactionsExportPanel";
import TransactionsImportPanel from "@/components/TransactionsImportPanel";
import { readAssets } from "@/lib/asset-db";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readPortfolios } from "@/lib/portfolio-db";

// Contenido movido desde /settings sin cambios de comportamiento
// (ver CONFIGURACION_REDESIGN.md §3).
export const dynamic = "force-dynamic";

export default async function ImportarExportarPage() {
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
        <div>
          <Link href="/settings" className="asset-detail-back">
            <span aria-hidden="true">←</span>
            Volver
          </Link>
        </div>

        <header className="card card-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h1 className="card-title card-title--page">Importar / Exportar</h1>
          </div>
        </header>

        <TransactionsExportPanel initialPortfolios={portfolios} initialAssets={assets} />
        <TransactionsImportPanel portfolios={portfolios} />
      </section>
    </main>
  );
}

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import TipoCambioClient from "@/components/TipoCambioClient";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readDollarQuotesHistory, readLatestDollarQuote } from "@/lib/dollar-quote-db";
import { ensureDailyDollarQuote } from "@/lib/dollar-quote-service";
import { getUserDollarPermissions } from "@/lib/user-permissions-db";

export const dynamic = "force-dynamic";

const INITIAL_PAGE_SIZE = 20;

export default async function TipoCambioPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  // Consulta automática diaria (lazy): si hoy todavía no se consultó
  // DolarAPI, se consulta una vez. No bloquea el render si falla.
  try {
    await ensureDailyDollarQuote();
  } catch {
    // ensureDailyDollarQuote ya loguea; la página muestra MongoDB igual.
  }

  const [current, all, permissions] = await Promise.all([
    readLatestDollarQuote(),
    readDollarQuotesHistory(),
    getUserDollarPermissions(session.userId),
  ]);
  const initialHistory = all.slice(0, INITIAL_PAGE_SIZE);

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
            <h1 className="card-title card-title--page">Tipo de cambio</h1>
          </div>
        </header>

        <TipoCambioClient
          initialCurrent={current}
          initialHistory={initialHistory}
          initialTotal={all.length}
          initialPageSize={INITIAL_PAGE_SIZE}
          initialPermissions={permissions}
        />
      </section>
    </main>
  );
}

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { readLatestDollarQuote } from "@/lib/dollar-quote-db";

// Hub de Configuración: solo navegación, sin formularios (ver CONFIGURACION_REDESIGN.md).
export const dynamic = "force-dynamic";

function DollarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M14.8 9.2c-.5-1-1.5-1.5-2.8-1.5-1.7 0-2.9.9-2.9 2.2 0 2.9 5.8 1.5 5.8 4.4 0 1.3-1.2 2.2-2.9 2.2-1.3 0-2.3-.5-2.8-1.5" />
    </svg>
  );
}

function FileImportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v5" />
      <path d="m9.8 13.8 2.2 2.2 2.2-2.2" />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default async function ConfiguracionPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const latestQuote = await readLatestDollarQuote().catch(() => null);
  const quoteLabel = latestQuote
    ? `Dólar Oficial: $ ${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(latestQuote.sell)}`
    : "Dólar Oficial: sin cotización";
  const quoteUpdatedLabel = (() => {
    if (!latestQuote) {
      return "Todavía no hay cotizaciones";
    }
    const date = new Date(latestQuote.datetime);
    if (Number.isNaN(date.getTime())) {
      return "Actualizado: sin fecha";
    }
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `Actualizado: ${day}/${month}/${year} ${hours}:${minutes}`;
  })();

  return (
    <main className="page">
      <section className="page-container card-content--list">
        <header className="card card-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h1 className="card-title card-title--page">Configuración</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/settings/exchange-rate"
            className="card card--panel block no-underline transition-colors hover:border-[var(--border-hover)]"
            aria-label="Ir a Tipo de cambio"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <DollarIcon />
                </span>
                <span className="min-w-0">
                  <span className="card-title block">Tipo de cambio</span>
                  <span className="card-description mt-1 block">
                    Configurá la cotización del dólar para conversiones y equivalentes.
                  </span>
                </span>
              </span>
              <span className="mt-1 inline-flex" style={{ color: "var(--muted)" }} aria-hidden="true">
                <ChevronIcon />
              </span>
            </span>
            <span className="card-item mt-4 flex items-start gap-3">
              <span className="mt-0.5 inline-flex" style={{ color: "var(--accent)" }} aria-hidden="true">
                <TrendIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {quoteLabel}
                </span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                  {quoteUpdatedLabel}
                </span>
              </span>
            </span>
          </Link>

          <Link
            href="/settings/import-export"
            className="card card--panel block no-underline transition-colors hover:border-[var(--border-hover)]"
            aria-label="Ir a Importar / Exportar"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  <FileImportIcon />
                </span>
                <span className="min-w-0">
                  <span className="card-title block">Importar / Exportar</span>
                  <span className="card-description mt-1 block">
                    Exportá tus transacciones o importá nuevas desde un archivo JSON.
                  </span>
                </span>
              </span>
              <span className="mt-1 inline-flex" style={{ color: "var(--muted)" }} aria-hidden="true">
                <ChevronIcon />
              </span>
            </span>
            <span className="card-item mt-4 flex items-start gap-3">
              <span className="mt-0.5 inline-flex" style={{ color: "var(--accent)" }} aria-hidden="true">
                <SyncIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Exportar en CSV o importar desde JSON
                </span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--muted)" }}>
                  Última exportación: 15/09/2026
                </span>
              </span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

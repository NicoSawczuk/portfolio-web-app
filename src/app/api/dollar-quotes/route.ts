import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { deleteDollarQuoteById, readDollarQuotesHistory, readLatestDollarQuote } from "@/lib/dollar-quote-db";
import {
  createManualDollarQuote,
  refreshDollarQuoteFromApi,
} from "@/lib/dollar-quote-service";
import { DOLLAR_PERMISSIONS } from "@/lib/permissions";
import { hasUserPermission } from "@/lib/user-permissions-db";

function formatQuoteDateKey(datetime: string) {
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// GET /api/dollar-quotes -> cotización actual (MongoDB) + histórico paginado.
// Query: page (1-based), pageSize, search (fecha "dd/mm/yyyy" o ISO).
export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") ?? 1) || 1);
  const rawPageSize = Number(requestUrl.searchParams.get("pageSize") ?? 20) || 20;
  const pageSize = [10, 20, 50, 100].includes(rawPageSize) ? rawPageSize : 20;
  const search = (requestUrl.searchParams.get("search") ?? "").trim();

  const [current, all] = await Promise.all([readLatestDollarQuote(), readDollarQuotesHistory()]);

  const normalizedSearch = normalizeSearch(search);
  const filtered = normalizedSearch
    ? all.filter((quote) => {
        const haystack = normalizeSearch(`${quote.datetime} ${formatQuoteDateKey(quote.datetime)}`);
        return normalizedSearch.split(/\s+/).every((token) => haystack.includes(token));
      })
    : all;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const start = (boundedPage - 1) * pageSize;
  const history = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    current,
    history,
    total,
    page: boundedPage,
    totalPages,
    pageSize,
  });
}

// POST /api/dollar-quotes { action: "refresh" } -> DolarAPI sin restricción diaria.
// POST /api/dollar-quotes { action: "manual", buy, sell } -> edición manual.
// Ambas acciones pueden insertar una cotización nueva: requieren dollar:create.
export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!(await hasUserPermission(session.userId, DOLLAR_PERMISSIONS.CREATE))) {
    return NextResponse.json({ error: "No tenés permiso para agregar cotizaciones." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    buy?: unknown;
    sell?: unknown;
  } | null;

  const action = typeof body?.action === "string" ? body.action : "";

  if (action === "refresh") {
    try {
      const result = await refreshDollarQuoteFromApi();
      return NextResponse.json({ quote: result.quote, created: result.created });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la cotización.";
      console.error(`[dollar-quotes] refresh manual falló: ${message}`);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "manual") {
    try {
      const result = await createManualDollarQuote(body?.buy, body?.sell);
      return NextResponse.json({ quote: result.quote, created: result.created });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la cotización.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Acción inválida. Usá "refresh" o "manual".' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!(await hasUserPermission(session.userId, DOLLAR_PERMISSIONS.DELETE))) {
    return NextResponse.json({ error: "No tenés permiso para eliminar cotizaciones." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  const deleted = await deleteDollarQuoteById(id);
  if (!deleted) {
    return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

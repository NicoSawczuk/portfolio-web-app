import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getData912ArgStockPricesForSymbols } from "@/lib/data912-service";

function parseSymbolsParam(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

function toPayload(prices: Map<string, { price: number; updatedAt: string }>) {
  return Array.from(prices.entries()).map(([symbol, quote]) => ({
    symbol,
    px_bid: quote.price,
    price: quote.price,
    currency: "ARS" as const,
    updatedAt: quote.updatedAt,
  }));
}

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const symbols = parseSymbolsParam(requestUrl.searchParams.get("symbols"));

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "Pasá al menos un símbolo. Ej: /api/data912/arg-stocks?symbols=GGAL,MELI" },
      { status: 400 }
    );
  }

  try {
    const prices = await getData912ArgStockPricesForSymbols(symbols);
    return NextResponse.json(toPayload(prices));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron obtener las acciones ARS." },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { symbols?: unknown } | null;
  const rawSymbols = Array.isArray(body?.symbols) ? (body.symbols as unknown[]) : [];
  const symbols = rawSymbols
    .map((symbol) => String(symbol ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: 'El body debe incluir "symbols": ["GGAL", "YPFD"].' },
      { status: 400 }
    );
  }

  try {
    const prices = await getData912ArgStockPricesForSymbols(symbols);
    return NextResponse.json(toPayload(prices));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron obtener las acciones ARS." },
      { status: 502 }
    );
  }
}
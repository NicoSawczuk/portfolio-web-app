import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { resolveAssetForTransaction } from "@/lib/asset-db";
import { getSessionFromRequest } from "@/lib/auth";
import { getAssetCurrency, getPortfolioCurrency } from "@/lib/portfolio";
import type { Transaction, TransactionType } from "@/lib/portfolio";
import { readPortfolioById, replacePortfolioById } from "@/lib/portfolio-db";

const ALLOWED_TYPES: TransactionType[] = ["buy", "sell", "cash_in", "cash_out"];

type ImportItem = {
  type?: unknown;
  symbol?: unknown;
  quantity?: unknown;
  price?: unknown;
  date?: unknown;
  notes?: unknown;
};

function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === "string" && ALLOWED_TYPES.includes(value as TransactionType);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  );
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function parseNotes(value: unknown): string | undefined | null {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 1000) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { portfolioId?: unknown; transactions?: unknown };
  try {
    body = (await request.json()) as { portfolioId?: unknown; transactions?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la solicitud." }, { status: 400 });
  }

  if (typeof body.portfolioId !== "string" || !body.portfolioId.trim()) {
    return NextResponse.json({ error: "portfolioId es obligatorio." }, { status: 400 });
  }
  if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
    return NextResponse.json({ error: "transactions debe ser un array no vacío." }, { status: 400 });
  }
  if (body.transactions.length > 1000) {
    return NextResponse.json({ error: "Se pueden importar hasta 1000 transacciones por vez." }, { status: 400 });
  }

  const portfolioId = body.portfolioId.trim();
  const portfolio = await readPortfolioById(portfolioId, session.userId);
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  const portfolioCurrency = getPortfolioCurrency(portfolio);
  const errors: { index: number; error: string }[] = [];
  const prepared: Transaction[] = [];
  const assetsToAdd = new Map<string, (typeof portfolio.assets)[number]>();

  for (let index = 0; index < body.transactions.length; index += 1) {
    const raw = body.transactions[index] as ImportItem;
    const prefix = `Fila ${index + 1}`;

    if (!raw || typeof raw !== "object") {
      errors.push({ index, error: `${prefix}: objeto inválido.` });
      continue;
    }

    if (!isTransactionType(raw.type)) {
      errors.push({ index, error: `${prefix}: type debe ser buy, sell, cash_in o cash_out.` });
      continue;
    }

    if (!isValidDate(raw.date)) {
      errors.push({ index, error: `${prefix}: date es obligatoria con formato YYYY-MM-DD.` });
      continue;
    }

    const price = parsePositiveNumber(raw.price);
    if (!price) {
      errors.push({ index, error: `${prefix}: price debe ser un número mayor a cero.` });
      continue;
    }

    const notes = parseNotes(raw.notes);
    if (notes === null) {
      errors.push({ index, error: `${prefix}: notes debe ser texto de hasta 1000 caracteres.` });
      continue;
    }

    if (raw.type === "buy" || raw.type === "sell") {
      if (typeof raw.symbol !== "string" || !raw.symbol.trim()) {
        errors.push({ index, error: `${prefix}: symbol es obligatorio para buy/sell (ej: AAPL, BTC).` });
        continue;
      }
      const quantity = parsePositiveNumber(raw.quantity);
      if (!quantity) {
        errors.push({ index, error: `${prefix}: quantity debe ser un número mayor a cero.` });
        continue;
      }

      const symbol = raw.symbol.trim().toUpperCase();
      // Se consideran también los assets agregados por filas anteriores del mismo lote,
      // para que varias compras del mismo ticker en una misma moneda no se separen.
      const assetMetadata = await resolveAssetForTransaction(
        [...assetsToAdd.values(), ...portfolio.assets],
        symbol,
        portfolioCurrency
      );
      if (!assetMetadata) {
        errors.push({ index, error: `${prefix}: activo no encontrado para el símbolo "${symbol}".` });
        continue;
      }
      if (getAssetCurrency(assetMetadata) !== portfolioCurrency) {
        errors.push({
          index,
          error: `${prefix}: el activo cotiza en ${getAssetCurrency(assetMetadata)} y el portfolio es en ${portfolioCurrency}.`,
        });
        continue;
      }

      if (!portfolio.assets.some((item) => item.id === assetMetadata.id) && !assetsToAdd.has(assetMetadata.id)) {
        assetsToAdd.set(assetMetadata.id, { ...assetMetadata });
      }

      prepared.push({
        id: new ObjectId().toHexString(),
        type: raw.type,
        assetId: assetMetadata.id,
        assetSymbol: assetMetadata.symbol,
        assetName: assetMetadata.name,
        assetType: assetMetadata.type,
        quantity,
        price,
        date: raw.date,
        notes,
      });
      continue;
    }

    prepared.push({
      id: new ObjectId().toHexString(),
      type: raw.type,
      price,
      date: raw.date,
      notes,
    });
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "El JSON tiene errores de validación.", errors },
      { status: 400 }
    );
  }

  portfolio.assets = [...assetsToAdd.values(), ...portfolio.assets];
  portfolio.transactions = [...prepared.reverse(), ...portfolio.transactions];

  const updated = await replacePortfolioById(portfolioId, portfolio, session.userId);
  if (!updated) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      portfolioId,
      importedCount: prepared.length,
      transactionIds: prepared.map((item) => item.id),
    },
    { status: 201 }
  );
}

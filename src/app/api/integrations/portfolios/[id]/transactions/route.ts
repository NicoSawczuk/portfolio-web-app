import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { readAssets } from "@/lib/asset-db";
import { readPortfolioById, replacePortfolioById } from "@/lib/portfolio-db";
import type { Transaction, TransactionType } from "@/lib/portfolio";

const PORTFOLIO_TRANSACTIONS_API_KEY = process.env.PORTFOLIO_TRANSACTIONS_API_KEY?.trim();
const ALLOWED_TRANSACTION_TYPES: TransactionType[] = ["buy", "sell", "cash_in", "cash_out"];

type CreateTransactionPayload = {
  type?: unknown;
  assetId?: unknown;
  quantity?: unknown;
  price?: unknown;
  date?: unknown;
  notes?: unknown;
};

function createObjectId() {
  return new ObjectId().toHexString();
}

function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === "string" && ALLOWED_TRANSACTION_TYPES.includes(value as TransactionType);
}

function isValidDateInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function parsePositiveNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseOptionalNotes(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > 1000) {
    return null;
  }

  return trimmed;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!PORTFOLIO_TRANSACTIONS_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar PORTFOLIO_TRANSACTIONS_API_KEY en el entorno." },
      { status: 500 }
    );
  }

  const requestApiKey = request.headers.get("x-api-key")?.trim();
  if (!requestApiKey || requestApiKey !== PORTFOLIO_TRANSACTIONS_API_KEY) {
    return unauthorizedResponse();
  }

  let body: CreateTransactionPayload;
  try {
    body = (await request.json()) as CreateTransactionPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la solicitud." }, { status: 400 });
  }

  const { id } = await params;
  const portfolio = await readPortfolioById(id);

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  if (!isTransactionType(body.type)) {
    return NextResponse.json({ error: "El tipo de transacción es inválido." }, { status: 400 });
  }

  if (typeof body.date !== "string" || !isValidDateInputValue(body.date)) {
    return NextResponse.json({ error: "La fecha es obligatoria y debe tener formato YYYY-MM-DD." }, { status: 400 });
  }

  const price = parsePositiveNumber(body.price);
  if (!price) {
    return NextResponse.json({ error: "El precio/monto debe ser un número mayor a cero." }, { status: 400 });
  }

  const notes = parseOptionalNotes(body.notes);
  if (notes === null) {
    return NextResponse.json({ error: "Las notas deben ser texto y no superar 1000 caracteres." }, { status: 400 });
  }

  const transactionBase: Transaction = {
    id: createObjectId(),
    type: body.type,
    price,
    date: body.date,
    notes,
  };

  if (body.type === "buy" || body.type === "sell") {
    if (typeof body.assetId !== "string" || !body.assetId.trim()) {
      return NextResponse.json({ error: "assetId es obligatorio para transacciones buy/sell." }, { status: 400 });
    }

    const quantity = parsePositiveNumber(body.quantity);
    if (!quantity) {
      return NextResponse.json({ error: "La cantidad debe ser un número mayor a cero." }, { status: 400 });
    }

    const assetId = body.assetId.trim();
    const globalAssets = await readAssets();
    const assetMetadata = globalAssets.find((asset) => asset.id === assetId);

    if (!assetMetadata) {
      return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
    }

    let portfolioAsset = portfolio.assets.find((asset) => asset.id === assetId);
    if (!portfolioAsset) {
      portfolioAsset = { ...assetMetadata, transactions: [] };
      portfolio.assets = [portfolioAsset, ...portfolio.assets];
    }

    const transaction: Transaction = {
      ...transactionBase,
      assetId,
      assetSymbol: assetMetadata.symbol,
      assetName: assetMetadata.name,
      assetType: assetMetadata.type,
      quantity,
    };

    portfolio.transactions = [transaction, ...portfolio.transactions];
    portfolioAsset.transactions = [transaction, ...portfolioAsset.transactions];
    portfolio.assets = portfolio.assets.map((asset) => (asset.id === assetId ? portfolioAsset : asset));

    const updatedPortfolio = await replacePortfolioById(id, portfolio);
    if (!updatedPortfolio) {
      return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      portfolioId: id,
      transactionId: transaction.id,
      transaction,
    });
  }

  const transaction: Transaction = {
    ...transactionBase,
    assetId: undefined,
    assetSymbol: undefined,
    assetName: undefined,
    assetType: undefined,
    quantity: undefined,
  };

  portfolio.transactions = [transaction, ...portfolio.transactions];
  const updatedPortfolio = await replacePortfolioById(id, portfolio);
  if (!updatedPortfolio) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    portfolioId: id,
    transactionId: transaction.id,
    transaction,
  });
}

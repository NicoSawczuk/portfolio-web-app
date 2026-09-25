import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { resolveAssetForTransaction } from "@/lib/asset-db";
import { readPortfolioById, replacePortfolioById } from "@/lib/portfolio-db";
import { getAssetCurrency, getPortfolioCurrency } from "@/lib/portfolio";
import { isUserActive } from "@/lib/auth";
import { N8N_PERMISSIONS } from "@/lib/permissions";
import { findUserByTelegramId } from "@/lib/user-db";
import { hasUserPermission } from "@/lib/user-permissions-db";
import type { Transaction, TransactionType } from "@/lib/portfolio";

const PORTFOLIO_TRANSACTIONS_API_KEY = process.env.PORTFOLIO_TRANSACTIONS_API_KEY?.trim();
const ALLOWED_TRANSACTION_TYPES: TransactionType[] = ["buy", "sell", "cash_in", "cash_out"];

type CreateTransactionPayload = {
  type?: unknown;
  symbol?: unknown;
  quantity?: unknown;
  price?: unknown;
  date?: unknown;
  notes?: unknown;
  telegramUserId?: unknown;
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

function parseTelegramUserId(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
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

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function unauthorizedResponse() {
  return errorResponse("No autorizado.", 401);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!PORTFOLIO_TRANSACTIONS_API_KEY) {
    return errorResponse("Falta configurar PORTFOLIO_TRANSACTIONS_API_KEY en el entorno.", 500);
  }

  const requestApiKey = request.headers.get("x-api-key")?.trim();
  if (!requestApiKey || requestApiKey !== PORTFOLIO_TRANSACTIONS_API_KEY) {
    return unauthorizedResponse();
  }

  let body: CreateTransactionPayload;
  try {
    body = (await request.json()) as CreateTransactionPayload;
  } catch {
    return errorResponse("JSON inválido en el cuerpo de la solicitud.", 400);
  }

  const { id } = await params;

  const telegramUserId = parseTelegramUserId(body.telegramUserId);
  if (!telegramUserId) {
    return errorResponse("telegramUserId es obligatorio y debe ser un entero positivo.", 400);
  }

  const caller = await findUserByTelegramId(telegramUserId);
  if (!caller || !isUserActive(caller.expiration_date)) {
    return unauthorizedResponse();
  }

  if (!(await hasUserPermission(caller.id, N8N_PERMISSIONS.TRANSACTIONS_CREATE))) {
    return errorResponse("No autorizado para cargar transacciones.", 403);
  }

  const portfolio = await readPortfolioById(id);

  if (!portfolio) {
    return errorResponse("Portfolio no encontrado.", 404);
  }

  if (portfolio.ownerUserId !== caller.id) {
    return errorResponse("Portfolio no encontrado.", 404);
  }

  if (!isTransactionType(body.type)) {
    return errorResponse("El tipo de transacción es inválido.", 400);
  }

  if (typeof body.date !== "string" || !isValidDateInputValue(body.date)) {
    return errorResponse("La fecha es obligatoria y debe tener formato YYYY-MM-DD.", 400);
  }

  const price = parsePositiveNumber(body.price);
  if (!price) {
    return errorResponse("El precio/monto debe ser un número mayor a cero.", 400);
  }

  const notes = parseOptionalNotes(body.notes);
  if (notes === null) {
    return errorResponse("Las notas deben ser texto y no superar 1000 caracteres.", 400);
  }

  const transactionBase: Transaction = {
    id: createObjectId(),
    type: body.type,
    price,
    date: body.date,
    notes,
  };

  if (body.type === "buy" || body.type === "sell") {
    if (typeof body.symbol !== "string" || !body.symbol.trim()) {
      return errorResponse("symbol es obligatorio para transacciones buy/sell (ej: BTC, AAPL, SPY).", 400);
    }

    const quantity = parsePositiveNumber(body.quantity);
    if (!quantity) {
      return errorResponse("La cantidad debe ser un número mayor a cero.", 400);
    }

    const symbol = body.symbol.trim().toUpperCase();

    // La moneda del portfolio manda: se reutiliza la posición existente del mismo
    // símbolo y, si no hay, se resuelve en el catálogo global prefiriendo la moneda
    // del portfolio. Evita colgar la transacción de un ticker duplicado en otra moneda.
    const assetMetadata = await resolveAssetForTransaction(
      portfolio.assets,
      symbol,
      getPortfolioCurrency(portfolio)
    );

    if (!assetMetadata) {
      return errorResponse(`Activo no encontrado para el símbolo "${symbol}".`, 404);
    }

    if (getAssetCurrency(assetMetadata) !== getPortfolioCurrency(portfolio)) {
      return errorResponse(
        `El activo cotiza en ${getAssetCurrency(assetMetadata)} y el portfolio es en ${getPortfolioCurrency(portfolio)}.`,
        400
      );
    }

    const assetId = assetMetadata.id;
    let portfolioAsset = portfolio.assets.find((asset) => asset.id === assetId);
    if (!portfolioAsset) {
      portfolioAsset = { ...assetMetadata };
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
    portfolio.assets = portfolio.assets.map((asset) => (asset.id === assetId ? portfolioAsset : asset));

    const updatedPortfolio = await replacePortfolioById(id, portfolio, caller.id);
    if (!updatedPortfolio) {
      return errorResponse("Portfolio no encontrado.", 404);
    }

    return NextResponse.json(
      {
        ok: true,
        portfolioId: id,
        transactionId: transaction.id,
        transaction,
      },
      { status: 201 }
    );
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
  const updatedPortfolio = await replacePortfolioById(id, portfolio, caller.id);
  if (!updatedPortfolio) {
    return errorResponse("Portfolio no encontrado.", 404);
  }

  return NextResponse.json(
    {
      ok: true,
      portfolioId: id,
      transactionId: transaction.id,
      transaction,
    },
    { status: 201 }
  );
}

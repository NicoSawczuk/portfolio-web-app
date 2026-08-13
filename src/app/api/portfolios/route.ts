import { NextResponse } from "next/server";
import {
  createPortfolioId,
  deletePortfolioById,
  insertPortfolio,
  readPortfolios,
  updatePortfolioFields,
} from "@/lib/portfolio-db";
import { getSessionFromRequest } from "@/lib/auth";
import type { Portfolio } from "@/lib/portfolio";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const portfolios = await readPortfolios(session.userId);
  return NextResponse.json(portfolios.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, managesCash } = body as {
    name: string;
    description?: string;
    managesCash?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const newPortfolio: Portfolio = {
    id: createPortfolioId(),
    ownerUserId: session.userId,
    name: name.trim(),
    description: description?.trim() ?? "",
    managesCash: Boolean(managesCash),
    createdAt: new Date().toISOString(),
    assets: [],
    transactions: [],
  };

  await insertPortfolio(newPortfolio);
  return NextResponse.json(newPortfolio, { status: 201 });
}

export async function PUT(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, description, managesCash } = body as {
    id: string;
    name: string;
    description?: string;
    managesCash?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const updated = await updatePortfolioFields(id, {
    name: name.trim(),
    description: description?.trim() ?? "",
    managesCash: Boolean(managesCash),
  }, session.userId);

  if (!updated) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  const deleted = await deletePortfolioById(id, session.userId);
  if (!deleted) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

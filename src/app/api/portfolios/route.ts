import { NextResponse } from "next/server";
import { readPortfolios, writePortfolios, createPortfolioId } from "@/lib/portfolio-db";
import type { Portfolio } from "@/lib/portfolio";

export async function GET() {
  const portfolios = await readPortfolios();
  return NextResponse.json(portfolios.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description } = body as { name: string; description?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const newPortfolio: Portfolio = {
    id: createPortfolioId(),
    name: name.trim(),
    description: description?.trim() ?? "",
    createdAt: new Date().toISOString(),
    assets: [],
    transactions: [],
  };

  portfolios.unshift(newPortfolio);
  await writePortfolios(portfolios);
  return NextResponse.json(newPortfolio, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, name, description } = body as { id: string; name: string; description?: string };

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const index = portfolios.findIndex((portfolio) => portfolio.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  portfolios[index] = {
    ...portfolios[index],
    name: name.trim(),
    description: description?.trim() ?? "",
  };

  await writePortfolios(portfolios);
  return NextResponse.json(portfolios[index]);
}

export async function DELETE(request: Request) {
  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const next = portfolios.filter((portfolio) => portfolio.id !== id);

  if (next.length === portfolios.length) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  await writePortfolios(next);
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { readPortfolios, writePortfolios } from "@/lib/portfolio-db";
import { readAssets } from "@/lib/asset-db";
import type { Asset, Portfolio, Transaction, TransactionType } from "@/lib/portfolio";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portfolios = await readPortfolios();
  const portfolio = portfolios.find((item) => item.id === id);

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  return NextResponse.json(portfolio);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body?.kind === "transaction") {
    const { assetId, assetSymbol, assetName, assetType, quantity, price, date, notes, type } = body as {
      assetId?: string;
      assetSymbol?: string;
      assetName?: string;
      assetType?: Asset["type"];
      quantity?: number;
      price: number;
      date: string;
      notes?: string;
      type: TransactionType;
    };

    if (!type || !["buy", "sell", "cash_in", "cash_out"].includes(type)) {
      return NextResponse.json({ error: "El tipo de transacción es obligatorio." }, { status: 400 });
    }

    if ((type === "buy" || type === "sell") && (!assetId || !date || !quantity || !price)) {
      return NextResponse.json({ error: "Faltan datos para crear la transacción de activo." }, { status: 400 });
    }

    if ((type === "cash_in" || type === "cash_out") && (!date || !price)) {
      return NextResponse.json({ error: "Faltan datos para crear la transacción de efectivo." }, { status: 400 });
    }

    const portfolios = await readPortfolios();
    const portfolioIndex = portfolios.findIndex((item) => item.id === id);

    if (portfolioIndex === -1) {
      return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
    }

    const portfolio = portfolios[portfolioIndex];
    const nextTransaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      price: Number(price ?? 0),
      date,
      notes,
    };

    if (type === "buy" || type === "sell") {
      const globalAssets = await readAssets();
      const assetMetadata = globalAssets.find((item) => item.id === assetId);

      if (!assetMetadata) {
        return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
      }

      let portfolioAsset = portfolio.assets.find((item) => item.id === assetId);
      if (!portfolioAsset) {
        portfolioAsset = { ...assetMetadata, transactions: [] };
        portfolio.assets = [portfolioAsset, ...portfolio.assets];
      }

      const transactionWithAsset: Transaction = {
        ...nextTransaction,
        assetId,
        assetSymbol: assetSymbol || assetMetadata.symbol,
        assetName: assetName || assetMetadata.name,
        assetType: assetType || assetMetadata.type,
        quantity: Number(quantity ?? 0),
      };

      portfolioAsset.transactions = [transactionWithAsset, ...portfolioAsset.transactions];
      portfolio.transactions = [transactionWithAsset, ...portfolio.transactions];
      portfolios[portfolioIndex] = { ...portfolio, assets: portfolio.assets.map((item) => (item.id === assetId ? portfolioAsset : item)) };
      await writePortfolios(portfolios);
      return NextResponse.json(portfolios[portfolioIndex]);
    }

    portfolio.transactions = [nextTransaction, ...portfolio.transactions];
    portfolios[portfolioIndex] = portfolio;
    await writePortfolios(portfolios);

    return NextResponse.json(portfolios[portfolioIndex]);
  }

  const { symbol, name, type, price } = body as { symbol: string; name: string; type: Asset["type"]; price?: number };

  if (!symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "El símbolo y el nombre son obligatorios." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const portfolioIndex = portfolios.findIndex((item) => item.id === id);

  if (portfolioIndex === -1) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  const portfolio = portfolios[portfolioIndex];
  const nextAsset: Asset = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    price: Number(price ?? 0),
    transactions: [],
  };

  portfolio.assets = [nextAsset, ...portfolio.assets];
  portfolios[portfolioIndex] = portfolio;
  await writePortfolios(portfolios);

  return NextResponse.json(portfolio);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body?.kind === "asset") {
    const { assetId, symbol, name, type, price } = body as {
      assetId: string;
      symbol: string;
      name: string;
      type: Asset["type"];
      price: number;
    };

    if (!assetId || !symbol?.trim() || !name?.trim()) {
      return NextResponse.json({ error: "Faltan datos para editar el activo." }, { status: 400 });
    }

    const portfolios = await readPortfolios();
    const portfolioIndex = portfolios.findIndex((item) => item.id === id);

    if (portfolioIndex === -1) {
      return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
    }

    const portfolio = portfolios[portfolioIndex];
    portfolio.assets = portfolio.assets.map((asset) =>
      asset.id === assetId
        ? { ...asset, symbol: symbol.trim().toUpperCase(), name: name.trim(), type, price: Number(price ?? asset.price) }
        : asset
    );

    portfolios[portfolioIndex] = portfolio;
    await writePortfolios(portfolios);

    return NextResponse.json(portfolios[portfolioIndex]);
  }

  if (body?.kind !== "transaction") {
    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  }

  const { transactionId, assetId, assetSymbol, assetName, assetType, quantity, price, date, notes, type } = body as {
    transactionId: string;
    assetId?: string;
    assetSymbol?: string;
    assetName?: string;
    assetType?: Asset["type"];
    quantity?: number;
    price: number;
    date: string;
    notes?: string;
    type: TransactionType;
  };

  if (!transactionId) {
    return NextResponse.json({ error: "El ID de la transacción es obligatorio." }, { status: 400 });
  }

  if (!type || !["buy", "sell", "cash_in", "cash_out"].includes(type)) {
    return NextResponse.json({ error: "El tipo de transacción es obligatorio." }, { status: 400 });
  }

  if ((type === "buy" || type === "sell") && (!assetId || !date || !quantity || !price)) {
    return NextResponse.json({ error: "Faltan datos para editar la transacción de activo." }, { status: 400 });
  }

  if ((type === "cash_in" || type === "cash_out") && (!date || !price)) {
    return NextResponse.json({ error: "Faltan datos para editar la transacción de efectivo." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const portfolioIndex = portfolios.findIndex((item) => item.id === id);

  if (portfolioIndex === -1) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  const portfolio = portfolios[portfolioIndex];
  const existingTransaction = portfolio.transactions.find((transaction) => transaction.id === transactionId);

  if (!existingTransaction) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  portfolio.assets = portfolio.assets.map((asset) => ({
    ...asset,
    transactions: asset.transactions.filter((transaction) => transaction.id !== transactionId),
  }));

  if (type === "buy" || type === "sell") {
    const globalAssets = await readAssets();
    const assetMetadata = globalAssets.find((item) => item.id === assetId);

    if (!assetMetadata) {
      return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
    }

    let portfolioAsset = portfolio.assets.find((item) => item.id === assetId);
    if (!portfolioAsset) {
      portfolioAsset = { ...assetMetadata, transactions: [] };
      portfolio.assets = [portfolioAsset, ...portfolio.assets];
    }

    const updatedTransaction: Transaction = {
      ...existingTransaction,
      type,
      assetId,
      assetSymbol: assetSymbol || assetMetadata.symbol,
      assetName: assetName || assetMetadata.name,
      assetType: assetType || assetMetadata.type,
      quantity: Number(quantity ?? 0),
      price: Number(price ?? 0),
      date,
      notes,
    };

    portfolio.transactions = portfolio.transactions.map((transaction) =>
      transaction.id === transactionId ? updatedTransaction : transaction
    );
    portfolioAsset.transactions = [updatedTransaction, ...portfolioAsset.transactions];
    portfolio.assets = portfolio.assets.map((item) => (item.id === assetId ? portfolioAsset : item));
    portfolios[portfolioIndex] = portfolio;
    await writePortfolios(portfolios);
    return NextResponse.json(portfolios[portfolioIndex]);
  }

  const updatedTransaction: Transaction = {
    ...existingTransaction,
    type,
    assetId: undefined,
    assetSymbol: undefined,
    assetName: undefined,
    assetType: undefined,
    quantity: undefined,
    price: Number(price ?? 0),
    date,
    notes,
  };

  portfolio.transactions = portfolio.transactions.map((transaction) =>
    transaction.id === transactionId ? updatedTransaction : transaction
  );
  portfolios[portfolioIndex] = portfolio;
  await writePortfolios(portfolios);

  return NextResponse.json(portfolios[portfolioIndex]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  if (body?.kind === "asset") {
    const { assetId } = body as { assetId: string };

    if (!assetId) {
      return NextResponse.json({ error: "El ID del activo es obligatorio." }, { status: 400 });
    }

    const portfolios = await readPortfolios();
    const portfolioIndex = portfolios.findIndex((item) => item.id === id);

    if (portfolioIndex === -1) {
      return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
    }

    const portfolio = portfolios[portfolioIndex];
    portfolio.assets = portfolio.assets.filter((asset) => asset.id !== assetId);
    portfolios[portfolioIndex] = portfolio;
    await writePortfolios(portfolios);

    return NextResponse.json(portfolios[portfolioIndex]);
  }

  if (body?.kind !== "transaction") {
    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  }

  const { transactionId } = body as { transactionId: string };

  if (!transactionId) {
    return NextResponse.json({ error: "El ID de la transacción es obligatorio." }, { status: 400 });
  }

  const portfolios = await readPortfolios();
  const portfolioIndex = portfolios.findIndex((item) => item.id === id);

  if (portfolioIndex === -1) {
    return NextResponse.json({ error: "Portfolio no encontrado." }, { status: 404 });
  }

  const portfolio = portfolios[portfolioIndex];
  portfolio.transactions = portfolio.transactions.filter((transaction) => transaction.id !== transactionId);
  portfolio.assets = portfolio.assets.map((asset) => ({
    ...asset,
    transactions: asset.transactions.filter((transaction) => transaction.id !== transactionId),
  }));

  portfolios[portfolioIndex] = portfolio;
  await writePortfolios(portfolios);

  return NextResponse.json(portfolios[portfolioIndex]);
}

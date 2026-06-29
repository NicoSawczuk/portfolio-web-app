import { NextResponse } from "next/server";
import { createAssetId, readAssets, writeAssets } from "@/lib/asset-db";
import { refreshAssetsQuotesWithCache } from "@/lib/finnhub-service";
import type { Asset } from "@/lib/portfolio";

function normalizePartnerId(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const forceRefreshRaw = requestUrl.searchParams.get("forceRefresh")?.toLowerCase();
  const forceRefresh = forceRefreshRaw === "1" || forceRefreshRaw === "true";

  const assets = await readAssets();
  const { hydratedAssets, persistedAssets, hasPersistenceChanges } = await refreshAssetsQuotesWithCache(assets, {
    forceRefresh,
  });

  if (hasPersistenceChanges) {
    await writeAssets(persistedAssets);
  }

  return NextResponse.json(hydratedAssets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { symbol, name, type, price, id_partner } = body as {
    symbol: string;
    name: string;
    type: Asset["type"];
    price?: number;
    id_partner?: number;
  };

  if (!symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "El símbolo y el nombre son obligatorios." }, { status: 400 });
  }

  const normalizedPartnerId = normalizePartnerId(id_partner);
  if (normalizedPartnerId === null) {
    return NextResponse.json({ error: "El ID partner debe ser un entero positivo." }, { status: 400 });
  }

  const assets = await readAssets();
  const newAsset: Asset = {
    id: createAssetId(),
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: Number(price ?? 0),
    transactions: [],
  };

  assets.unshift(newAsset);
  await writeAssets(assets);
  return NextResponse.json(newAsset, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, symbol, name, type, price, id_partner } = body as {
    id: string;
    symbol: string;
    name: string;
    type: Asset["type"];
    price?: number;
    id_partner?: number;
  };

  if (!id || !symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "Faltan datos para editar el activo." }, { status: 400 });
  }

  const normalizedPartnerId = normalizePartnerId(id_partner);
  if (normalizedPartnerId === null) {
    return NextResponse.json({ error: "El ID partner debe ser un entero positivo." }, { status: 400 });
  }

  const assets = await readAssets();
  const index = assets.findIndex((asset) => asset.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
  }

  assets[index] = {
    ...assets[index],
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: Number(price ?? assets[index].price),
  };

  await writeAssets(assets);
  return NextResponse.json(assets[index]);
}

export async function DELETE(request: Request) {
  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ error: "El ID es obligatorio." }, { status: 400 });
  }

  const assets = await readAssets();
  const next = assets.filter((asset) => asset.id !== id);

  if (next.length === assets.length) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
  }

  await writeAssets(next);
  return NextResponse.json({ success: true });
}

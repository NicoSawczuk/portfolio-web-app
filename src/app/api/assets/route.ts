import { NextResponse } from "next/server";
import { createAssetId, deleteAssetById, insertAsset, readAssets, updateAssetById, writeAssets } from "@/lib/asset-db";
import { refreshAssetsQuotesWithCache } from "@/lib/finnhub-service";
import { getSessionFromRequest } from "@/lib/auth";
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
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const forceRefreshRaw = requestUrl.searchParams.get("forceRefresh")?.toLowerCase();
  const forceRefresh = forceRefreshRaw === "1" || forceRefreshRaw === "true";

  const assets = await readAssets();
  if (!forceRefresh) {
    return NextResponse.json(assets);
  }

  const { hydratedAssets, persistedAssets, hasPersistenceChanges } = await refreshAssetsQuotesWithCache(assets, {
    forceRefresh: true,
  });

  if (hasPersistenceChanges) {
    await writeAssets(persistedAssets);
  }

  return NextResponse.json(hydratedAssets);
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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

  const newAsset: Asset = {
    id: createAssetId(),
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: Number(price ?? 0),
    transactions: [],
  };

  await insertAsset(newAsset);
  return NextResponse.json(newAsset, { status: 201 });
}

export async function PUT(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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

  const updated = await updateAssetById(id, {
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: Number(price ?? 0),
  });

  if (!updated) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
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

  const deleted = await deleteAssetById(id);
  if (!deleted) {
    return NextResponse.json({ error: "Activo no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { createAssetId, deleteAssetById, insertAsset, readAssets, updateAssetById, writeAssets } from "@/lib/asset-db";
import { refreshAssetsQuotesWithCache } from "@/lib/finnhub-service";
import { getSessionFromRequest } from "@/lib/auth";
import { ASSET_PERMISSIONS } from "@/lib/permissions";
import { hasUserPermission } from "@/lib/user-permissions-db";
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

function normalizePrice(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
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

  if (forceRefresh && !(await hasUserPermission(session.userId, ASSET_PERMISSIONS.REFRESH))) {
    return NextResponse.json({ error: "No tenés permiso para refrescar cotizaciones." }, { status: 403 });
  }

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

  if (!(await hasUserPermission(session.userId, ASSET_PERMISSIONS.CREATE))) {
    return NextResponse.json({ error: "No tenés permiso para crear activos." }, { status: 403 });
  }

  const body = await request.json();
  const { symbol, name, type, price, price_ars, id_partner } = body as {
    symbol: string;
    name: string;
    type: Asset["type"];
    price?: number;
    price_ars?: number;
    id_partner?: number;
  };

  if (!symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "El símbolo y el nombre son obligatorios." }, { status: 400 });
  }

  const normalizedPartnerId = normalizePartnerId(id_partner);
  if (normalizedPartnerId === null) {
    return NextResponse.json({ error: "El ID partner debe ser un entero positivo." }, { status: 400 });
  }

  const normalizedPrice = normalizePrice(price);
  const normalizedPriceArs = normalizePrice(price_ars);
  if (normalizedPrice === null || normalizedPriceArs === null) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a 0." }, { status: 400 });
  }

  const newAsset: Asset = {
    id: createAssetId(),
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: type === "cedear" ? 0 : normalizedPrice,
    price_ars: type === "cedear" ? normalizedPriceArs : undefined,
  };

  await insertAsset(newAsset);
  return NextResponse.json(newAsset, { status: 201 });
}

export async function PUT(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!(await hasUserPermission(session.userId, ASSET_PERMISSIONS.EDIT))) {
    return NextResponse.json({ error: "No tenés permiso para editar activos." }, { status: 403 });
  }

  const body = await request.json();
  const { id, symbol, name, type, price, price_ars, id_partner } = body as {
    id: string;
    symbol: string;
    name: string;
    type: Asset["type"];
    price?: number;
    price_ars?: number;
    id_partner?: number;
  };

  if (!id || !symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "Faltan datos para editar el activo." }, { status: 400 });
  }

  const normalizedPartnerId = normalizePartnerId(id_partner);
  if (normalizedPartnerId === null) {
    return NextResponse.json({ error: "El ID partner debe ser un entero positivo." }, { status: 400 });
  }

  const normalizedPrice = normalizePrice(price);
  const normalizedPriceArs = normalizePrice(price_ars);
  if (normalizedPrice === null || normalizedPriceArs === null) {
    return NextResponse.json({ error: "El precio debe ser un número mayor o igual a 0." }, { status: 400 });
  }

  const updated = await updateAssetById(id, {
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    id_partner: normalizedPartnerId,
    price: type === "cedear" ? 0 : normalizedPrice,
    price_ars: type === "cedear" ? normalizedPriceArs : undefined,
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

  if (!(await hasUserPermission(session.userId, ASSET_PERMISSIONS.DELETE))) {
    return NextResponse.json({ error: "No tenés permiso para eliminar activos." }, { status: 403 });
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

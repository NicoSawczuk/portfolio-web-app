import { NextResponse } from "next/server";
import { createAssetId, readAssets, writeAssets } from "@/lib/asset-db";
import type { Asset } from "@/lib/portfolio";

export async function GET() {
  const assets = await readAssets();
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { symbol, name, type, price } = body as { symbol: string; name: string; type: Asset["type"]; price?: number };

  if (!symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "El símbolo y el nombre son obligatorios." }, { status: 400 });
  }

  const assets = await readAssets();
  const newAsset: Asset = {
    id: createAssetId(),
    symbol: symbol.trim().toUpperCase(),
    name: name.trim(),
    type,
    price: Number(price ?? 0),
    transactions: [],
  };

  assets.unshift(newAsset);
  await writeAssets(assets);
  return NextResponse.json(newAsset, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, symbol, name, type, price } = body as { id: string; symbol: string; name: string; type: Asset["type"]; price?: number };

  if (!id || !symbol?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "Faltan datos para editar el activo." }, { status: 400 });
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

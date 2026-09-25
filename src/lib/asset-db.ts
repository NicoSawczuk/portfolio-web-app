import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getAssetCurrency } from "@/lib/portfolio";
import type { Asset, AssetCurrency } from "@/lib/portfolio";

const collectionName = "assets";

let assetsCollectionPromise: Promise<Collection<Asset>> | null = null;

async function getAssetsCollection() {
  if (!assetsCollectionPromise) {
    assetsCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<Asset>(collectionName);
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ symbol: 1 });
      return collection;
    })();
  }

  return assetsCollectionPromise;
}

function normalizeAsset(asset: Asset): Asset {
  // Legacy documents may still carry a per-asset `transactions` array.
  // It is not part of the Asset type anymore and is stripped here.
  const { transactions: _legacyTransactions, ...rest } = asset as Asset & { transactions?: unknown };
  void _legacyTransactions;
  const price = Number(rest.price);
  const priceArs = Number(rest.price_ars);
  const currency = rest.currency === "ARS" || rest.currency === "USD" ? rest.currency : undefined;
  const isArs = getAssetCurrency(rest) === "ARS";

  return {
    ...rest,
    id: rest.id || new ObjectId().toHexString(),
    currency,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    price_ars:
      isArs && Number.isFinite(priceArs) && priceArs > 0 ? priceArs : undefined,
  };
}

interface ReadAssetsOptions {
  // Portfolio views only need id/symbol/name/type/price; skips the rest of the asset payload.
  minimal?: boolean;
}

export async function readAssets(options: ReadAssetsOptions = {}): Promise<Asset[]> {
  const collection = await getAssetsCollection();
  const projection = options.minimal
    ? { _id: 0, id: 1, symbol: 1, name: 1, type: 1, currency: 1, price: 1, price_ars: 1 }
    : { _id: 0 };
  const assets = await collection.find({}, { projection }).sort({ _id: -1 }).toArray();

  return assets.map(normalizeAsset);
}

export async function readAssetById(id: string): Promise<Asset | null> {
  const collection = await getAssetsCollection();
  const asset = await collection.findOne({ id }, { projection: { _id: 0 } });
  if (!asset) {
    return null;
  }

  return normalizeAsset(asset);
}

export async function readAssetBySymbol(symbol: string): Promise<Asset | null> {
  const assets = await readAssetsBySymbol(symbol);
  return assets[0] ?? null;
}

// Todos los assets que comparten un símbolo (el catálogo puede tener duplicados
// del mismo ticker en distintas monedas, p. ej. GGAL ARS y GGAL USD).
export async function readAssetsBySymbol(symbol: string): Promise<Asset[]> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    return [];
  }

  const collection = await getAssetsCollection();
  const assets = await collection
    .find({ symbol: normalized }, { projection: { _id: 0 } })
    .map(normalizeAsset)
    .toArray();
  if (assets.length > 0) {
    return assets;
  }

  // Fallback case-insensitive para documentos legacy con símbolo en minúsculas.
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return collection
    .find({ symbol: { $regex: `^${escaped}$`, $options: "i" } }, { projection: { _id: 0 } })
    .map(normalizeAsset)
    .toArray();
}

// Resuelve el activo de una transacción buy/sell a partir del símbolo. Como el catálogo
// global admite tickers duplicados en distintas monedas (p. ej. GGAL en ARS y GGAL en
// USD), la moneda del portfolio manda: primero se reutiliza la posición que el portfolio
// ya tiene para ese símbolo en esa misma moneda, y solo si no existe se recurre al
// catálogo global prefiriendo el candidato con moneda coincidente.
export async function resolveAssetForTransaction(
  portfolioAssets: Asset[],
  symbol: string,
  portfolioCurrency: AssetCurrency
): Promise<Asset | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const existingAsset = portfolioAssets.find(
    (asset) =>
      asset.symbol?.trim().toUpperCase() === normalized &&
      getAssetCurrency(asset) === portfolioCurrency
  );
  if (existingAsset) {
    return existingAsset;
  }

  const candidates = await readAssetsBySymbol(normalized);
  return (
    candidates.find((candidate) => getAssetCurrency(candidate) === portfolioCurrency) ??
    candidates[0] ??
    null
  );
}

export async function insertAsset(asset: Asset): Promise<Asset> {
  const collection = await getAssetsCollection();
  const normalized = normalizeAsset(asset);
  await collection.insertOne(normalized);
  return normalized;
}

export async function updateAssetById(
  id: string,
  fields: Partial<Pick<Asset, "symbol" | "name" | "type" | "currency" | "id_partner" | "price" | "price_ars" | "quoteCheckedAt" | "quoteUpdatedAt">>
): Promise<Asset | null> {
  const collection = await getAssetsCollection();
  const update: Partial<Asset> = {};

  if (typeof fields.symbol === "string") {
    update.symbol = fields.symbol;
  }
  if (typeof fields.name === "string") {
    update.name = fields.name;
  }
  if (typeof fields.type === "string") {
    update.type = fields.type;
  }
  if (fields.currency === undefined || fields.currency === "ARS" || fields.currency === "USD") {
    update.currency = fields.currency;
  }
  if (fields.id_partner === undefined || typeof fields.id_partner === "number") {
    update.id_partner = fields.id_partner;
  }
  if (typeof fields.price === "number") {
    update.price = fields.price;
  }
  if (fields.price_ars === undefined || typeof fields.price_ars === "number") {
    update.price_ars = fields.price_ars;
  }
  if (fields.quoteCheckedAt === undefined || typeof fields.quoteCheckedAt === "string") {
    update.quoteCheckedAt = fields.quoteCheckedAt;
  }
  if (fields.quoteUpdatedAt === undefined || typeof fields.quoteUpdatedAt === "string") {
    update.quoteUpdatedAt = fields.quoteUpdatedAt;
  }

  if (Object.keys(update).length === 0) {
    return readAssetById(id);
  }

  const result = await collection.findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result ? normalizeAsset(result) : null;
}

export async function deleteAssetById(id: string): Promise<boolean> {
  const collection = await getAssetsCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function writeAssets(assets: Asset[]) {
  const collection = await getAssetsCollection();
  const normalizedAssets = assets.map(normalizeAsset);

  if (normalizedAssets.length === 0) {
    await collection.deleteMany({});
    return;
  }

  await collection.bulkWrite(
    normalizedAssets.map((asset) => ({
      updateOne: {
        filter: { id: asset.id },
        update: { $set: asset },
        upsert: true,
      },
    }))
  );
}

export function createAssetId() {
  return new ObjectId().toHexString();
}

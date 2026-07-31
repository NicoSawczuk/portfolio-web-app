import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { Asset } from "@/lib/portfolio";

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
  return {
    ...asset,
    id: asset.id || new ObjectId().toHexString(),
    transactions: asset.transactions ?? [],
  };
}

export async function readAssets(): Promise<Asset[]> {
  const collection = await getAssetsCollection();
  const assets = await collection.find({}, { projection: { _id: 0 } }).sort({ _id: -1 }).toArray();

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

export async function insertAsset(asset: Asset): Promise<Asset> {
  const collection = await getAssetsCollection();
  const normalized = normalizeAsset(asset);
  await collection.insertOne(normalized);
  return normalized;
}

export async function updateAssetById(
  id: string,
  fields: Partial<Pick<Asset, "symbol" | "name" | "type" | "id_partner" | "price" | "quoteCheckedAt" | "quoteUpdatedAt">>
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
  if (fields.id_partner === undefined || typeof fields.id_partner === "number") {
    update.id_partner = fields.id_partner;
  }
  if (typeof fields.price === "number") {
    update.price = fields.price;
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

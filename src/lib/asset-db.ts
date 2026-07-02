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

export async function readAssets(): Promise<Asset[]> {
  const collection = await getAssetsCollection();
  const assets = await collection.find({}, { projection: { _id: 0 } }).sort({ _id: -1 }).toArray();

  return assets.map((asset) => ({
    ...asset,
    transactions: asset.transactions ?? [],
  }));
}

export async function writeAssets(assets: Asset[]) {
  const collection = await getAssetsCollection();
  const normalizedAssets = assets.map((asset) => ({
    ...asset,
    id: asset.id || new ObjectId().toHexString(),
    transactions: asset.transactions ?? [],
  }));

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

  await collection.deleteMany({
    id: {
      $nin: normalizedAssets.map((asset) => asset.id),
    },
  });
}

export function createAssetId() {
  return new ObjectId().toHexString();
}

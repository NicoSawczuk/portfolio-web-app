import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { Portfolio } from "@/lib/portfolio";

const collectionName = "portfolios";

let portfoliosCollectionPromise: Promise<Collection<Portfolio>> | null = null;

async function getPortfoliosCollection() {
  if (!portfoliosCollectionPromise) {
    portfoliosCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<Portfolio>(collectionName);
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ createdAt: -1 });
      return collection;
    })();
  }

  return portfoliosCollectionPromise;
}

export async function readPortfolios(): Promise<Portfolio[]> {
  const collection = await getPortfoliosCollection();
  const portfolios = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();

  return portfolios.map((portfolio) => ({
    ...portfolio,
    assets: portfolio.assets ?? [],
    transactions: portfolio.transactions ?? [],
  }));
}

export async function writePortfolios(portfolios: Portfolio[]) {
  const collection = await getPortfoliosCollection();
  const normalizedPortfolios = portfolios.map((portfolio) => ({
    ...portfolio,
    id: portfolio.id || new ObjectId().toHexString(),
    assets: portfolio.assets ?? [],
    transactions: portfolio.transactions ?? [],
  }));

  if (normalizedPortfolios.length === 0) {
    await collection.deleteMany({});
    return;
  }

  await collection.bulkWrite(
    normalizedPortfolios.map((portfolio) => ({
      updateOne: {
        filter: { id: portfolio.id },
        update: { $set: portfolio },
        upsert: true,
      },
    }))
  );

  await collection.deleteMany({
    id: {
      $nin: normalizedPortfolios.map((portfolio) => portfolio.id),
    },
  });
}

export function createPortfolioId() {
  return new ObjectId().toHexString();
}

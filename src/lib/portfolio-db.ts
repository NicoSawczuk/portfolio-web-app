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

function normalizePortfolio(portfolio: Portfolio): Portfolio {
  return {
    ...portfolio,
    id: portfolio.id || new ObjectId().toHexString(),
    managesCash: Boolean(portfolio.managesCash),
    assets: portfolio.assets ?? [],
    transactions: portfolio.transactions ?? [],
  };
}

export async function readPortfolios(): Promise<Portfolio[]> {
  const collection = await getPortfoliosCollection();
  const portfolios = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();

  return portfolios.map(normalizePortfolio);
}

export async function readPortfolioById(id: string): Promise<Portfolio | null> {
  const collection = await getPortfoliosCollection();
  const portfolio = await collection.findOne({ id }, { projection: { _id: 0 } });
  if (!portfolio) {
    return null;
  }

  return normalizePortfolio(portfolio);
}

export async function insertPortfolio(portfolio: Portfolio): Promise<Portfolio> {
  const collection = await getPortfoliosCollection();
  const normalized = normalizePortfolio(portfolio);
  await collection.insertOne(normalized);
  return normalized;
}

export async function replacePortfolioById(id: string, portfolio: Portfolio): Promise<Portfolio | null> {
  const collection = await getPortfoliosCollection();
  const normalized = normalizePortfolio({ ...portfolio, id });
  const result = await collection.replaceOne({ id }, normalized);
  if (result.matchedCount === 0) {
    return null;
  }

  return normalized;
}

export async function updatePortfolioFields(
  id: string,
  fields: Partial<Pick<Portfolio, "name" | "description" | "managesCash">>
): Promise<Portfolio | null> {
  const collection = await getPortfoliosCollection();
  const update: Partial<Portfolio> = {};

  if (typeof fields.name === "string") {
    update.name = fields.name;
  }
  if (typeof fields.description === "string") {
    update.description = fields.description;
  }
  if (typeof fields.managesCash === "boolean") {
    update.managesCash = fields.managesCash;
  }

  if (Object.keys(update).length === 0) {
    return readPortfolioById(id);
  }

  const result = await collection.findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: "after", projection: { _id: 0 } }
  );

  return result ? normalizePortfolio(result) : null;
}

export async function deletePortfolioById(id: string): Promise<boolean> {
  const collection = await getPortfoliosCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function writePortfolios(portfolios: Portfolio[]) {
  const collection = await getPortfoliosCollection();
  const normalizedPortfolios = portfolios.map(normalizePortfolio);

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

import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const collectionName = "dollar_quotes";
const dailyChecksCollectionName = "dollar_quote_daily_checks";

export type DollarQuoteSource = "api" | "manual";

export interface DollarQuote {
  id: string;
  buy: number;
  sell: number;
  datetime: string;
  source?: DollarQuoteSource;
}

let dollarQuotesCollectionPromise: Promise<Collection<DollarQuote>> | null = null;
let dailyChecksCollectionPromise: Promise<Collection<{ date: string; checkedAt: string }>> | null = null;

async function getDollarQuotesCollection() {
  if (!dollarQuotesCollectionPromise) {
    dollarQuotesCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<DollarQuote>(collectionName);
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ datetime: -1 });
      return collection;
    })();
  }

  return dollarQuotesCollectionPromise;
}

async function getDailyChecksCollection() {
  if (!dailyChecksCollectionPromise) {
    dailyChecksCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<{ date: string; checkedAt: string }>(dailyChecksCollectionName);
      await collection.createIndex({ date: 1 }, { unique: true });
      return collection;
    })();
  }

  return dailyChecksCollectionPromise;
}

function normalizeDollarQuote(doc: DollarQuote): DollarQuote {
  return {
    id: doc.id || new ObjectId().toHexString(),
    buy: Number(doc.buy),
    sell: Number(doc.sell),
    datetime: doc.datetime,
    ...(doc.source ? { source: doc.source } : {}),
  };
}

export async function readLatestDollarQuote(): Promise<DollarQuote | null> {
  const collection = await getDollarQuotesCollection();
  const doc = await collection.findOne({}, { projection: { _id: 0 }, sort: { datetime: -1, _id: -1 } });
  return doc ? normalizeDollarQuote(doc) : null;
}

export async function readDollarQuotesHistory(): Promise<DollarQuote[]> {
  const collection = await getDollarQuotesCollection();
  const docs = await collection.find({}, { projection: { _id: 0 } }).sort({ datetime: -1, _id: -1 }).toArray();
  return docs.map(normalizeDollarQuote);
}

export async function countDollarQuotes(): Promise<number> {
  const collection = await getDollarQuotesCollection();
  return collection.countDocuments({});
}

export async function insertDollarQuote(input: {
  buy: number;
  sell: number;
  datetime: string;
  source?: DollarQuoteSource;
}): Promise<DollarQuote> {
  const collection = await getDollarQuotesCollection();
  const normalized = normalizeDollarQuote({
    id: new ObjectId().toHexString(),
    buy: input.buy,
    sell: input.sell,
    datetime: input.datetime,
    ...(input.source ? { source: input.source } : {}),
  });
  await collection.insertOne({ ...normalized });
  return normalized;
}

export async function deleteDollarQuoteById(id: string): Promise<boolean> {
  const collection = await getDollarQuotesCollection();
  const result = await collection.deleteOne({ id });
  return result.deletedCount > 0;
}

export async function hasDailyDollarCheck(dateKey: string): Promise<boolean> {
  const collection = await getDailyChecksCollection();
  const doc = await collection.findOne({ date: dateKey }, { projection: { _id: 0, date: 1 } });
  return Boolean(doc);
}

export async function recordDailyDollarCheck(dateKey: string): Promise<void> {
  const collection = await getDailyChecksCollection();
  await collection.updateOne(
    { date: dateKey },
    { $setOnInsert: { date: dateKey, checkedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export function createDollarQuoteId() {
  return new ObjectId().toHexString();
}

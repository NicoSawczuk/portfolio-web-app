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

export async function readDollarQuotesHistory(
  page = 1,
  pageSize = 20,
  search = ""
): Promise<{ quotes: DollarQuote[]; total: number }> {
  const collection = await getDollarQuotesCollection();
  const filter = buildSearchFilter(search);
  const total = await collection.countDocuments(filter);
  const docs = await collection
    .find(filter, { projection: { _id: 0 } })
    .sort({ datetime: -1, _id: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return { quotes: docs.map(normalizeDollarQuote), total };
}

function buildSearchFilter(search: string) {
  if (!search.trim()) return {};
  const tokens = search
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return {};
  const regexPatterns = tokens.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  return {
    $or: [
      { datetime: { $in: regexPatterns } },
      { id: { $in: regexPatterns } },
    ],
  };
}

export async function countDollarQuotes(search = ""): Promise<number> {
  const collection = await getDollarQuotesCollection();
  return collection.countDocuments(buildSearchFilter(search));
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

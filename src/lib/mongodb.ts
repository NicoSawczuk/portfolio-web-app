import { Db, MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const MONGODB_DATABASE = process.env.MONGODB_DATABASE?.trim();

if (!MONGODB_URI) {
  throw new Error("Falta configurar MONGODB_URI.");
}

if (!MONGODB_DATABASE) {
  throw new Error("Falta configurar MONGODB_DATABASE.");
}

if (MONGODB_URI.includes("${")) {
  throw new Error("MONGODB_URI contiene placeholders sin expandir. En Vercel debes guardar el URI final completo.");
}

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise = global.__mongoClientPromise ?? new MongoClient(MONGODB_URI).connect();

if (process.env.NODE_ENV !== "production") {
  global.__mongoClientPromise = clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(MONGODB_DATABASE);
}

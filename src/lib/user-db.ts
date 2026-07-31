import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { hashPassword, normalizeEmail } from "@/lib/auth";

const collectionName = "users";

let usersCollectionPromise: Promise<Collection<UserDocument>> | null = null;

interface UserDocument {
  id: string;
  email: string;
  name: string;
  password: string;
  expiration_date: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  expiration_date: string;
}

async function getUsersCollection() {
  if (!usersCollectionPromise) {
    usersCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<UserDocument>(collectionName);
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ email: 1 }, { unique: true });
      await collection.createIndex({ expiration_date: 1 });
      return collection;
    })();
  }

  return usersCollectionPromise;
}

function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    expiration_date: user.expiration_date,
  };
}

export async function findUserByEmail(email: string) {
  const collection = await getUsersCollection();
  const normalized = normalizeEmail(email);
  return collection.findOne({ email: normalized }, { projection: { _id: 0 } });
}

export async function createUser(params: {
  email: string;
  name: string;
  password: string;
  expirationDateIso: string;
}) {
  const collection = await getUsersCollection();
  const now = new Date().toISOString();

  const user: UserDocument = {
    id: new ObjectId().toHexString(),
    email: normalizeEmail(params.email),
    name: params.name.trim(),
    password: await hashPassword(params.password),
    expiration_date: params.expirationDateIso,
    createdAt: now,
  };

  await collection.insertOne(user);
  return toPublicUser(user);
}

export function mapUserDocumentToPublic(user: UserDocument): PublicUser {
  return toPublicUser(user);
}

import { Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { PermissionAction } from "@/lib/permissions";

const collectionName = "users_permissions";

let userPermissionsCollectionPromise: Promise<Collection<UserPermissionDocument>> | null =
  null;

export interface UserPermissionDocument {
  userId: string;
  action: string;
  createdAt: string;
}

function normalizeAction(action: string) {
  return action.trim().toLowerCase();
}

async function getUserPermissionsCollection() {
  if (!userPermissionsCollectionPromise) {
    userPermissionsCollectionPromise = (async () => {
      const db = await getDb();
      const collection = db.collection<UserPermissionDocument>(collectionName);
      await collection.createIndex({ userId: 1, action: 1 }, { unique: true });
      await collection.createIndex({ userId: 1 });
      await collection.createIndex({ action: 1 });
      return collection;
    })();
  }

  return userPermissionsCollectionPromise;
}

export async function getUserPermissionActions(userId: string): Promise<string[]> {
  if (!userId) {
    return [];
  }

  const collection = await getUserPermissionsCollection();
  const docs = await collection
    .find({ userId }, { projection: { _id: 0, action: 1 } })
    .toArray();

  return docs.map((doc) => normalizeAction(String(doc.action))).filter(Boolean);
}

export async function hasUserPermission(
  userId: string,
  action: PermissionAction
): Promise<boolean> {
  if (!userId || !action) {
    return false;
  }

  const collection = await getUserPermissionsCollection();
  const doc = await collection.findOne(
    { userId, action: normalizeAction(action) },
    { projection: { _id: 0, userId: 1 } }
  );

  return doc !== null;
}

export async function getUserAssetPermissions(userId: string) {
  const actions = await getUserPermissionActions(userId);
  const set = new Set(actions);

  return {
    canCreate: set.has("assets:create"),
    canEdit: set.has("assets:edit"),
    canDelete: set.has("assets:delete"),
    canRefresh: set.has("assets:refresh"),
  };
}

export async function getUserDollarPermissions(userId: string) {
  const actions = await getUserPermissionActions(userId);
  const set = new Set(actions);

  return {
    canCreate: set.has("dollar:create"),
    canEdit: set.has("dollar:edit"),
    canDelete: set.has("dollar:delete"),
  };
}

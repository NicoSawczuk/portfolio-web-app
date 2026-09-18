export const ASSET_PERMISSIONS = {
  CREATE: "assets:create",
  EDIT: "assets:edit",
  DELETE: "assets:delete",
  REFRESH: "assets:refresh",
} as const;

export type AssetPermissionAction =
  (typeof ASSET_PERMISSIONS)[keyof typeof ASSET_PERMISSIONS];

export const N8N_PERMISSIONS = {
  TRANSACTIONS_CREATE: "n8n_transactions:create",
} as const;

export type N8nPermissionAction =
  (typeof N8N_PERMISSIONS)[keyof typeof N8N_PERMISSIONS];

export type PermissionAction = AssetPermissionAction | N8nPermissionAction;

export const ASSET_PERMISSION_SET: ReadonlySet<string> = new Set<string>(
  Object.values(ASSET_PERMISSIONS)
);

export function isAssetPermission(action: string): action is AssetPermissionAction {
  return ASSET_PERMISSION_SET.has(action);
}

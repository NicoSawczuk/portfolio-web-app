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

export const DOLLAR_PERMISSIONS = {
  CREATE: "dollar:create",
  EDIT: "dollar:edit",
  DELETE: "dollar:delete",
} as const;

export type DollarPermissionAction =
  (typeof DOLLAR_PERMISSIONS)[keyof typeof DOLLAR_PERMISSIONS];

export type PermissionAction = AssetPermissionAction | N8nPermissionAction | DollarPermissionAction;

export const ASSET_PERMISSION_SET: ReadonlySet<string> = new Set<string>(
  Object.values(ASSET_PERMISSIONS)
);

export function isAssetPermission(action: string): action is AssetPermissionAction {
  return ASSET_PERMISSION_SET.has(action);
}

export const DOLLAR_PERMISSION_SET: ReadonlySet<string> = new Set<string>(
  Object.values(DOLLAR_PERMISSIONS)
);

export function isDollarPermission(action: string): action is DollarPermissionAction {
  return DOLLAR_PERMISSION_SET.has(action);
}

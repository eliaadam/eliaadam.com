import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.inventory`'s REST API
 * (`/api/inventory/...`). Response shapes match `_item_to_dict()`
 * exactly, confirmed against the real backend views.py.
 */

export type InventoryItemStatus = "draft" | "active" | "archived";

export interface InventoryPrice {
  base_amount: number;
  currency: string;
  tax_amount: number;
  transport_amount: number;
  discount_percent: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  is_free: boolean;
}

export interface BrandingAsset {
  file_id: string;
  role: string;
}

export interface InventoryItem {
  id: string;
  container_id: string;
  title: string;
  item_type: string;
  description: string | null;
  price: InventoryPrice;
  branding: { assets: BrandingAsset[] };
  status: InventoryItemStatus;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
}

export interface CreateInventoryItemInput {
  title: string;
  item_type: string;
  description?: string;
  base_amount?: number;
  currency?: string;
  tax_amount?: number;
  transport_amount?: number;
  discount_percent?: number;
}

export interface UpdateInventoryItemInput {
  title?: string;
  description?: string;
  base_amount?: number;
  currency?: string;
  tax_amount?: number;
  transport_amount?: number;
  discount_percent?: number;
}

async function listItems(
  containerId: string,
  status?: string,
): Promise<InventoryItem[]> {
  const query = status ? `?status=${status}` : "";
  const result = await api.get<{ results: InventoryItem[] }>(
    `/api/inventory/containers/${containerId}/items/${query}`,
  );
  return result.results;
}

function getItem(itemId: string): Promise<InventoryItem> {
  return api.get<InventoryItem>(`/api/inventory/items/${itemId}/`);
}

function createItem(
  containerId: string,
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  return api.post<InventoryItem>(
    `/api/inventory/containers/${containerId}/items/`,
    input,
  );
}

function updateItem(
  itemId: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  return api.post<InventoryItem>(
    `/api/inventory/items/${itemId}/update/`,
    input,
  );
}

function setBranding(
  itemId: string,
  assets: BrandingAsset[],
): Promise<InventoryItem> {
  return api.post<InventoryItem>(`/api/inventory/items/${itemId}/branding/`, {
    assets,
  });
}

/**
 * Uploads a file to Document's generic upload endpoint and returns
 * its new file_id. Doesn't itself attach anything — the caller is
 * responsible for adding {file_id, role} to the item's existing
 * branding.assets and calling setBranding() with the full updated
 * list (setBranding replaces the whole assets list, it doesn't
 * append — matches the backend's own contract).
 */
function uploadBrandingAsset(
  file: File,
): Promise<{ file_id: string; filename: string; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return api.uploadMultipart("/api/document/files/upload/", formData);
}

function publishItem(itemId: string): Promise<InventoryItem> {
  return api.post<InventoryItem>(`/api/inventory/items/${itemId}/publish/`);
}

function archiveItem(itemId: string): Promise<InventoryItem> {
  return api.post<InventoryItem>(`/api/inventory/items/${itemId}/archive/`);
}

export const inventory = {
  listItems,
  getItem,
  createItem,
  updateItem,
  setBranding,
  uploadBrandingAsset,
  publishItem,
  archiveItem,
};

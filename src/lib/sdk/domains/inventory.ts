import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.inventory`'s REST API
 * (`/api/inventory/...`). Response shapes match `_item_to_dict()`/
 * `_participant_to_dict()` exactly, confirmed against the real backend
 * views.py.
 *
 * OWNERSHIP RETROFIT — the old owner_status: "assigned"|"unassigned"|
 * "shared" field is GONE, replaced by an `ownership` object carrying
 * the real four-shape model (domains/foundations/ownership_shapes) —
 * "container"|"personal"|"container_shared"|"shared". Unlike the old
 * owner_status, current ownership can no longer be derived purely from
 * fields already on the item (created_by_actor_id is audit-only now) —
 * ownership.is_owned_by_me is computed SERVER-SIDE and included
 * directly on every item response specifically so the frontend never
 * needs a separate per-item request just to know whether to show
 * management controls.
 */

export type InventoryItemStatus = "draft" | "active" | "archived";
export type OwnershipShape =
  "container" | "personal" | "container_shared" | "shared";
export type ParticipantRole = "owner" | "admin" | "member";
export type ParticipantStatus = "active" | "removed";

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

export interface ItemOwnership {
  shape: OwnershipShape;
  container_owner_id: string | null;
  label: string | null;
  allows_participants: boolean;
  is_owned_by_me: boolean | null;
}

export interface InventoryItem {
  id: string;
  container_id: string;
  title: string;
  item_type: string;
  description: string | null;
  price: InventoryPrice;
  branding: { assets: BrandingAsset[] };
  ownership: ItemOwnership;
  status: InventoryItemStatus;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
}

export interface Participant {
  id: string;
  resource_id: string;
  actor_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  added_by_actor_id: string | null;
  joined_at: string | null;
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
  owner_type?: OwnershipShape;
  /** Only meaningful for "container"/"container_shared" — defaults to
   * the item's own container_id server-side if omitted for those two
   * shapes. */
  container_owner_id?: string;
  /** Required by the backend for "personal"/"shared" — there can be
   * many, and they need a human-readable name to tell apart. */
  label?: string;
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
): Promise<{ id: string; filename: string; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return api.uploadMultipart("/api/document/files/", formData);
}

function publishItem(itemId: string): Promise<InventoryItem> {
  return api.post<InventoryItem>(`/api/inventory/items/${itemId}/publish/`);
}

function archiveItem(itemId: string): Promise<InventoryItem> {
  return api.post<InventoryItem>(`/api/inventory/items/${itemId}/archive/`);
}

async function listParticipants(itemId: string): Promise<Participant[]> {
  const result = await api.get<{ results: Participant[] }>(
    `/api/inventory/items/${itemId}/participants/`,
  );
  return result.results;
}

function addParticipant(
  itemId: string,
  actorId: string,
  role: "admin" | "member" = "member",
): Promise<Participant> {
  return api.post<Participant>(
    `/api/inventory/items/${itemId}/participants/add/`,
    { actor_id: actorId, role },
  );
}

function removeParticipant(
  itemId: string,
  actorId: string,
): Promise<Participant> {
  return api.post<Participant>(
    `/api/inventory/items/${itemId}/participants/remove/`,
    { actor_id: actorId },
  );
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
  listParticipants,
  addParticipant,
  removeParticipant,
};

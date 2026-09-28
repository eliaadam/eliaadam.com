import { api } from "../../query/Api";

/**
 * Typed client for the inventory CATALOG extension
 * (`/api/inventory/...` — same prefix as `inventory.ts`, different routes):
 * item attributes (SKU, barcode, expiry…), reserved generic fields with
 * per-container labels, and nesting of products/services into a tree.
 * Lives in its own file — `inventory.ts` is untouched.
 *
 * Attribute and nesting updates are PARTIAL: send only the keys you want to
 * change. `null` (or "") clears a field; a key you don't send is left alone;
 * an unknown key is rejected with a 400 rather than silently ignored.
 */

export type ExpiryStatus = "expired" | "expiring_soon" | "ok";
export type SlotType = "text" | "number" | "date" | "flag";

export const TEXT_SLOTS = ["text_1", "text_2", "text_3", "text_4", "text_5"] as const;
export const NUMBER_SLOTS = ["number_1", "number_2", "number_3"] as const;
export const DATE_SLOTS = ["date_1", "date_2"] as const;
export const FLAG_SLOTS = ["flag_1", "flag_2"] as const;
export type SlotName =
  | (typeof TEXT_SLOTS)[number]
  | (typeof NUMBER_SLOTS)[number]
  | (typeof DATE_SLOTS)[number]
  | (typeof FLAG_SLOTS)[number];

export type SlotValue = string | number | boolean;

export interface ItemAttributes {
  item_id: string;
  container_id: string;
  sku: string | null;
  barcode: string | null;
  unit: string | null;
  brand: string | null;
  manufacturer: string | null;
  batch_number: string | null;
  manufactured_date: string | null;
  expiry_date: string | null;
  expiry_status: ExpiryStatus | null;
  days_until_expiry: number | null;
  tags: string[];
  /** Only the reserved slots that hold a value. */
  slots: Partial<Record<SlotName, SlotValue>>;
  custom: Record<string, unknown>;
  updated_at: string | null;
}

export type StandardTextField =
  "sku" | "barcode" | "unit" | "brand" | "manufacturer" | "batch_number";

export type AttributeChanges = Partial<Record<StandardTextField, string | null>> &
  Partial<{
    manufactured_date: string | null;
    expiry_date: string | null;
    tags: string[];
    custom: Record<string, unknown>;
  }> &
  Partial<Record<SlotName, SlotValue | null>>;

export interface FieldSlot {
  slot: SlotName;
  type: SlotType;
  /** false = this container hasn't named the slot. */
  defined: boolean;
  label: string | null;
  help_text: string;
  is_active: boolean;
  position: number;
}

export interface ItemNode {
  parent_item_id: string | null;
  position: number;
  quantity_in_parent: number;
  is_bundle: boolean;
}

export interface ItemSummary {
  id: string;
  container_id: string;
  title: string;
  item_type: string;
  status: "draft" | "active" | "archived";
  is_published: boolean;
  /** Integer minor units, discount already applied. */
  price: { total: number; currency: string; is_free: boolean };
}

export interface TreeItem extends ItemSummary {
  node: ItemNode;
  /** Bundles only: sum of (component total × quantity), minor units. */
  components_total: number | null;
  sku: string | null;
  unit: string | null;
  expiry_date: string | null;
  expiry_status: ExpiryStatus | null;
  children: TreeItem[];
}

export interface NestingDetail {
  node: ItemNode;
  /** Ancestors, root first. */
  breadcrumb: { id: string; title: string }[];
  children: (ItemSummary & { node: ItemNode })[];
  components_total: number | null;
}

export type NestingChanges = Partial<{
  /** null un-nests the item back to a root. */
  parent_item_id: string | null;
  quantity_in_parent: number;
  is_bundle: boolean;
  position: number;
}>;

export interface ItemWithAttributes {
  item: ItemSummary;
  attributes: ItemAttributes;
}

export interface SaveFieldDefinitionInput {
  label: string;
  help_text?: string;
  is_active?: boolean;
  position?: number;
}

// -- attributes --------------------------------------------------------

/** Any authenticated caller (same as item detail). An item with nothing
 * saved yet reads as an empty set. */
function getAttributes(itemId: string): Promise<ItemAttributes> {
  return api.get<ItemAttributes>(`/api/inventory/items/${itemId}/attributes/`);
}

/** The item's participant-owner, or `core.inventory.item.manage`. 409 on a
 * SKU already used in this container. */
function updateAttributes(itemId: string, changes: AttributeChanges): Promise<ItemAttributes> {
  return api.post<ItemAttributes>(`/api/inventory/items/${itemId}/attributes/update/`, changes);
}

// -- nesting -----------------------------------------------------------

function getNesting(itemId: string): Promise<NestingDetail> {
  return api.get<NestingDetail>(`/api/inventory/items/${itemId}/nesting/`);
}

/** Needs rights on the item AND on the new parent. 409 for a cycle or more
 * than 5 levels; 400 for a parent in another container. */
function updateNesting(itemId: string, changes: NestingChanges): Promise<ItemNode> {
  return api.post<ItemNode>(`/api/inventory/items/${itemId}/nesting/update/`, changes);
}

/** Every item in the container as a nested tree (all statuses). */
async function getItemTree(containerId: string): Promise<TreeItem[]> {
  const r = await api.get<{ results: TreeItem[] }>(`/api/inventory/containers/${containerId}/items/tree/`);
  return r.results;
}

// -- container-wide (needs core.inventory.item.manage) ------------------

/** Find items by SKU and/or barcode (e.g. a POS scan). A barcode isn't
 * unique, so several items can match. */
async function lookupItems(
  containerId: string,
  key: { sku?: string; barcode?: string },
): Promise<ItemWithAttributes[]> {
  const params = new URLSearchParams();
  if (key.sku) params.set("sku", key.sku);
  if (key.barcode) params.set("barcode", key.barcode);
  const r = await api.get<{ results: ItemWithAttributes[] }>(
    `/api/inventory/containers/${containerId}/items/lookup/?${params.toString()}`,
  );
  return r.results;
}

/** Items expiring within N days (default 30) or before a date — INCLUDING
 * already-expired ones; archived items are left out; soonest first. */
async function listExpiring(
  containerId: string,
  when: { withinDays?: number; before?: string } = {},
): Promise<{ cutoff: string; results: ItemWithAttributes[] }> {
  const params = new URLSearchParams();
  if (when.before) params.set("before", when.before);
  else if (when.withinDays !== undefined) params.set("within_days", String(when.withinDays));
  const qs = params.toString();
  return api.get<{ cutoff: string; results: ItemWithAttributes[] }>(
    `/api/inventory/containers/${containerId}/items/expiring/${qs ? `?${qs}` : ""}`,
  );
}

// -- field labels -------------------------------------------------------

/** All 12 reserved slots with this container's label for each. */
async function listFieldSlots(containerId: string): Promise<FieldSlot[]> {
  const r = await api.get<{ results: FieldSlot[] }>(`/api/inventory/containers/${containerId}/field-slots/`);
  return r.results;
}

/** Name a slot for this container. Needs `core.inventory.item.manage`. */
function saveFieldDefinition(
  containerId: string,
  slot: SlotName,
  input: SaveFieldDefinitionInput,
): Promise<FieldSlot> {
  return api.post<FieldSlot>(`/api/inventory/containers/${containerId}/field-definitions/${slot}/`, input);
}

function removeFieldDefinition(containerId: string, slot: SlotName): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/inventory/containers/${containerId}/field-definitions/${slot}/remove/`,
  );
}

export const inventoryCatalog = {
  getAttributes, updateAttributes,
  getNesting, updateNesting, getItemTree,
  lookupItems, listExpiring,
  listFieldSlots, saveFieldDefinition, removeFieldDefinition,
};

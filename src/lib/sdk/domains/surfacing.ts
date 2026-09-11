import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.surfacing`'s REST API
 * (`/api/surfacing/...`).
 *
 * List-returning endpoints wrap in `{"data": [...]}"`, auto-unwrapped
 * by `api.get()` — type as the final shape, never as `{ data: T }`
 * (see the development guide's own note on the double-unwrap bug this
 * codebase already hit once).
 */

export type ListingStatus = "draft" | "active" | "archived";
export type PricingMode = "free" | "one_time" | "subscription";
export type VisibilityScope = "container_only" | "members" | "system";
export type PurchaseStatus =
  | "completed"
  | "payment_failed"
  | "fulfillment_failed"
  | "subscribed"
  | "subscription_failed";

export interface Listing {
  id: string;
  container_id: string;
  created_by_actor_id: string;
  source_capability: string;
  source_type: string;
  source_id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  payout_wallet_id: string;
  pricing_mode: PricingMode;
  subscription_plan_id: string | null;
  visibility_scope: VisibilityScope;
  images: string[];
  status: ListingStatus;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface Purchase {
  id: string;
  listing_id: string;
  buyer_actor_id: string;
  paying_wallet_id: string;
  price_paid: number;
  currency: string;
  status: PurchaseStatus;
  fulfillment_result: Record<string, unknown> | null;
  subscription_id: string | null;
  source_capability: string | null;
  source_type: string | null;
  created_at: string | null;
}

export interface CreateListingInput {
  container_id: string;
  payout_wallet_id: string;
  pricing_mode?: PricingMode;
  subscription_plan_id?: string;
  /** Who can see this in the global marketplace browse. Defaults to
   * "system" server-side if omitted. */
  visibility_scope?: VisibilityScope;
  // THREE ways to supply a listing's content (matches the backend's
  // own CreateListingDto exactly):
  //   1. catalog_capability + catalog_item_id — the general
  //      mechanism, works for ANY capability registered in
  //      catalog_registry (General Inventory, General Events,
  //      anything future).
  //   2. inventory_item_id — legacy sugar for
  //      catalog_capability="core.inventory", kept for backward
  //      compatibility.
  //   3. source_capability/source_type/source_id + title/price/
  //      currency, supplied manually — for something with no
  //      catalog item behind it at all.
  catalog_capability?: string;
  catalog_item_id?: string;
  inventory_item_id?: string;
  source_capability?: string;
  source_type?: string;
  source_id?: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  images?: string[];
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
}

// -- Listings -------------------------------------------------------------

export interface ListingCategory {
  source_capability: string;
  source_type: string;
}

async function browseMarketplace(
  search?: string,
  category?: ListingCategory,
): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category) {
    params.set("source_capability", category.source_capability);
    params.set("source_type", category.source_type);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  return api.get<Listing[]>(`/api/surfacing/marketplace/${query}`);
}

async function listCategories(): Promise<ListingCategory[]> {
  return api.get<ListingCategory[]>("/api/surfacing/categories/");
}

/**
 * A container's own PUBLIC storefront — distinct from
 * listListingsForContainer(), which is the owner's admin view (every
 * status, no visibility filtering, requires manage permission). This
 * is open to any authenticated actor, same as browseMarketplace, and
 * additionally includes "container_only"-scoped listings that never
 * appear in the global browse at all.
 */
async function browseContainerMarketplace(
  containerId: string,
  search?: string,
): Promise<Listing[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return api.get<Listing[]>(
    `/api/surfacing/containers/${containerId}/marketplace/${query}`,
  );
}

async function listListingsForContainer(
  containerId: string,
  status: string = "active",
): Promise<Listing[]> {
  return api.get<Listing[]>(
    `/api/surfacing/containers/${containerId}/listings/?status=${status}`,
  );
}

function getListing(listingId: string): Promise<Listing> {
  return api.get<Listing>(`/api/surfacing/listings/${listingId}/`);
}

function createListing(input: CreateListingInput): Promise<Listing> {
  return api.post<Listing>("/api/surfacing/listings/", input);
}

function updateListing(
  listingId: string,
  input: UpdateListingInput,
): Promise<Listing> {
  return api.patch<Listing>(
    `/api/surfacing/listings/${listingId}/update/`,
    input,
  );
}

function publishListing(listingId: string): Promise<Listing> {
  return api.post<Listing>(`/api/surfacing/listings/${listingId}/publish/`);
}

function archiveListing(listingId: string): Promise<Listing> {
  return api.post<Listing>(`/api/surfacing/listings/${listingId}/archive/`);
}

// -- Purchases --------------------------------------------------------------

function purchase(input: {
  listing_id: string;
  paying_wallet_id: string;
}): Promise<Purchase> {
  return api.post<Purchase>("/api/surfacing/purchase/", input);
}

async function listMyPurchases(): Promise<Purchase[]> {
  return api.get<Purchase[]>("/api/surfacing/my-purchases/");
}

export const surfacing = {
  browseMarketplace,
  browseContainerMarketplace,
  listCategories,
  listListingsForContainer,
  getListing,
  createListing,
  updateListing,
  publishListing,
  archiveListing,
  purchase,
  listMyPurchases,
};
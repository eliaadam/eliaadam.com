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
  created_at: string | null;
}

export interface CreateListingInput {
  container_id: string;
  payout_wallet_id: string;
  pricing_mode?: PricingMode;
  subscription_plan_id?: string;
  // Either seed from an existing General Inventory item (snapshot at
  // creation time — see the backend's own note on why this isn't a
  // live reference)...
  inventory_item_id?: string;
  // ...or supply these manually. Both optional now — required only in
  // combination (either inventory_item_id, or title+price+currency+
  // source_capability/type/id; the backend fills in whichever half
  // wasn't provided from the Inventory item when inventory_item_id is
  // set, but can't invent them from nothing when it isn't).
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
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
export type PurchaseStatus =
  "completed" | "payment_failed" | "fulfillment_failed";

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
  created_at: string | null;
}

export interface CreateListingInput {
  container_id: string;
  source_capability: string;
  source_type: string;
  source_id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  payout_wallet_id: string;
  images?: string[];
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
}

// -- Listings -------------------------------------------------------------

async function browseMarketplace(search?: string): Promise<Listing[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return api.get<Listing[]>(`/api/surfacing/marketplace/${query}`);
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
  listListingsForContainer,
  getListing,
  createListing,
  updateListing,
  publishListing,
  archiveListing,
  purchase,
  listMyPurchases,
};

import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.fulfillment`'s REST API
 * (`/api/fulfillment/...`).
 *
 * NOTE on response envelopes: same `{"results": [...]}` convention as
 * `order.ts`/`container.ts`/`inventory.ts` — NOT `{"data": [...]}`.
 * See `order.ts`'s own module docstring for the full reasoning; not
 * repeated here.
 */

export type FulfillmentType = "digital" | "physical" | "service";
export type FulfillmentStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface Fulfillment {
  id: string;
  listing_id: string;
  seller_container_id: string;
  buyer_actor_id: string;
  fulfillment_type: FulfillmentType;
  status: FulfillmentStatus;
  detail: Record<string, unknown>;
  purchase_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function getFulfillment(fulfillmentId: string): Promise<Fulfillment> {
  return api.get<Fulfillment>(`/api/fulfillment/fulfillments/${fulfillmentId}/`);
}

async function listMyFulfillments(): Promise<Fulfillment[]> {
  const result = await api.get<{ results: Fulfillment[] }>(
    "/api/fulfillment/fulfillments/mine/",
  );
  return result.results;
}

/** Seller/vendor-side — requires the actor to be a member of
 * `containerId`; a 403 otherwise (checked backend-side, see
 * `_is_seller_member()` in the real views.py). */
async function listForContainer(containerId: string): Promise<Fulfillment[]> {
  const result = await api.get<{ results: Fulfillment[] }>(
    `/api/fulfillment/containers/${containerId}/fulfillments/`,
  );
  return result.results;
}

function startProgress(
  fulfillmentId: string,
  detailUpdate?: Record<string, unknown>,
): Promise<Fulfillment> {
  return api.post<Fulfillment>(
    `/api/fulfillment/fulfillments/${fulfillmentId}/start-progress/`,
    detailUpdate ? { detail_update: detailUpdate } : undefined,
  );
}

function completeFulfillment(
  fulfillmentId: string,
  detailUpdate?: Record<string, unknown>,
): Promise<Fulfillment> {
  return api.post<Fulfillment>(
    `/api/fulfillment/fulfillments/${fulfillmentId}/complete/`,
    detailUpdate ? { detail_update: detailUpdate } : undefined,
  );
}

function failFulfillment(
  fulfillmentId: string,
  reason: string,
): Promise<Fulfillment> {
  return api.post<Fulfillment>(
    `/api/fulfillment/fulfillments/${fulfillmentId}/fail/`,
    { reason },
  );
}

export const fulfillment = {
  getFulfillment,
  listMyFulfillments,
  listForContainer,
  startProgress,
  completeFulfillment,
  failFulfillment,
};

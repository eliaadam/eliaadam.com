import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.order`'s REST API
 * (`/api/order/...`).
 *
 * NOTE on response envelopes: this backend's list endpoints return
 * `{"results": [...]}`, matching domains.container's own convention
 * — NOT `{"data": [...]}` the way capabilities.core.surfacing's own
 * endpoints do. `api.get<T>()`'s generic unwrap only understands
 * `.data` (see `lib/query/Api.ts`), so `listMyOrders()` below types
 * the raw envelope and pulls `.results` out itself, same as
 * `container.ts`'s own `listMembers()`/`inventory.ts`'s own
 * `listItems()` — matching what the backend actually returns, not
 * pretending the generic unwrap handles it.
 *
 * NOTHING IN THIS CODEBASE CALLS `createOrder()` YET — the existing
 * "Buy" flow (Marketplace.tsx's own `BuyForm`) calls
 * `sdk.surfacing.purchase()` directly, the single-listing purchase
 * path this domain was built to sit ALONGSIDE (grouping one or more
 * such purchases into one checkout action), not replace. Wiring
 * `BuyForm` to this instead is a deliberate, separate decision, not
 * assumed here.
 */

export type OrderStatus = "completed" | "partially_failed" | "failed";

export interface OrderLineResult {
  listing_id: string;
  purchase_status: string;
  purchase_id: string | null;
  error: string | null;
}

export interface Order {
  id: string;
  buyer_actor_id: string;
  status: OrderStatus;
  purchase_ids: string[];
  line_results: OrderLineResult[];
  created_at: string | null;
}

export interface CartLineInput {
  listing_id: string;
  quantity?: number;
}

export interface CreateOrderInput {
  paying_wallet_id: string;
  lines: CartLineInput[];
}

function createOrder(input: CreateOrderInput): Promise<Order> {
  return api.post<Order>("/api/order/orders/", input);
}

function getOrder(orderId: string): Promise<Order> {
  return api.get<Order>(`/api/order/orders/${orderId}/`);
}

async function listMyOrders(): Promise<Order[]> {
  const result = await api.get<{ results: Order[] }>(
    "/api/order/orders/mine/",
  );
  return result.results;
}

export const order = {
  createOrder,
  getOrder,
  listMyOrders,
};

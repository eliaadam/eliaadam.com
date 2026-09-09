import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.subscription`'s REST API
 * (`/api/subscription/...`).
 *
 * Response shapes: `listPlansForContainer` and `listMySubscriptions`
 * return `{"data": [...]}` (auto-unwrapped by `api.get()` — see
 * Api.ts's own `request()`; type as the final shape, never as
 * `{ data: T }`, matching the established convention after the
 * double-unwrap bug elsewhere in this codebase). Every other endpoint
 * returns its projection flattened directly, no wrapper.
 */

export type BillingInterval = "monthly" | "yearly";
export type PlanStatus = "active" | "archived";
export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled";

export interface SubscriptionPlan {
  id: string;
  container_id: string;
  code: string;
  name: string;
  payout_wallet_id: string;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  trial_days: number;
  description: string;
  features: string[];
  benefits: string[];
  status: PlanStatus;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Subscription {
  id: string;
  plan_id: string;
  subscriber_actor_id: string;
  paying_wallet_id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  failed_charge_count: number;
  canceled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /** Convenience — mirrors the backend's own `grants_access` property
   * (true for trialing/active/past_due, false only once canceled). */
  grants_access: boolean;
}

export interface CreatePlanInput {
  container_id: string;
  code: string;
  name: string;
  payout_wallet_id: string;
  price: number;
  currency: string;
  billing_interval?: BillingInterval;
  trial_days?: number;
  description?: string;
  features?: string[];
  benefits?: string[];
}

export interface UpdatePlanInput {
  name?: string;
  price?: number;
  description?: string;
  features?: string[];
  benefits?: string[];
  trial_days?: number;
}

// -- Plans --------------------------------------------------------------

async function listPlansForContainer(
  containerId: string,
  status: string = "active",
): Promise<SubscriptionPlan[]> {
  return api.get<SubscriptionPlan[]>(
    `/api/subscription/containers/${containerId}/plans/?status=${status}`,
  );
}

function getPlan(planId: string): Promise<SubscriptionPlan> {
  return api.get<SubscriptionPlan>(`/api/subscription/plans/${planId}/`);
}

function createPlan(input: CreatePlanInput): Promise<SubscriptionPlan> {
  return api.post<SubscriptionPlan>("/api/subscription/plans/", input);
}

function updatePlan(
  planId: string,
  input: UpdatePlanInput,
): Promise<SubscriptionPlan> {
  return api.patch<SubscriptionPlan>(
    `/api/subscription/plans/${planId}/update/`,
    input,
  );
}

function archivePlan(planId: string): Promise<SubscriptionPlan> {
  return api.post<SubscriptionPlan>(
    `/api/subscription/plans/${planId}/archive/`,
  );
}

// -- Subscriptions --------------------------------------------------------

function subscribe(input: {
  plan_id: string;
  paying_wallet_id: string;
}): Promise<Subscription> {
  return api.post<Subscription>("/api/subscription/subscribe/", input);
}

async function listMySubscriptions(): Promise<Subscription[]> {
  return api.get<Subscription[]>("/api/subscription/my-subscriptions/");
}

function getSubscription(id: string): Promise<Subscription> {
  return api.get<Subscription>(`/api/subscription/subscriptions/${id}/`);
}

function cancelSubscription(id: string): Promise<Subscription> {
  return api.post<Subscription>(
    `/api/subscription/subscriptions/${id}/cancel/`,
  );
}

function hasActiveSubscription(
  planId: string,
  actorId?: string,
): Promise<boolean> {
  const query = actorId
    ? `plan_id=${planId}&actor_id=${actorId}`
    : `plan_id=${planId}`;
  return api
    .get<{ has_active_subscription: boolean }>(
      `/api/subscription/has-active/?${query}`,
    )
    .then((r) => r.has_active_subscription);
}

export const subscription = {
  listPlansForContainer,
  getPlan,
  createPlan,
  updatePlan,
  archivePlan,
  subscribe,
  listMySubscriptions,
  getSubscription,
  cancelSubscription,
  hasActiveSubscription,
};

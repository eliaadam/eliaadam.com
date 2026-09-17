import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.payment_gateway`'s INTERNAL
 * management API (`/api/payment-gateway/...`) — bearer-token
 * authenticated, same as every other domain's own SDK client. This
 * deliberately does NOT cover `/api/gateway/v1/...`, the EXTERNAL,
 * API-key-authenticated surface — that's for third-party systems
 * integrating directly against this platform's REST API, never called
 * from this frontend itself.
 *
 * CREDENTIAL CREATION has exactly one path — requestApiKey() — never
 * a direct "create credential" call. The backend's own
 * `credentials/` endpoint is GET-only (listing); a direct create
 * endpoint existed briefly during development and was removed once it
 * was found to let a container bypass its own issuance policy
 * (subscription/approval/form) entirely. requestApiKey() still issues
 * immediately when no policy applies — no UX regression for the
 * common case — it just can never be skipped when one does.
 */

export type ApiCredentialStatus = "active" | "revoked";
export type WebhookEndpointStatus = "active" | "disabled";
export type ApiKeyRequestStatus = "pending" | "approved" | "rejected";

export interface ApiCredential {
  id: string;
  container_id: string;
  wallet_id: string;
  public_key: string;
  label: string;
  status: ApiCredentialStatus;
}

/** Returned ONLY once, from requestApiKey() when it issues
 * immediately (no approval required) or from approveApiKeyRequest().
 * secret_key is never retrievable again after this response — same
 * one-way, shown-once pattern as a generated password. */
export interface NewApiCredential extends ApiCredential {
  secret_key: string;
}

export interface WebhookEndpoint {
  id: string;
  container_id: string;
  url: string;
  status: WebhookEndpointStatus;
}

/** Returned ONLY once, from registerWebhookEndpoint(). */
export interface NewWebhookEndpoint extends WebhookEndpoint {
  signing_secret: string;
}

export interface ApiKeyRequest {
  id: string;
  requester_actor_id?: string;
  target_id: string;
  status: ApiKeyRequestStatus;
  payload?: {
    label?: string;
    wallet_id?: string;
    form_answers?: Record<string, unknown> | null;
  };
}

export interface IssuancePolicy {
  container_kind_code: string;
  requires_approval: boolean;
  required_form_id: string | null;
  required_subscription_plan_id: string | null;
}

/** One row on the transactions dashboard — a real payment this
 * container's own credentials collected, enriched with its actual
 * amount/currency/description from the underlying PaymentIntent, not
 * just the bare tracking record. */
export interface CollectedIntent {
  id: string;
  payment_intent_id: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";
  amount: number;
  currency: string;
  gateway: string;
  description: string | null;
  gateway_reference: string | null;
  failure_reason: string | null;
  created_at: string | null;
}

/**
 * Either outcome of requestApiKey() — issued immediately, or
 * submitted for approval. Callers should branch on `type`, mirroring
 * exactly how instantiateTemplate()'s own result is already handled
 * elsewhere in this app (a "container" vs an
 * "instantiation_request").
 */
export type RequestApiKeyResult =
  | ({ type: "credential" } & NewApiCredential)
  | {
      type: "instantiation_request";
      request_id: string;
      status: ApiKeyRequestStatus;
    };

export interface RequestApiKeyInput {
  wallet_id: string;
  label: string;
  form_answers?: Record<string, unknown>;
}

export interface SetIssuancePolicyInput {
  container_kind_code: string;
  requires_approval?: boolean;
  required_form_id?: string;
  required_subscription_plan_id?: string;
}

export interface GatewayRoutingPolicy {
  id: string;
  method_type: string | null;
  currency: string | null;
  gateway: string;
}

export interface SetGatewayRoutingPolicyInput {
  method_type?: string;
  currency?: string;
  gateway: "selcom" | "flutterwave";
}

export interface PayoutFeePolicy {
  id: string;
  destination_type: string | null;
  currency: string | null;
  flat_fee: number;
  percentage_bps: number;
}

export interface SetPayoutFeePolicyInput {
  destination_type?: string;
  currency?: string;
  flat_fee?: number;
  percentage_bps?: number;
}

export interface DirectPaymentRequest {
  id: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  purpose: "purchase" | "subscription";
  status: "pending" | "processing" | "succeeded" | "failed";
  completed: boolean;
  result: Record<string, unknown> | null;
}

export interface RequestDirectPurchaseInput {
  gateway?: string;
  method_type?: "mobile_money" | "card";
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
}

export interface RequestDirectSubscriptionInput {
  gateway?: string;
  method_type?: "mobile_money" | "card";
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
}

async function listCredentials(containerId: string): Promise<ApiCredential[]> {
  const result = await api.get<{ results: ApiCredential[] }>(
    `/api/payment-gateway/containers/${containerId}/credentials/`,
  );
  return result.results;
}

function revokeCredential(credentialId: string): Promise<ApiCredential> {
  return api.post<ApiCredential>(
    `/api/payment-gateway/credentials/${credentialId}/revoke/`,
  );
}

async function listWebhookEndpoints(
  containerId: string,
): Promise<WebhookEndpoint[]> {
  const result = await api.get<{ results: WebhookEndpoint[] }>(
    `/api/payment-gateway/containers/${containerId}/webhook-endpoints/`,
  );
  return result.results;
}

function registerWebhookEndpoint(
  containerId: string,
  url: string,
): Promise<NewWebhookEndpoint> {
  return api.post<NewWebhookEndpoint>(
    `/api/payment-gateway/containers/${containerId}/webhook-endpoints/`,
    { url },
  );
}

function disableWebhookEndpoint(endpointId: string): Promise<WebhookEndpoint> {
  return api.post<WebhookEndpoint>(
    `/api/payment-gateway/webhook-endpoints/${endpointId}/disable/`,
  );
}

async function listCollectedIntents(
  containerId: string,
  limit = 50,
  offset = 0,
): Promise<CollectedIntent[]> {
  const result = await api.get<{ results: CollectedIntent[] }>(
    `/api/payment-gateway/containers/${containerId}/collected-intents/?limit=${limit}&offset=${offset}`,
  );
  return result.results;
}

function enableWebhookEndpoint(endpointId: string): Promise<WebhookEndpoint> {
  return api.post<WebhookEndpoint>(
    `/api/payment-gateway/webhook-endpoints/${endpointId}/enable/`,
  );
}

function requestApiKey(
  containerId: string,
  input: RequestApiKeyInput,
): Promise<RequestApiKeyResult> {
  return api.post<RequestApiKeyResult>(
    `/api/payment-gateway/containers/${containerId}/request-api-key/`,
    input,
  );
}

/** Admin-only (core.payment_gateway.issuance.approve) — every pending
 * (or given-status) request across EVERY container. */
async function listApiKeyRequests(
  status = "pending",
): Promise<ApiKeyRequest[]> {
  const result = await api.get<{ results: ApiKeyRequest[] }>(
    `/api/payment-gateway/api-key-requests/?status=${status}`,
  );
  return result.results;
}

function approveApiKeyRequest(
  requestId: string,
  reason?: string,
): Promise<NewApiCredential> {
  return api.post<NewApiCredential>(
    `/api/payment-gateway/api-key-requests/${requestId}/approve/`,
    reason ? { reason } : undefined,
  );
}

function rejectApiKeyRequest(
  requestId: string,
  reason?: string,
): Promise<{ id: string; status: string }> {
  return api.post<{ id: string; status: string }>(
    `/api/payment-gateway/api-key-requests/${requestId}/reject/`,
    reason ? { reason } : undefined,
  );
}

/** Ungated — a requester checking their OWN request history, same as
 * MyInstantiationRequests.tsx's own equivalent. */
async function listMyApiKeyRequests(status?: string): Promise<ApiKeyRequest[]> {
  const query = status ? `?status=${status}` : "";
  const result = await api.get<{ results: ApiKeyRequest[] }>(
    `/api/payment-gateway/my-api-key-requests/${query}`,
  );
  return result.results;
}

/** Ungated — anyone can check what a policy requires before deciding
 * whether to request a key at all. */
async function getIssuancePolicy(
  containerKindCode: string,
): Promise<IssuancePolicy | null> {
  const result = await api.get<{ policy: IssuancePolicy | null }>(
    `/api/payment-gateway/issuance-policies/${containerKindCode}/`,
  );
  return result.policy;
}

/** Platform-admin only (core.payment_gateway.policy.manage). */
function setIssuancePolicy(
  input: SetIssuancePolicyInput,
): Promise<IssuancePolicy> {
  return api.post<IssuancePolicy>(
    "/api/payment-gateway/issuance-policies/",
    input,
  );
}

// --- Gateway routing policy (platform admin) --------------------------

async function listGatewayRoutingPolicies(): Promise<GatewayRoutingPolicy[]> {
  const result = await api.get<{ results: GatewayRoutingPolicy[] }>(
    "/api/payment-gateway/gateway-routing-policies/",
  );
  return result.results;
}

function setGatewayRoutingPolicy(
  input: SetGatewayRoutingPolicyInput,
): Promise<GatewayRoutingPolicy> {
  return api.post<GatewayRoutingPolicy>(
    "/api/payment-gateway/gateway-routing-policies/",
    input,
  );
}

// --- Payout fee policy (platform admin) ---------------------------------

async function listPayoutFeePolicies(): Promise<PayoutFeePolicy[]> {
  const result = await api.get<{ results: PayoutFeePolicy[] }>(
    "/api/payment-gateway/payout-fee-policies/",
  );
  return result.results;
}

function setPayoutFeePolicy(
  input: SetPayoutFeePolicyInput,
): Promise<PayoutFeePolicy> {
  return api.post<PayoutFeePolicy>(
    "/api/payment-gateway/payout-fee-policies/",
    input,
  );
}

// --- Direct-pay purchases/subscriptions ---------------------------------

function requestDirectPurchase(
  listingId: string,
  input: RequestDirectPurchaseInput = {},
): Promise<DirectPaymentRequest> {
  return api.post<DirectPaymentRequest>(
    `/api/payment-gateway/listings/${listingId}/direct-pay/`,
    input,
  );
}

function requestDirectSubscription(
  planId: string,
  input: RequestDirectSubscriptionInput = {},
): Promise<DirectPaymentRequest> {
  return api.post<DirectPaymentRequest>(
    `/api/payment-gateway/plans/${planId}/direct-pay/`,
    input,
  );
}

function getDirectPaymentRequest(id: string): Promise<DirectPaymentRequest> {
  return api.get<DirectPaymentRequest>(
    `/api/payment-gateway/direct-payment-requests/${id}/`,
  );
}

async function listMyDirectPaymentRequests(): Promise<DirectPaymentRequest[]> {
  const result = await api.get<{ results: DirectPaymentRequest[] }>(
    "/api/payment-gateway/my-direct-payment-requests/",
  );
  return result.results;
}

export const paymentGateway = {
  listCredentials,
  revokeCredential,
  listWebhookEndpoints,
  registerWebhookEndpoint,
  disableWebhookEndpoint,
  enableWebhookEndpoint,
  listCollectedIntents,
  requestApiKey,
  listApiKeyRequests,
  approveApiKeyRequest,
  rejectApiKeyRequest,
  listMyApiKeyRequests,
  getIssuancePolicy,
  setIssuancePolicy,
  listGatewayRoutingPolicies,
  setGatewayRoutingPolicy,
  listPayoutFeePolicies,
  setPayoutFeePolicy,
  requestDirectPurchase,
  requestDirectSubscription,
  getDirectPaymentRequest,
  listMyDirectPaymentRequests,
};

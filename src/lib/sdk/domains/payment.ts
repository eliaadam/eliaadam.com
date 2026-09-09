import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.payment`'s REST API
 * (`/api/payment/...`).
 *
 * Every endpoint here is enforced server-side via `require_permission`
 * — the acting actor is resolved from the bearer token, NOT from a
 * request body field. None of these functions take an `actorId`
 * parameter for the caller's own id — sending one would be ignored.
 * `addWalletParticipant`/`removeWalletParticipant` still take an
 * `actorId` because that identifies who's being added/removed, not
 * who's acting.
 *
 * Response shapes: `listWallets`, `listWalletParticipants`, and
 * `listIntents` return `{"data": [...]}` (auto-unwrapped by
 * `api.get()`); every other endpoint returns the projection flattened
 * directly, no wrapper.
 *
 * `payment_method`/`authorization` — see `initiateIntent()` and
 * `continueAuthorization()`'s own docs below — carry RAW, PLAINTEXT
 * card/PIN input. That's a deliberate backend design choice (direct
 * card collection, encrypted server-side before it ever reaches
 * Flutterwave — see `FlutterwaveCardEncryptor` on the backend), not an
 * oversight: encrypting client-side would require shipping the
 * account's symmetric AES key to the browser, which is unsafe. This
 * frontend is therefore in PCI scope the moment a card number is
 * typed into `PaymentMethodFields` — treat that input path with the
 * same care you'd give any other raw-PAN form (no logging it, no
 * autofill surprises, HTTPS only, and nothing here ever writes it to
 * localStorage, React Query's cache persistence, or anywhere else
 * that outlives the single request).
 */

export type WalletOwnerType =
  "container" | "personal" | "container_shared" | "shared";
export type WalletParticipantRole = "owner" | "admin" | "member";
export type Gateway = "manual" | "selcom" | "flutterwave";
export type PaymentIntentStatus =
  "pending" | "processing" | "succeeded" | "failed" | "refunded";
export type LedgerTransactionKind = "payment" | "transfer" | "reversal";

export interface Wallet {
  id: string;
  type: "wallet" | "settlement";
  currency: string;
  container_id: string | null;
  owner_type: WalletOwnerType | null;
  container_owner_id: string | null;
  label: string | null;
  created_by_actor_id: string | null;
  gateway: string | null;
  balance: number;
  allow_negative: boolean;
  status: string;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WalletParticipant {
  id: string;
  wallet_id: string;
  actor_id: string;
  role: WalletParticipantRole;
  status: "active" | "removed";
  added_by_actor_id: string | null;
  joined_at: string | null;
}

export interface PaymentIntent {
  id: string;
  container_id: string;
  created_by_actor_id: string;
  destination_account_id: string;
  amount: number;
  currency: string;
  gateway: Gateway;
  status: PaymentIntentStatus;
  description: string;
  gateway_reference: string | null;
  idempotency_key: string | null;
  ledger_transaction_id: string | null;
  failure_reason: string | null;
  payer_actor_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  metadata: Record<string, unknown>;
  correlation_id: string | null;
  succeeded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LedgerTransaction {
  id: string;
  kind: LedgerTransactionKind;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  posted_by_actor_id: string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  posted_at: string | null;
}

// -- Payment methods (card / mobile money / saved reference) --------------
//
// Shape must match `interface/serializers.py`'s `validate_payment_method()`
// on the backend exactly.

export interface CardInput {
  number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
}

export interface MobileMoneyInput {
  country_code: string;
  network: string;
  phone_number: string;
}

export type PaymentMethodInput =
  | { saved_payment_method_id: string }
  | { type: "card"; card: CardInput; save_for_future?: boolean }
  | { type: "mobile_money"; mobile_money: MobileMoneyInput; save_for_future?: boolean };

export interface SavedPaymentMethod {
  id: string;
  gateway: string;
  external_payment_method_id: string;
  method_type: "card" | "mobile_money";
  display_label: string | null;
  status: "active" | "removed";
  created_at: string | null;
}

// -- next_action / continue-authorization ----------------------------------
//
// `next_action` is EPHEMERAL — only ever returned directly from
// `initiateIntent()`/`continueAuthorization()`'s own response, never
// persisted on the intent itself and never re-derivable from
// `getIntent()`. If the page is reloaded mid-flow (e.g. right after a
// PIN prompt appears), this is lost — "Check status now" (reconcile)
// will still resolve the underlying charge eventually, but won't
// re-surface the specific prompt. Known limitation, not a bug: fixing
// it would mean the backend persisting next_action, which it
// deliberately doesn't (see `PaymentGateway.initiate()`'s own
// docstring on the backend).

export type NextAction =
  | { type: "redirect_url"; redirect_url: { url: string } }
  | { type: "payment_instruction"; payment_instruction: { note: string } }
  | { type: "requires_pin" }
  | { type: "requires_otp" }
  | { type: "requires_additional_fields"; requires_additional_fields: { fields: string[] } }
  | { type: "requires_requery" };

export interface AvsAddressInput {
  city: string;
  country: string;
  line1: string;
  line2?: string;
  postal_code: string;
  state: string;
}

/** PLAINTEXT input — `pin.pin` is the raw digits the buyer typed, NOT
 * pre-encrypted. Encryption happens server-side; see this file's own
 * top-level docs. */
export type AuthorizationInput =
  | { type: "pin"; pin: { pin: string } }
  | { type: "otp"; otp: { code: string } }
  | { type: "avs"; avs: { address: AvsAddressInput } };

export interface InitiateResult {
  intent_id: string;
  status: PaymentIntentStatus;
  checkout_url: string | null;
  next_action: NextAction | null;
}

export interface CreateIntentInput {
  destination_wallet_id: string;
  amount: number;
  currency: string;
  /** Omit entirely to let the backend router pick a gateway for this
   * currency/method — see `domain/rules.py`'s `select_gateway()`. An
   * explicit value here always overrides routing. */
  gateway?: Gateway;
  description?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTransferInput {
  from_wallet_id: string;
  to_wallet_id: string;
  amount: number;
  currency: string;
  description?: string;
}

// -- Wallets ------------------------------------------------------------

async function listWallets(containerId: string): Promise<Wallet[]> {
  return api.get<Wallet[]>(`/api/payment/wallets/?container_id=${containerId}`);
}

function getWallet(walletId: string): Promise<Wallet> {
  return api.get<Wallet>(`/api/payment/wallets/${walletId}/`);
}

/** Get-or-create by (container_id, currency) — the one wallet type
 * with no multi-field creation form, same as it's always been. */
function getOrCreateContainerWallet(
  containerId: string,
  currency: string,
): Promise<Wallet> {
  return api.post<Wallet>("/api/payment/wallets/container/", {
    container_id: containerId,
    currency,
  });
}

function createPersonalWallet(input: {
  container_id: string;
  currency: string;
  label: string;
}): Promise<Wallet> {
  return api.post<Wallet>("/api/payment/wallets/personal/", input);
}

/** Only reachable by a real container owner — everyone else gets a
 * 403 from the backend regardless of what this call sends. */
function createContainerSharedWallet(input: {
  container_id: string;
  currency: string;
  label: string;
  participant_actor_ids?: string[];
}): Promise<Wallet> {
  return api.post<Wallet>("/api/payment/wallets/container-shared/", input);
}

function createSharedWallet(input: {
  container_id: string;
  currency: string;
  label: string;
  participant_actor_ids?: string[];
}): Promise<Wallet> {
  return api.post<Wallet>("/api/payment/wallets/shared/", input);
}

async function listWalletParticipants(
  walletId: string,
): Promise<WalletParticipant[]> {
  return api.get<WalletParticipant[]>(
    `/api/payment/wallets/${walletId}/participants/`,
  );
}

/** `actorId` is who's being ADDED — the caller is resolved server-side
 * from the bearer token. */
function addWalletParticipant(
  walletId: string,
  input: { actor_id: string; role?: WalletParticipantRole },
): Promise<WalletParticipant> {
  return api.post<WalletParticipant>(
    `/api/payment/wallets/${walletId}/participants/`,
    input,
  );
}

/** `actorId` here is who's being REMOVED. */
function removeWalletParticipant(
  walletId: string,
  actorId: string,
): Promise<WalletParticipant> {
  return api.delete<WalletParticipant>(
    `/api/payment/wallets/${walletId}/participants/${actorId}/`,
  );
}

// -- Payment intents ------------------------------------------------------

async function listIntents(
  containerId: string,
  limit = 100,
  offset = 0,
): Promise<PaymentIntent[]> {
  return api.get<PaymentIntent[]>(
    `/api/payment/intents/?container_id=${containerId}&limit=${limit}&offset=${offset}`,
  );
}

function getIntent(id: string): Promise<PaymentIntent> {
  return api.get<PaymentIntent>(`/api/payment/intents/${id}/`);
}

function createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
  return api.post<PaymentIntent>("/api/payment/intents/", input);
}

/** `paymentMethod` is required for `gateway === "flutterwave"` (card,
 * mobile money, or a saved reference — see `PaymentMethodInput`) and
 * ignored by "manual"/"selcom", which collect nothing at this step.
 * Omit it entirely for those two rather than passing an empty object. */
function initiateIntent(
  id: string,
  paymentMethod?: PaymentMethodInput,
): Promise<InitiateResult> {
  return api.post<InitiateResult>(
    `/api/payment/intents/${id}/initiate/`,
    paymentMethod ? { payment_method: paymentMethod } : undefined,
  );
}

/** Submits the second step a card charge sometimes needs after
 * `initiateIntent()` returns a `next_action` of `requires_pin`,
 * `requires_otp`, or `requires_additional_fields` (AVS). Returns the
 * same shape as `initiateIntent()` — including, possibly, ANOTHER
 * `next_action` (e.g. PIN then OTP in sequence); callers should loop
 * on this the same way they handle the first response, not assume one
 * call resolves everything. */
function continueAuthorization(
  id: string,
  authorization: AuthorizationInput,
): Promise<InitiateResult> {
  return api.post<InitiateResult>(
    `/api/payment/intents/${id}/continue-authorization/`,
    { authorization },
  );
}

function refundIntent(id: string, reason: string): Promise<PaymentIntent> {
  return api.post<PaymentIntent>(`/api/payment/intents/${id}/refund/`, {
    reason,
  });
}

function reconcileIntent(id: string): Promise<InitiateResult> {
  return api.post<InitiateResult>(`/api/payment/intents/${id}/reconcile/`);
}

function createTransfer(
  input: CreateTransferInput,
): Promise<LedgerTransaction> {
  return api.post<LedgerTransaction>("/api/payment/transfers/", input);
}

// -- Saved payment methods --------------------------------------------------
//
// Self-service, actor-scoped — always the CALLER's own saved methods;
// there's no way to list or remove anyone else's.

async function listSavedPaymentMethods(
  gateway: Gateway,
): Promise<SavedPaymentMethod[]> {
  return api.get<SavedPaymentMethod[]>(
    `/api/payment/gateways/${gateway}/saved-payment-methods/`,
  );
}

function removeSavedPaymentMethod(
  gateway: Gateway,
  savedId: string,
): Promise<{ removed: boolean }> {
  return api.delete<{ removed: boolean }>(
    `/api/payment/gateways/${gateway}/saved-payment-methods/${savedId}/`,
  );
}

export const payment = {
  listWallets,
  getWallet,
  getOrCreateContainerWallet,
  createPersonalWallet,
  createContainerSharedWallet,
  createSharedWallet,
  listWalletParticipants,
  addWalletParticipant,
  removeWalletParticipant,
  listIntents,
  getIntent,
  createIntent,
  initiateIntent,
  continueAuthorization,
  refundIntent,
  reconcileIntent,
  createTransfer,
  listSavedPaymentMethods,
  removeSavedPaymentMethod,
};

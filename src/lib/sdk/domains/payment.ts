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

export interface InitiateResult {
  intent_id: string;
  status: PaymentIntentStatus;
  checkout_url: string | null;
}

export interface CreateIntentInput {
  destination_wallet_id: string;
  amount: number;
  currency: string;
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

function initiateIntent(id: string): Promise<InitiateResult> {
  return api.post<InitiateResult>(`/api/payment/intents/${id}/initiate/`);
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
  refundIntent,
  reconcileIntent,
  createTransfer,
};

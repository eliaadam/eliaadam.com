import { api } from "../../query/Api";
import type { WalletOwnerType } from "./payment";

export type { WalletOwnerType };

/**
 * Typed client for `capabilities.core.payment`'s platform-wide
 * reporting API (`/api/payment/reporting/...`) — bearer-token
 * authenticated, gated by `core.payment.reporting.view`, checked
 * against the admin container. Distinct from `payment.ts`'s own
 * per-container wallet/intent client: every function here sees across
 * ALL containers, which no other client in this SDK does.
 *
 * Reuses payment.ts's own WalletOwnerType rather than redefining it —
 * same underlying backend concept, and a second export of the same
 * name from a different module would collide in sdk/index.ts.
 */

export interface WalletReport {
  id: string;
  type: string;
  currency: string;
  container_id: string | null;
  owner_type: WalletOwnerType | null;
  container_owner_id: string | null;
  label: string | null;
  balance: number;
  allow_negative: boolean;
  allow_positive: boolean;
  status: string;
  gateway: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LedgerEntryReport {
  id: string;
  account_id: string;
  amount: number;
  currency: string;
}

export interface TransactionReport {
  id: string;
  kind: string;
  description: string;
  posted_at: string | null;
  reference_id: string | null;
  reference_type: string | null;
  posted_by_actor_id: string | null;
  entries: LedgerEntryReport[];
}

export interface PlatformPaymentSummary {
  total_wallets: number;
  total_transactions: number;
  balances_by_currency: Record<string, number>;
}

export interface ListWalletsParams {
  currency?: string;
  owner_type?: WalletOwnerType;
  status?: string;
  container_id?: string;
  limit?: number;
  offset?: number;
}

export interface ListTransactionsParams {
  kind?: string;
  reference_type?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(
  params: object,
): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return (
    "?" +
    entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
  );
}

function listWallets(
  params: ListWalletsParams = {},
): Promise<{ data: WalletReport[]; total: number }> {
  return api.get<{ data: WalletReport[]; total: number }>(
    `/api/payment/reporting/wallets/${buildQuery(params)}`,
  );
}

function getWalletDetail(
  walletId: string,
  limit = 50,
  offset = 0,
): Promise<{ wallet: WalletReport; transactions: TransactionReport[] }> {
  return api.get<{ wallet: WalletReport; transactions: TransactionReport[] }>(
    `/api/payment/reporting/wallets/${walletId}/${buildQuery({ limit, offset })}`,
  );
}

function listTransactions(
  params: ListTransactionsParams = {},
): Promise<{ data: TransactionReport[]; total: number }> {
  return api.get<{ data: TransactionReport[]; total: number }>(
    `/api/payment/reporting/transactions/${buildQuery(params)}`,
  );
}

function getPlatformSummary(): Promise<PlatformPaymentSummary> {
  return api.get<PlatformPaymentSummary>("/api/payment/reporting/summary/");
}

export const paymentReporting = {
  listWallets,
  getWalletDetail,
  listTransactions,
  getPlatformSummary,
};

import { api } from "../../query/Api";

/**
 * Typed client for `pack.retail.finance`'s REST API
 * (`/api/retail-finance/...`) — the one-click "set up your shop" action.
 * Opens Finance's books, creates a starter chart of accounts, and maps
 * every account role POS and Customer Credit need. Safe to call more than
 * once: it only ever adds what's missing.
 */

export interface SetupStatus {
  books_open: boolean;
  base_currency: string | null;
  /** role -> whether it's mapped, e.g. {"generic.cash": true, ...} */
  roles_mapped: Record<string, boolean>;
  missing_roles: string[];
  /** true once a sale can actually be rung up with no further setup. */
  ready: boolean;
}

export interface QuickSetupResult {
  books_opened: boolean;
  accounts_created: number;
  accounts_kept: number;
  mappings_set: number;
  mappings_kept: number;
}

function getStatus(containerId: string): Promise<SetupStatus> {
  return api.get<SetupStatus>(`/api/retail-finance/containers/${containerId}/setup/status/`);
}

/** base_currency is required and can't be changed once the books are open. */
function quickSetup(containerId: string, baseCurrency: string): Promise<QuickSetupResult> {
  return api.post<QuickSetupResult>(`/api/retail-finance/containers/${containerId}/setup/quick/`, { base_currency: baseCurrency });
}

export const retailFinanceSetup = { getStatus, quickSetup };

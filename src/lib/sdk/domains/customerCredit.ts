import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.customer_credit`'s REST API
 * (`/api/customer-credit/...`). A customer's running balance, backed by
 * real postings to Finance — not an invoicing system. Money is always an
 * integer in the books' smallest currency unit.
 */

export type TransactionKind = "charge" | "payment" | "adjustment";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  linked_contact_id: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  linked_contact_id?: string | null;
}

export type UpdateCustomerInput = Partial<Omit<CreateCustomerInput, never>>;

export interface CreditAccount {
  customer_id: string;
  credit_limit: number;
  balance: number;
  /** How much more can still be charged (never negative). */
  available: number;
  is_active: boolean;
  opened_at: string | null;
}

export interface CreditTransaction {
  id: string;
  customer_id: string;
  kind: TransactionKind;
  /** Signed — positive for a charge, negative for a payment (usually). */
  delta: number;
  balance_after: number;
  description: string;
  reason: string;
  entry_id: string;
  created_by_actor_id: string | null;
  created_at: string | null;
}

// -- customers ---------------------------------------------------------------------------

async function listCustomers(containerId: string, search?: string): Promise<Customer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const r = await api.get<{ customers: Customer[] }>(`/api/customer-credit/containers/${containerId}/customers/${qs}`);
  return r.customers;
}

function createCustomer(containerId: string, input: CreateCustomerInput): Promise<Customer> {
  return api.post<Customer>(`/api/customer-credit/containers/${containerId}/customers/create/`, input);
}

function getCustomer(containerId: string, customerId: string): Promise<Customer> {
  return api.get<Customer>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/`);
}

function updateCustomer(containerId: string, customerId: string, changes: UpdateCustomerInput): Promise<Customer> {
  return api.post<Customer>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/update/`, changes);
}

function deactivateCustomer(containerId: string, customerId: string): Promise<Customer> {
  return api.post<Customer>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/deactivate/`);
}

function activateCustomer(containerId: string, customerId: string): Promise<Customer> {
  return api.post<Customer>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/activate/`);
}

// -- credit accounts -----------------------------------------------------------------------------

/** 404 (`credit_account_not_found`) until one is opened for this customer. */
function getAccount(containerId: string, customerId: string): Promise<CreditAccount> {
  return api.get<CreditAccount>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/account/`);
}

/** 409 if an account is already open for this customer. */
function openAccount(containerId: string, customerId: string, creditLimit: number): Promise<CreditAccount> {
  return api.post<CreditAccount>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/account/open/`, { credit_limit: creditLimit });
}

function setCreditLimit(containerId: string, customerId: string, creditLimit: number): Promise<CreditAccount> {
  return api.post<CreditAccount>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/account/limit/`, { credit_limit: creditLimit });
}

function freezeAccount(containerId: string, customerId: string): Promise<CreditAccount> {
  return api.post<CreditAccount>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/account/freeze/`);
}

function unfreezeAccount(containerId: string, customerId: string): Promise<CreditAccount> {
  return api.post<CreditAccount>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/account/unfreeze/`);
}

// -- transactions --------------------------------------------------------------------------------------

async function listTransactions(containerId: string, customerId: string, limit = 50, offset = 0): Promise<CreditTransaction[]> {
  const r = await api.get<{ transactions: CreditTransaction[] }>(
    `/api/customer-credit/containers/${containerId}/customers/${customerId}/transactions/?limit=${limit}&offset=${offset}`,
  );
  return r.transactions;
}

/** 409 (`credit_limit_exceeded`) if this would take the balance over the limit;
 * 409 (`credit_account_frozen`) if the account is frozen. */
function charge(containerId: string, customerId: string, amount: number, description: string, revenueRole = "generic.revenue"): Promise<CreditTransaction> {
  return api.post<CreditTransaction>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/transactions/charge/`, {
    amount, description, revenue_role: revenueRole,
  });
}

/** Always allowed, even while frozen. Overpayment takes the balance negative (a store credit). */
function recordPayment(containerId: string, customerId: string, amount: number, description: string, cashRole = "generic.cash"): Promise<CreditTransaction> {
  return api.post<CreditTransaction>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/transactions/payment/`, {
    amount, description, cash_role: cashRole,
  });
}

function adjust(containerId: string, customerId: string, delta: number, reason: string, offsetRole: string, description = ""): Promise<CreditTransaction> {
  return api.post<CreditTransaction>(`/api/customer-credit/containers/${containerId}/customers/${customerId}/transactions/adjust/`, {
    delta, reason, offset_role: offsetRole, description,
  });
}

export const customerCredit = {
  listCustomers, createCustomer, getCustomer, updateCustomer, deactivateCustomer, activateCustomer,
  getAccount, openAccount, setCreditLimit, freezeAccount, unfreezeAccount,
  listTransactions, charge, recordPayment, adjust,
};

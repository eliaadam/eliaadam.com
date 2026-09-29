import { api } from "../../query/Api";

/**
 * Typed client for `pack.retail.pos`'s REST API (`/api/pos/...`).
 *
 * A sale is rung up in one atomic step — there is no draft/cart on the
 * backend, only here in the UI's own state, until it's actually submitted
 * and paid. Money is always an integer in the books' smallest currency
 * unit, and prices are always resolved server-side from Inventory, never
 * trusted from what the UI sends — `unit_price` on a returned line is what
 * was actually charged, not necessarily what the picker showed a second
 * before submission.
 */

export type PaymentMethod = "cash" | "direct" | "credit";

export interface SaleLine {
  item_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  currency: string;
  total: number;
  payment_method: PaymentMethod;
  entry_id: string;
  amount_tendered: number | null;
  change_given: number | null;
  payment_reference: string | null;
  credit_transaction_id: string | null;
  cashier_actor_id: string | null;
  created_at: string | null;
  lines: SaleLine[];
}

export interface SaleLineInput {
  item_id: string;
  quantity: number;
}

interface CreateSaleBody {
  payment_method: PaymentMethod;
  lines: SaleLineInput[];
  customer_id?: string;
  posting_date?: string;
  amount_tendered?: number;
  payment_reference?: string;
}

async function listSales(containerId: string, filters: { customer_id?: string; payment_method?: PaymentMethod; limit?: number; offset?: number } = {}): Promise<Sale[]> {
  const params = new URLSearchParams();
  if (filters.customer_id) params.set("customer_id", filters.customer_id);
  if (filters.payment_method) params.set("payment_method", filters.payment_method);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  const qs = params.toString();
  const r = await api.get<{ sales: Sale[] }>(`/api/pos/containers/${containerId}/sales/${qs ? `?${qs}` : ""}`);
  return r.sales;
}

function getSale(containerId: string, saleId: string): Promise<Sale> {
  return api.get<Sale>(`/api/pos/containers/${containerId}/sales/${saleId}/`);
}

/** amountTendered must be >= the sale's total (resolved server-side); change is total − tendered. */
function ringUpCashSale(containerId: string, lines: SaleLineInput[], amountTendered: number, customerId?: string): Promise<Sale> {
  const body: CreateSaleBody = { payment_method: "cash", lines, amount_tendered: amountTendered };
  if (customerId) body.customer_id = customerId;
  return api.post<Sale>(`/api/pos/containers/${containerId}/sales/create/`, body);
}

/** paymentReference must name an ALREADY-COMPLETED payment (e.g. a gateway
 * transaction id) — this call does not itself take payment. */
function ringUpDirectSale(containerId: string, lines: SaleLineInput[], paymentReference: string, customerId?: string): Promise<Sale> {
  const body: CreateSaleBody = { payment_method: "direct", lines, payment_reference: paymentReference };
  if (customerId) body.customer_id = customerId;
  return api.post<Sale>(`/api/pos/containers/${containerId}/sales/create/`, body);
}

/** 409 (`credit_limit_exceeded`) if this would take the customer over their limit. */
function ringUpCreditSale(containerId: string, lines: SaleLineInput[], customerId: string): Promise<Sale> {
  return api.post<Sale>(`/api/pos/containers/${containerId}/sales/create/`, { payment_method: "credit", lines, customer_id: customerId });
}

export const pos = { listSales, getSale, ringUpCashSale, ringUpDirectSale, ringUpCreditSale };

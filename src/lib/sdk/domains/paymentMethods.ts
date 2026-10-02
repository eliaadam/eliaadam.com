import { api } from "../../query/Api";

/**
 * Typed client for `core.payment_methods`'s REST API
 * (`/api/payment-methods/...`). The customer-facing side
 * (`listOptions`/`validateMethod`) never returns a gateway name or
 * implementation status — only `listAdminOptions` does, for an admin
 * deciding what to enable.
 */

export interface MethodField {
  name: string;
  label: string;
  field_type: string;
  required: boolean;
  placeholder: string;
  pattern: string | null;
}

export interface PaymentOption {
  method_code: string;
  label: string;
  fields: MethodField[];
}

export interface AdminPaymentOption {
  method_code: string;
  label: string;
  implemented: boolean;
  enabled: boolean;
}

function base(containerId: string, purpose: string) {
  return `/api/payment-methods/containers/${containerId}/purposes/${purpose}`;
}

function listOptions(containerId: string, purpose: string) {
  return api.get<{ options: PaymentOption[] }>(`${base(containerId, purpose)}/options/`).then((r) => r.options);
}

/** Call right before actually submitting payment — resolves the same
 * declared/enabled/implemented checks the backend will apply for
 * real, so the UI can show "try another method" before the customer
 * fills in card details for something that can't go through yet. */
function validateMethod(containerId: string, purpose: string, methodCode: string) {
  return api.post<{ ok: true }>(`${base(containerId, purpose)}/validate/`, { method_code: methodCode });
}

function listAdminOptions(containerId: string, purpose: string) {
  return api.get<{ options: AdminPaymentOption[] }>(`${base(containerId, purpose)}/admin-options/`).then((r) => r.options);
}

function setEnabledMethods(containerId: string, purpose: string, methodCodes: string[]) {
  return api.post<{ options: AdminPaymentOption[] }>(`${base(containerId, purpose)}/enabled-methods/`, { method_codes: methodCodes }).then((r) => r.options);
}

export const paymentMethods_ = { listOptions, validateMethod, listAdminOptions, setEnabledMethods };

import { ApiError } from "../../../lib/query/Api";
import type { TransactionKind } from "../../../lib/sdk/domains/customerCredit";

export const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
export const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";
export const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";
export const dangerButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10";
export const labelClass = "text-xs font-medium text-neutral-500 dark:text-neutral-500";
export const errorTextClass = "text-xs text-red-600 dark:text-red-400";
export const cardClass = "rounded-lg border border-neutral-200 dark:border-neutral-800";
export const badgeClass =
  "inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Money is always an integer in the books' smallest currency unit. Falls
 * back to a plain number when the currency isn't known yet (e.g. before
 * the books are open) rather than crashing Intl.NumberFormat on "". */
export function formatMoney(minorUnits: number, currency: string): string {
  if (!currency) return (minorUnits / 100).toFixed(2);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minorUnits / 100);
  } catch {
    return `${(minorUnits / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const KIND_LABEL: Record<TransactionKind, string> = { charge: "Charge", payment: "Payment", adjustment: "Adjustment" };
export function transactionKindLabel(kind: TransactionKind): string {
  return KIND_LABEL[kind];
}

export function transactionKindClasses(kind: TransactionKind): string {
  switch (kind) {
    case "charge": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400";
    case "payment": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "adjustment": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
  }
}

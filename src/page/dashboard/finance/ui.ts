import { ApiError } from "../../../lib/query/Api";
import type { Account, ReportColumn } from "../../../lib/sdk/domains/finance";

export const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
export const selectClass = inputClass;
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

/** Not-found is how another container's id, or something that doesn't exist yet, comes back. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

/** Money is always an integer in the books' smallest currency unit. */
export function formatMoney(minorUnits: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minorUnits / 100);
  } catch {
    return `${(minorUnits / 100).toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
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

const TYPE_LABEL: Record<Account["type"], string> = {
  asset: "Asset", liability: "Liability", equity: "Equity", revenue: "Revenue", expense: "Expense",
};
export function accountTypeLabel(type: Account["type"]): string {
  return TYPE_LABEL[type];
}

export function accountTypeClasses(type: Account["type"]): string {
  switch (type) {
    case "asset": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400";
    case "liability": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400";
    case "equity": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
    case "revenue": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "expense": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
}

/** Accounts as a flat, code-ordered, indented list — same data the tree in the
 * account picker and the reports use. */
export interface FlatAccount {
  account: Account;
  depth: number;
}

export function flattenAccounts(accounts: Account[]): FlatAccount[] {
  const byParent = new Map<string | null, Account[]>();
  for (const a of accounts) {
    const key = a.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(a);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.code.localeCompare(b.code));

  const out: FlatAccount[] = [];
  const seen = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const a of byParent.get(parentId) ?? []) {
      if (seen.has(a.id)) continue; // a parent id that doesn't resolve to a real account: stop, don't loop
      seen.add(a.id);
      out.push({ account: a, depth });
      visit(a.id, depth + 1);
    }
  };
  visit(null, 0);
  // Anything whose parent_id didn't resolve to a root-reachable account (shouldn't happen, but stay defensive).
  for (const a of accounts) if (!seen.has(a.id)) out.push({ account: a, depth: 0 });
  return out;
}

/** Render a report's rows generically: a money column formats with the
 * books' currency; everything else prints as given. */
export function formatCell(value: unknown, column: ReportColumn, currency: string): string {
  if (value === null || value === undefined) return "";
  if (column.kind === "money" && typeof value === "number") return formatMoney(value, currency);
  if (column.kind === "date" && typeof value === "string") return formatDate(value);
  return String(value);
}

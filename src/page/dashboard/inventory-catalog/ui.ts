import { ApiError } from "../../../lib/query/Api";
import type { ExpiryStatus, TreeItem } from "../../../lib/sdk/domains/inventoryCatalog";

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

export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Prices are integers in the smallest currency unit (cents). */
export function formatMoney(minorUnits: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minorUnits / 100);
  } catch {
    return `${(minorUnits / 100).toFixed(2)} ${currency}`;
  }
}

export function expiryLabel(status: ExpiryStatus | null, days: number | null): string {
  if (status === null || days === null) return "";
  if (days < 0) return `Expired ${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

export function expiryClasses(status: ExpiryStatus | null): string {
  if (status === "expired") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (status === "expiring_soon") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export interface FlatItem {
  item: TreeItem;
  depth: number;
}

export function flatten(tree: TreeItem[], depth = 0): FlatItem[] {
  return tree.flatMap((item) => [{ item, depth }, ...flatten(item.children, depth + 1)]);
}

export function findNode(tree: TreeItem[], id: string): TreeItem | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const inChild = findNode(node.children, id);
    if (inChild) return inChild;
  }
  return null;
}

/** Ids of everything beneath a node — an item can't be nested under these. */
export function descendantIds(node: TreeItem): Set<string> {
  const out = new Set<string>();
  const walk = (n: TreeItem) => {
    for (const c of n.children) {
      out.add(c.id);
      walk(c);
    }
  };
  walk(node);
  return out;
}

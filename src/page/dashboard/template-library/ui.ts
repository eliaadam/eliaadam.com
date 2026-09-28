import { ApiError } from "../../../lib/query/Api";
import type { TemplateStatus } from "../../../lib/sdk/domains/templateLibrary";

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

/** The server's own message when it sent one (validation, conflicts…). */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusClasses(status: TemplateStatus): string {
  if (status === "published") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "archived") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

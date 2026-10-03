import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../../../lib/query/Api";
import type { AnalyticsEventType } from "../../../lib/sdk/domains/analytics";

export const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
export const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";
export const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";
export const dangerButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10";
export const cardClass =
  "rounded-lg border border-neutral-200 dark:border-neutral-800";
export const rowClass =
  "border-b border-neutral-100 last:border-0 dark:border-neutral-900";
export const labelClass = "text-xs font-medium text-neutral-500";
export const pillTabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-black text-white dark:bg-white dark:text-black"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
  }`;

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

const TYPE_STYLE: Partial<Record<AnalyticsEventType, string>> = {
  error: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  rage_click:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  dead_click:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  form_abandon:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  page_view: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  form_submit:
    "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
};

export function TypeBadge({ type }: { type: AnalyticsEventType }) {
  const cls =
    TYPE_STYLE[type] ??
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {type.replace(/_/g, " ")}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className={`${cardClass} p-4`}>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>
      )}
    </div>
  );
}

/** First click arms it, second commits — one stray click can't erase anyone's data. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={dangerButtonClass}
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

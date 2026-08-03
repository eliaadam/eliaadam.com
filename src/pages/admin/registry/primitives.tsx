import type { AssetStatus, AssetType, VersionStatus } from "./registry/types";

const STATUS_STYLES: Record<AssetStatus | VersionStatus, string> = {
  active: "bg-black text-white dark:bg-white dark:text-black",
  draft:
    "border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400",
  inactive:
    "border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400",
  deprecated:
    "border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400",
  retired:
    "border border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-600 line-through",
};

export function StatusPill({ status }: { status: AssetStatus | VersionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
        STATUS_STYLES[status] ??
        "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400"
      }`}
    >
      {status}
    </span>
  );
}

export function TypeTag({ type }: { type: AssetType }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
      {type}
    </span>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-600">
      {children}
    </span>
  );
}

export function Mono({
  children,
  dim,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <span
      className={`font-mono text-xs ${
        dim
          ? "text-neutral-400 dark:text-neutral-600"
          : "text-neutral-600 dark:text-neutral-400"
      }`}
    >
      {children}
    </span>
  );
}

export function Divider() {
  return (
    <div className="my-4 border-t border-neutral-100 dark:border-neutral-900" />
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 py-1">
      <span className="text-[11px] text-neutral-400 sm:w-24 shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-neutral-700 dark:text-neutral-300 break-words">
        {value}
      </span>
    </div>
  );
}

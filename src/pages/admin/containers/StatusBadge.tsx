import type { ContainerStatus } from "../../../lib/maicore-sdk";

export function StatusBadge({ status }: { status: ContainerStatus }) {
  const base =
    "inline-block px-2 py-[3px] text-[11px] font-semibold rounded-full uppercase tracking-wide whitespace-nowrap";

  if (status === "active") {
    return (
      <span className={`${base} bg-black text-white dark:bg-white dark:text-black`}>
        {status}
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        className={`${base} border border-black dark:border-white text-black dark:text-white`}
      >
        {status}
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span
        className={`${base} border border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400`}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400`}
    >
      {status}
    </span>
  );
}

import type { OwnerScope } from "./events-api";

export default function OwnerScopePicker({
  containerId,
  containerName,
  value,
  onChange,
}: {
  containerId: string;
  containerName: string;
  value: OwnerScope;
  onChange: (scope: OwnerScope) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange({ type: "actor" })}
        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
          value.type === "actor"
            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
        }`}
      >
        Just me
      </button>
      <button
        type="button"
        onClick={() => onChange({ type: "container", containerId })}
        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
          value.type === "container"
            ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
        }`}
      >
        {containerName}
      </button>
    </div>
  );
}

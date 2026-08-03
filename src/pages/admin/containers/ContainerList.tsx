import type { Container } from "../../../lib/system-sdk";
import { StatusBadge } from "./StatusBadge";

export function ContainerList({
  title,
  containers,
  selectedId,
  onSelect,
}: {
  title: string;
  containers: Container[];
  selectedId: string | null;
  onSelect: (c: Container) => void;
}) {
  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          {title}
        </h3>
      </div>
      <div className="max-h-[50vh] lg:max-h-[400px] overflow-y-auto">
        {containers.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full text-left px-4 py-3.5 lg:py-3 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800 transition ${
              selectedId === c.id ? "bg-neutral-100 dark:bg-neutral-900" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">
                  {c.display_name}
                </p>
                <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  {c.path}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={c.status} />
                {!c.parent_container_id && (
                  <span className="hidden sm:inline text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase">
                    root
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

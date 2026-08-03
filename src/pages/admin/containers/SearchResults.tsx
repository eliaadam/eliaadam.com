import { useQuery } from "@tanstack/react-query";
import { maicore } from "../../../lib/maicore";
import type { Container } from "../../../lib/maicore-sdk";
import { containerKeys } from "./queryKeys";
import { StatusBadge } from "./StatusBadge";

export function SearchResults({
  query,
  selectedId,
  onSelect,
}: {
  query: string;
  selectedId: string | null;
  onSelect: (c: Container) => void;
}) {
  const searchQuery = useQuery({
    queryKey: containerKeys.search(query),
    queryFn: () => maicore.hierarchy.discovery.search({ q: query, limit: 20 }),
    enabled: !!query,
  });

  const results = searchQuery.data ?? [];

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0 truncate">
          Search: "{query}" ({results.length})
        </h3>
      </div>

      {searchQuery.isLoading && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
          Searching…
        </p>
      )}

      {searchQuery.isError && (
        <p className="text-xs text-black dark:text-white p-4 text-center font-medium">
          Search failed.{" "}
          <button
            onClick={() => searchQuery.refetch()}
            className="underline underline-offset-2"
          >
            Retry
          </button>
        </p>
      )}

      {!searchQuery.isLoading && results.length === 0 && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600 p-4 text-center">
          No containers found.
        </p>
      )}

      <div className="max-h-[40vh] lg:max-h-[300px] overflow-y-auto">
        {results.map((c: Container) => (
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
                  {c.code}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

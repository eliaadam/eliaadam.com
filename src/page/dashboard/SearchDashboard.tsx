import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useContainer } from "../../components/context/ContainerContext";
import { sdk } from "../../lib/sdk";
import type { SearchHit } from "../../lib/sdk/domains/search";
import { ApiError } from "../../lib/query/Api";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-4 py-3 text-base outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
const cardClass =
  "rounded-lg border border-neutral-200 dark:border-neutral-800";
const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";
const badgeClass =
  "inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
const pillTabClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-black text-white dark:bg-white dark:text-black"
      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
  }`;

/** 250ms debounce — fires after the person pauses typing, not on
 * every keystroke, a real search box's basic manners. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

type Scope = "container" | "system";

export function SearchDashboard() {
  const { currentContainerId } = useContainer();
  const [input, setInput] = useState("");
  const [scope, setScope] = useState<Scope>("container");
  const debouncedQuery = useDebounced(input, 250);

  const containerSearch = useQuery({
    queryKey: ["platform-search", currentContainerId, debouncedQuery],
    queryFn: () =>
      sdk.search.query(currentContainerId!, debouncedQuery, { limit: 30 }),
    enabled:
      scope === "container" &&
      !!currentContainerId &&
      debouncedQuery.trim().length > 0,
  });
  const systemSearch = useQuery({
    queryKey: ["platform-search-system", debouncedQuery],
    queryFn: () => sdk.search.querySystemWide(debouncedQuery, { limit: 30 }),
    enabled: scope === "system" && debouncedQuery.trim().length > 0,
  });
  const {
    data: results,
    isLoading,
    isError,
    error,
  } = scope === "container" ? containerSearch : systemSearch;

  const grouped = useMemo(() => {
    const groups = new Map<string, SearchHit[]>();
    for (const hit of results ?? []) {
      const key = hit.source_capability;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(hit);
    }
    return groups;
  }, [results]);

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Search</h1>

      <div className="mt-3 flex gap-1.5">
        <button
          type="button"
          className={pillTabClass(scope === "container")}
          onClick={() => setScope("container")}
        >
          This container
        </button>
        <button
          type="button"
          className={pillTabClass(scope === "system")}
          onClick={() => setScope("system")}
        >
          All my containers
        </button>
      </div>

      <input
        autoFocus
        className={`mt-4 ${inputClass}`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Try "photosynthesis" or "quarterly review" -draft'
      />

      <div className="mt-6">
        {!debouncedQuery.trim() && scope === "container" && (
          <ReindexPanel containerId={currentContainerId} />
        )}
        {!debouncedQuery.trim() && scope === "system" && (
          <p className="text-sm text-neutral-500">
            Searches every container you have search access to at once. Results
            are tagged with which container they came from.
          </p>
        )}
        {debouncedQuery.trim() && isLoading && (
          <p className="text-sm text-neutral-500">Searching…</p>
        )}
        {debouncedQuery.trim() && isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error instanceof ApiError ? error.message : "Search failed."}
          </p>
        )}
        {debouncedQuery.trim() && results?.length === 0 && (
          <p className="text-sm text-neutral-500">
            No results.
            {scope === "system" &&
              " If this is unexpected, cross-container search may not be wired up on the backend yet — see the wiring notes."}
          </p>
        )}
        {Array.from(grouped.entries()).map(([sourceCapability, hits]) => (
          <div key={sourceCapability} className="mt-5 first:mt-0">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {sourceCapability}
            </h2>
            <div className="mt-2 space-y-2">
              {hits.map((hit) => (
                <ResultCard
                  key={`${hit.container_id}:${hit.source_type}:${hit.source_id}`}
                  hit={hit}
                  showContainer={scope === "system"}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The whole card is no longer a single "click to navigate away"
 * button — the structured preview is shown right away, and opening
 * the real thing is a separate, explicit action. Seeing a result's
 * data shouldn't cost a navigation. */
function ResultCard({
  hit,
  showContainer,
}: {
  hit: SearchHit;
  showContainer: boolean;
}) {
  const navigate = useNavigate();
  const fields = Object.entries(hit.structured_data ?? {});

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {hit.title}
            </span>
            <span className={badgeClass}>{hit.source_type}</span>
            {showContainer && (
              <span className={badgeClass} title={hit.container_id}>
                container {hit.container_id.slice(0, 8)}
              </span>
            )}
          </div>
          {hit.snippet && (
            <p className="mt-1 text-sm text-neutral-500">{hit.snippet}</p>
          )}
        </div>
        {hit.route && (
          <button
            type="button"
            className={`${secondaryButtonClass} shrink-0`}
            onClick={() => navigate(hit.route)}
          >
            Open →
          </button>
        )}
      </div>
      {fields.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-900 sm:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] uppercase tracking-wide text-neutral-400">
                {label}
              </dt>
              <dd className="text-sm text-neutral-700 dark:text-neutral-300">
                {value === null || value === undefined ? "—" : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/** Shown only on the empty-query, this-container state, since
 * reindexing is an admin concern and doesn't apply to system-wide
 * search (there's no single index to rebuild across containers you
 * don't manage). Whether the viewer actually has index.manage
 * permission isn't known client-side — the button just shows, and a
 * 403 surfaces normally if they don't. */
function ReindexPanel({ containerId }: { containerId: string }) {
  const { data: sources } = useQuery({
    queryKey: ["search-sources", containerId],
    queryFn: () => sdk.search.listSources(containerId),
  });
  const reindex = useMutation({
    mutationFn: () => sdk.search.reindexAll(containerId),
  });

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Search index</h3>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={reindex.isPending}
          onClick={() => reindex.mutate()}
        >
          {reindex.isPending ? "Reindexing…" : "Reindex everything"}
        </button>
      </div>
      {sources && sources.length > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          Registered sources:{" "}
          {sources
            .map((s) => `${s.source_capability}/${s.source_type}`)
            .join(", ")}
        </p>
      )}
      {reindex.isSuccess && (
        <ul className="mt-2 space-y-0.5 text-xs text-neutral-500">
          {reindex.data.map((r) => (
            <li key={`${r.source_capability}:${r.source_type}`}>
              {r.source_capability}/{r.source_type}: {r.count} document(s)
            </li>
          ))}
        </ul>
      )}
      {reindex.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {reindex.error instanceof ApiError
            ? reindex.error.message
            : "Couldn't reindex."}
        </p>
      )}
      <p className="mt-3 text-xs text-neutral-400">
        Search results reflect the last reindex, not live data — reindex after
        bulk changes to pick them up.
      </p>
    </div>
  );
}

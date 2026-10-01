import type { FormEvent } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { sdk } from "../lib/sdk";

/** Genuinely public discovery/search — no auth. There's no public
 * content-type listing endpoint on the backend, so this deliberately
 * only offers free-text search, not a type filter dropdown — building
 * a dropdown with no real data source behind it would be a fake
 * convenience, not a missing nice-to-have. */
export function PublicContentIndex() {
  const { containerId } = useParams<{ containerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);

  const { data: results, isLoading } = useQuery({
    queryKey: ["public-discover", containerId, search],
    queryFn: () => sdk.content.discoverPublic(containerId!, { search: search || undefined }),
    enabled: !!containerId,
  });

  const { data: rootGroups } = useQuery({
    queryKey: ["public-root-groups", containerId],
    queryFn: () => sdk.content.listPublicRootGroups(containerId!),
    enabled: !!containerId,
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams(searchInput ? { search: searchInput } : {});
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Browse</h1>

      <form onSubmit={onSearch} className="mt-6 flex gap-2">
        <input
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
          value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search…"
        />
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-black">
          Search
        </button>
      </form>

      {rootGroups && rootGroups.filter((g) => g.slug).length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {rootGroups
            .filter((g) => g.slug)
            .map((g) => (
              <Link
                key={g.id} to={`/c/${containerId}/g/${g.slug}`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                {g.name}
              </Link>
            ))}
        </div>
      )}

      <div className="mt-8 space-y-4">
        {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {results?.length === 0 && <p className="text-sm text-neutral-500">{search ? "No matches." : "Nothing published yet."}</p>}
        {results?.map((r) => (
          <Link
            key={r.slug} to={`/c/${containerId}/${r.slug}`}
            className="block rounded-md border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
          >
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{r.title}</h2>
            {r.summary && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{r.summary}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

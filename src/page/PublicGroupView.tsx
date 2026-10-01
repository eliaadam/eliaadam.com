import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../lib/query/Api";
import { sdk } from "../lib/sdk";

/** Genuinely public — no auth. A group's own child groups (for nested
 * browsing) and its published+public member content, resolved
 * server-side so nothing non-public ever reaches this page. */
export function PublicGroupView() {
  const { containerId, groupSlug } = useParams<{ containerId: string; groupSlug: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-group", containerId, groupSlug],
    queryFn: () => sdk.content.getPublicGroup(containerId!, groupSlug!),
    enabled: !!containerId && !!groupSlug,
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-neutral-500">Loading…</div>;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Not found</h1>
        <p className="mt-2 text-sm text-neutral-500">{error instanceof ApiError ? error.message : "This group doesn't exist."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link to={`/c/${containerId}`} className="text-xs text-neutral-400 hover:underline">
        ← Browse
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{data.group.name}</h1>
      {data.group.description && <p className="mt-2 text-neutral-600 dark:text-neutral-400">{data.group.description}</p>}

      {data.child_groups.filter((g) => g.slug).length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {data.child_groups
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
        {data.content.length === 0 && <p className="text-sm text-neutral-500">Nothing published in this group yet.</p>}
        {data.content.map((c) => (
          <Link
            key={c.slug} to={`/c/${containerId}/${c.slug}`}
            className="block rounded-md border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900/60"
          >
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">{c.title}</h2>
            {c.summary && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{c.summary}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

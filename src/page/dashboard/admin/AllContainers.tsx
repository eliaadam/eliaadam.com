import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Folders, Users } from "lucide-react";
import { sdk, type SearchContainersParams } from "../../../lib/sdk";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * The general admin browse view, unlike `ContainerHierarchy.tsx`
 * (which only shows the tree rooted at whatever container the admin
 * currently has selected). Uses `searchContainers()` with no
 * `publicJoinOnly` filter — every container, any visibility, any
 * status, paginated.
 */
export function AllContainers() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<
    NonNullable<SearchContainersParams["status"]> | ""
  >("");
  const [visibility, setVisibility] = useState<
    NonNullable<SearchContainersParams["visibility"]> | ""
  >("");

  const { data: containers, isLoading } = useQuery({
    queryKey: ["admin", "all-containers", q, status, visibility],
    queryFn: () =>
      sdk.container.searchContainers({
        q: q || undefined,
        status: status || undefined,
        visibility: visibility || undefined,
        limit: 100,
      }),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">All containers</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every container in the system, regardless of hierarchy or joinability.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <input
          className={`${inputClass} flex-1`}
          placeholder="Search by name, code, or slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={inputClass}
          value={status}
          onChange={(e) =>
            setStatus(
              e.target.value as
                NonNullable<SearchContainersParams["status"]> | "",
            )
          }
        >
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className={inputClass}
          value={visibility}
          onChange={(e) =>
            setVisibility(
              e.target.value as
                NonNullable<SearchContainersParams["visibility"]> | "",
            )
          }
        >
          <option value="">Any visibility</option>
          <option value="public">Public</option>
          <option value="protected">Protected</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="mt-6">
        {isLoading && (
          <ul className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </ul>
        )}

        {containers && containers.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <Folders
              className="mx-auto text-neutral-400 dark:text-neutral-600"
              size={22}
            />
            <p className="mt-3 text-sm font-medium">No containers match</p>
          </div>
        )}

        {containers && containers.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {containers.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.display_name}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {c.slug} · {c.visibility} · {c.status}
                  </p>
                </div>
                <Link
                  to={`/dashboard/containers/${c.id}/members`}
                  className="flex flex-none items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-black transition-colors hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900"
                >
                  <Users size={13} />
                  Members
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

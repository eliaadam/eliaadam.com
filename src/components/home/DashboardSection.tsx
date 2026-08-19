import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { userApi } from "../../lib/system";

type SubTab = "recent" | "discover";

export default function DashboardSection() {
  const { actor } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<SubTab>("recent");

  const membershipsQuery = useQuery({
    queryKey: ["user", "memberships"],
    queryFn: () => userApi.myMemberships(actor!.id),
    enabled: !!actor,
  });

  const memberships = (membershipsQuery.data ?? []) as Array<{
    id: string;
    container_id: string;
    status: string;
  }>;
  const active = memberships.filter((m) => m.status === "active");
  const memberContainerIds = new Set(
    memberships.filter((m) => m.status !== "left").map((m) => m.container_id),
  );

  // Recent apps — resolved to names, not raw ids
  const recentIds = active.slice(0, 8).map((m) => m.container_id);
  const recentContainersQuery = useQuery({
    queryKey: ["user", "recentContainers", recentIds],
    queryFn: async () => {
      const results = [];
      for (const id of recentIds) {
        try {
          results.push(await userApi.getContainer(id));
        } catch {
          /* skip containers we can no longer resolve */
        }
      }
      return results;
    },
    enabled: recentIds.length > 0,
  });
  const recentContainers = (recentContainersQuery.data ?? []) as Array<{
    id: string;
    display_name: string;
    code: string;
  }>;

  // Discover / browse
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const discoverQuery = useQuery({
    queryKey: ["user", "discover"],
    queryFn: () => userApi.discoverContainers({ limit: 50 }),
    enabled: subTab === "discover",
  });
  const searchQuery = useQuery({
    queryKey: ["user", "search", activeSearch],
    queryFn: () => userApi.searchContainers(activeSearch),
    enabled: subTab === "discover" && !!activeSearch,
  });

  const joinMutation = useMutation({
    mutationFn: async (containerId: string) => {
      const membership = await userApi.joinContainer(actor!.id, containerId);
      try {
        await userApi.activateMembership((membership as any).id);
      } catch {
        /* might not be allowed */
      }
      return membership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "memberships"] });
    },
  });

  const browseContainers =
    (activeSearch ? searchQuery.data : discoverQuery.data) ?? [];
  const browseLoading = activeSearch
    ? searchQuery.isLoading
    : discoverQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white m-0">
          Welcome, {actor?.display_name}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Here's what's happening across your apps.
        </p>
      </div>

      {/* Chip navigation */}
      <div className="flex gap-2">
        <Chip active={subTab === "recent"} onClick={() => setSubTab("recent")}>
          Recent
        </Chip>
        <Chip
          active={subTab === "discover"}
          onClick={() => setSubTab("discover")}
        >
          Discover
        </Chip>
      </div>

      {subTab === "recent" && (
        <div>
          {(membershipsQuery.isLoading || recentContainersQuery.isLoading) && (
            <p className="text-sm text-neutral-400 py-10 text-center">
              Loading…
            </p>
          )}
          {!membershipsQuery.isLoading && active.length === 0 && (
            <p className="text-sm text-neutral-400 py-10 text-center">
              No active apps yet — switch to Discover to find and join one.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {recentContainers.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/u/workspace/${c.id}`)}
                className="flex items-center justify-between text-left bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 hover:border-black dark:hover:border-white transition"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-black dark:text-white block truncate">
                    {c.display_name}
                  </span>
                  {/* <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600">
                    {c.display_name}
                  </span> */}
                </div>
                <span className="text-neutral-400 dark:text-white flex-shrink-0 ml-3">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {subTab === "discover" && (
        <div>
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                searchTerm.trim() &&
                setActiveSearch(searchTerm.trim())
              }
              placeholder="Search containers…"
              className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            {activeSearch ? (
              <button
                onClick={() => {
                  setActiveSearch("");
                  setSearchTerm("");
                }}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Clear
              </button>
            ) : (
              <button
                onClick={() =>
                  searchTerm.trim() && setActiveSearch(searchTerm.trim())
                }
                disabled={!searchTerm.trim()}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
              >
                Search
              </button>
            )}
          </div>

          {browseLoading && (
            <p className="text-sm text-neutral-400 py-10 text-center">
              Loading…
            </p>
          )}
          {!browseLoading && (browseContainers as any[]).length === 0 && (
            <p className="text-sm text-neutral-400 py-10 text-center">
              {activeSearch
                ? "No containers found."
                : "No public containers available."}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {(browseContainers as any[]).map((c: any) => {
              const isMember = memberContainerIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0 ">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-black dark:text-white m-0">
                        {c.code}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                        {c.display_name}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 text-[8px] font-semibold rounded-full uppercase ${
                          c.status === "active"
                            ? "bg-black text-white dark:bg-white dark:text-black"
                            : "border border-neutral-300 dark:border-neutral-700 text-neutral-500"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
                        {c.description}
                      </p>
                    )}
                    <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 mt-1 m-0">
                      {c.path ?? c.id}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {isMember ? (
                      <span className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                        Joined
                      </span>
                    ) : c.status === "active" ? (
                      <button
                        onClick={() => joinMutation.mutate(c.id)}
                        disabled={joinMutation.isPending}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {joinMutation.isPending ? "Joining…" : "Join"}
                      </button>
                    ) : (
                      <span className="px-3.5 py-1.5 text-xs text-neutral-400">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {joinMutation.isSuccess && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-sm text-black dark:text-white">
              Joined successfully!
            </div>
          )}
          {joinMutation.isError && (
            <div className="mt-4 px-4 py-3 rounded-lg border-2 border-black dark:border-white text-sm text-black dark:text-white font-medium">
              {(joinMutation.error as Error).message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition ${
        active
          ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
          : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-black dark:hover:border-white"
      }`}
    >
      {children}
    </button>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { userApi } from "../../lib/maicore";
import { Link } from "react-router-dom";

export default function AppsSection() {
  const { actor } = useAuth();
  const [filter, setFilter] = useState<
    "all" | "active" | "pending" | "suspended"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const membershipsQuery = useQuery({
    queryKey: ["user", "memberships"],
    queryFn: () => userApi.myMemberships(actor!.id),
    enabled: !!actor,
  });

  const memberships = (membershipsQuery.data ?? []) as Array<{
    id: string;
    container_id: string;
    actor_id: string;
    role: string | null;
    status: string;
    joined_at: string | null;
    version: number;
  }>;

  const filtered =
    filter === "all"
      ? memberships
      : memberships.filter((m) => m.status === filter);

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-1">
        Apps
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Containers you're a member of. {memberships.length} membership
        {memberships.length !== 1 ? "s" : ""} total.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "active", "pending", "suspended"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md border transition ${
              filter === s
                ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} (
            {s === "all"
              ? memberships.length
              : memberships.filter((m) => m.status === s).length}
            )
          </button>
        ))}
      </div>

      {membershipsQuery.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {!membershipsQuery.isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          {filter === "all"
            ? "No memberships yet. Head to Home to discover and join apps!"
            : `No ${filter} memberships.`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((m) => (
          <MembershipCard
            key={m.id}
            membership={m}
            expanded={selectedId === m.id}
            onToggle={() => setSelectedId(selectedId === m.id ? null : m.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MembershipCard({
  membership: m,
  expanded,
  onToggle,
}: {
  membership: any;
  expanded: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const containerQuery = useQuery({
    queryKey: ["user", "container", m.container_id],
    queryFn: () => userApi.getContainer(m.container_id),
    enabled: expanded,
  });

  const container = containerQuery.data as any;

  const leaveMutation = useMutation({
    mutationFn: () => userApi.leaveMembership(m.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "memberships"] });
      setConfirming(false);
    },
  });

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-black dark:text-white m-0">
              Container: {m.container_id.slice(0, 12)}…
            </h3>
            <span
              className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase ${
                m.status === "active"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : m.status === "pending"
                    ? "border border-dashed border-neutral-400 text-neutral-500"
                    : "border border-neutral-300 dark:border-neutral-700 text-neutral-500"
              }`}
            >
              {m.status}
            </span>

            {m.role && (
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
                {m.role}
              </span>
            )}
            {m.status === "active" && (
              <Link
                to={`/u/workspace/${m.container_id}`}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black no-underline hover:opacity-90 transition"
              >
                Enter →
              </Link>
            )}
          </div>
          <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 m-0">
            Membership: {m.id.slice(0, 8)}…{" "}
            {m.joined_at
              ? `· Joined ${new Date(m.joined_at).toLocaleDateString()}`
              : ""}
          </p>
        </div>
        <span className="text-neutral-400 dark:text-neutral-600 text-xs flex-shrink-0">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50 dark:bg-neutral-900">
          {containerQuery.isLoading && (
            <p className="text-xs text-neutral-400">
              Loading container details…
            </p>
          )}

          {container && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
                {container.display_name}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-500">Code:</span>{" "}
                  <span className="font-mono text-black dark:text-white">
                    {container.code}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Path:</span>{" "}
                  <span className="font-mono text-black dark:text-white">
                    {container.path}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Visibility:</span>{" "}
                  <span className="text-black dark:text-white">
                    {container.visibility}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Status:</span>{" "}
                  <span className="text-black dark:text-white">
                    {container.status}
                  </span>
                </div>
              </div>
              {container.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  {container.description}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {m.status === "active" &&
              container &&
              container.status === "active" && (
                <Link
                  to={`/u/workspace/${m.container_id}`}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition no-underline"
                >
                  Enter Workspace →
                </Link>
              )}
            {m.status === "active" &&
              (confirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    Leave this container?
                  </span>
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
                  >
                    {leaveMutation.isPending ? "…" : "Confirm Leave"}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
                >
                  Leave
                </button>
              ))}
          </div>

          {leaveMutation.isError && (
            <p className="text-xs text-black dark:text-white font-medium mt-2">
              {(leaveMutation.error as Error).message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

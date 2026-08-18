import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authHeaders } from "./api";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  SearchInput,
  UsersIcon,
} from "./commShared";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

export type Member = {
  actor_id: string;
  display_name: string;
  code?: string | null;
};

export async function fetchMembers(containerId: string): Promise<Member[]> {
  const res = await fetch(
    `${API}/api/hierarchy/containers/${containerId}/members`,
    {
      headers: authHeaders(false),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();

  // The endpoint shape varies: it may be a bare array, {data:[...]},
  // {members:[...]}, or {data:{members:[...]}}. Dig out the array wherever
  // it is and ALWAYS return an array — never let a non-array reach .filter().
  const candidates = [j, j?.data, j?.members, j?.data?.members, j?.data?.data];
  const arr = candidates.find((c) => Array.isArray(c));
  return (arr ?? []) as Member[];
}

export default function MemberPicker({
  containerId,
  excludeActorId,
  onPick,
  onCancel,
}: {
  containerId: string;
  excludeActorId?: string;
  onPick: (actorId: string, name: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");

  const q = useQuery({
    queryKey: ["members", containerId],
    queryFn: () => fetchMembers(containerId),
  });

  const members = useMemo(() => {
    const list = Array.isArray(q.data) ? q.data : [];
    const all = list.filter((m) => m.actor_id !== excludeActorId);
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (m) =>
        m.display_name.toLowerCase().includes(term) ||
        (m.code ?? "").toLowerCase().includes(term),
    );
  }, [q.data, query, excludeActorId]);

  return (
    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-black dark:text-white m-0">
          Message someone in this container
        </p>
        <button
          onClick={onCancel}
          className="text-xs text-neutral-400 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="mb-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search members…"
          autoFocus
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-100 dark:border-neutral-900">
        {q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : q.isError ? (
          <div className="p-3">
            <ErrorBanner
              message="Couldn't load members."
              onRetry={() => q.refetch()}
            />
          </div>
        ) : members.length === 0 ? (
          <div className="p-2">
            <EmptyState
              icon={<UsersIcon />}
              title={query ? "No matches" : "No other members here"}
              description={query ? `Nothing matches "${query}".` : undefined}
            />
          </div>
        ) : (
          members.map((m, i) => (
            <button
              key={m.actor_id}
              onClick={() => onPick(m.actor_id, m.display_name)}
              className={`w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
                i > 0
                  ? "border-t border-neutral-100 dark:border-neutral-900"
                  : ""
              }`}
            >
              <Avatar name={m.display_name} size="sm" />
              <span className="min-w-0">
                <span className="text-sm text-black dark:text-white">
                  {m.display_name}
                </span>
                {m.code && (
                  <span className="text-[11px] text-neutral-400 ml-2">
                    {m.code}
                  </span>
                )}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

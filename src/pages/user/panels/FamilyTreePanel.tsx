import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/hr${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}

type Person = { id: string; actor_id: string; display_name: string | null };
type Edge = {
  id: string;
  from_record_id: string;
  to_record_id: string;
  relation_type: string;
};

/**
 * Family tree — relationship edges over personnel records (family_tree
 * uxTemplate). Add parent/child/spouse/sibling links; the service writes the
 * inverse automatically, so the graph is navigable both ways. This MVP renders
 * the edges grouped by person; a richer graph layout can replace the list later.
 */
export default function FamilyTreePanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (code: string) => permissions.includes(code);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canAdd = can("system.hr.relationship.add");
  const canRemove = can("system.hr.relationship.remove");

  const people = useQuery({
    queryKey: ["hr", "roster", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/personnel`),
  });
  const edges = useQuery({
    queryKey: ["hr", "relationships", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/relationships`),
  });

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("parent");

  const add = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/relationships`, {
        from_record_id: from,
        to_record_id: to,
        relation_type: type,
      }),
    onSuccess: () => {
      setFrom("");
      setTo("");
      setMsg("Relationship added.");
      qc.invalidateQueries({ queryKey: ["hr", "relationships", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Failed to add relationship."),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api("DELETE", `/containers/${containerId}/relationships/${id}`),
    onSuccess: () => {
      setMsg("Relationship removed.");
      qc.invalidateQueries({ queryKey: ["hr", "relationships", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Failed to remove."),
  });

  const persons: Person[] = Array.isArray(people.data) ? people.data : [];
  const nameOf = (recordId: string) =>
    persons.find((p) => p.id === recordId)?.display_name ??
    persons.find((p) => p.id === recordId)?.actor_id ??
    recordId.slice(0, 8);

  const list: Edge[] = Array.isArray(edges.data) ? edges.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canAdd && (
        <div className="flex flex-wrap gap-2 items-end">
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="">Person…</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name ?? p.actor_id}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="parent">is parent of</option>
            <option value="child">is child of</option>
            <option value="spouse">is spouse of</option>
            <option value="sibling">is sibling of</option>
          </select>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="">Person…</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name ?? p.actor_id}
              </option>
            ))}
          </select>
          <button
            onClick={() => add.mutate()}
            disabled={!from || !to || from === to || add.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Add link
          </button>
        </div>
      )}

      {edges.isLoading ? (
        <div className="text-sm text-neutral-500">Loading family tree…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No relationships yet.</div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
          {list.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-black dark:text-white">
                {nameOf(e.from_record_id)}{" "}
                <span className="text-neutral-400">
                  is {e.relation_type} of
                </span>{" "}
                {nameOf(e.to_record_id)}
              </span>
              {canRemove && (
                <button
                  onClick={() => remove.mutate(e.id)}
                  className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

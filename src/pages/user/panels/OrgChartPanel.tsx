import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
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

type Position = {
  id: string;
  title: string;
  grade: string | null;
  reports_to_position_id: string | null;
  headcount: number;
  status: string;
};

/** Build a simple parent→children tree from the flat position list. */
function buildTree(positions: Position[]) {
  const byParent = new Map<string | null, Position[]>();
  for (const p of positions) {
    const key = p.reports_to_position_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(p);
  }
  return byParent;
}

/**
 * Org chart — positions walked via reports_to_position_id. The institutional /
 * government view (org_hr uxTemplate). Create posts, set reporting lines; the
 * roster's assignments say who holds each.
 */
export default function OrgChartPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (code: string) => permissions.includes(code);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canCreate = can("system.hr.position.create");
  const canAbolish = can("system.hr.position.abolish");

  const positions = useQuery({
    queryKey: ["hr", "positions", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/positions`),
  });

  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [reportsTo, setReportsTo] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/positions`, {
        title: title.trim(),
        grade: grade.trim() || undefined,
        reports_to_position_id: reportsTo || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setGrade("");
      setReportsTo("");
      setMsg("Position created.");
      qc.invalidateQueries({ queryKey: ["hr", "positions", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Failed to create position."),
  });

  const abolish = useMutation({
    mutationFn: (id: string) =>
      api("DELETE", `/containers/${containerId}/positions/${id}`),
    onSuccess: () => {
      setMsg("Position abolished.");
      qc.invalidateQueries({ queryKey: ["hr", "positions", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Failed to abolish."),
  });

  const list: Position[] = Array.isArray(positions.data) ? positions.data : [];
  const tree = buildTree(list);

  const renderNode = (p: Position, depth: number) => {
    const children = tree.get(p.id) ?? [];
    return (
      <div key={p.id}>
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-neutral-900"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          <div className="min-w-0">
            <span className="text-sm text-black dark:text-white">
              {p.title}
            </span>
            {p.grade && (
              <span className="ml-2 text-[11px] text-neutral-400">
                {p.grade}
              </span>
            )}
          </div>
          {canAbolish && (
            <button
              onClick={() => abolish.mutate(p.id)}
              className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
            >
              Abolish
            </button>
          )}
        </div>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const roots = tree.get(null) ?? [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canCreate && (
        <div className="flex flex-wrap gap-2 items-end">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Position title"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white flex-1 min-w-[180px]"
          />
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="Grade (optional)"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
          />
          <select
            value={reportsTo}
            onChange={(e) => setReportsTo(e.target.value)}
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="">Reports to… (top level)</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => create.mutate()}
            disabled={!title.trim() || create.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Add position
          </button>
        </div>
      )}

      {positions.isLoading ? (
        <div className="text-sm text-neutral-500">Loading org chart…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No positions yet.</div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md">
          {roots.map((p) => renderNode(p, 0))}
        </div>
      )}
    </div>
  );
}

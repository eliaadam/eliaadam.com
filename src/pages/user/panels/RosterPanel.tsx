import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

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

type Person = {
  id: string;
  actor_id: string;
  display_name: string | null;
  employee_no: string | null;
  record_type: string;
  status: string;
};

/**
 * Roster — the personnel spine, common to both ux templates. Lists people in
 * the container and drives the hire/transfer/promote/offboard lifecycle. Every
 * action is gated on `can`; a member with only self-serve sees just themselves.
 */
export default function RosterPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (code: string) => permissions.includes(code);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canViewAll = can("system.hr.personnel.view");
  const canCreate = can("system.hr.personnel.create");
  const canHire = can("system.hr.assignment.assign");
  const canMove =
    can("system.hr.assignment.transfer") || can("system.hr.assignment.promote");
  const canOffboard = can("system.hr.personnel.offboard");

  const roster = useQuery({
    queryKey: ["hr", "roster", containerId],
    queryFn: () =>
      canViewAll
        ? api("GET", `/containers/${containerId}/personnel`)
        : api("GET", `/containers/${containerId}/personnel/me`).then(
            (r: Person | null) => (r ? [r] : []),
          ),
  });

  const [newActorId, setNewActorId] = useState("");
  const [newName, setNewName] = useState("");

  const createPerson = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/personnel`, {
        actor_id: newActorId.trim(),
        display_name: newName.trim() || undefined,
      }),
    onSuccess: () => {
      setNewActorId("");
      setNewName("");
      setMsg("Personnel record created.");
      qc.invalidateQueries({ queryKey: ["hr", "roster", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Failed to create record."),
  });

  const hire = useMutation({
    mutationFn: (recordId: string) =>
      api("POST", `/containers/${containerId}/assignments/hire`, {
        personnel_record_id: recordId,
      }),
    onSuccess: () => {
      setMsg("Hired — assignment opened.");
      qc.invalidateQueries({ queryKey: ["hr", "roster", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Hire failed."),
  });

  const promote = useMutation({
    mutationFn: (recordId: string) =>
      api(
        "POST",
        `/containers/${containerId}/personnel/${recordId}/promote`,
        {},
      ),
    onSuccess: () => {
      setMsg("Promoted.");
      qc.invalidateQueries({ queryKey: ["hr", "roster", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Promotion failed."),
  });

  const offboard = useMutation({
    mutationFn: (recordId: string) =>
      api(
        "POST",
        `/containers/${containerId}/personnel/${recordId}/offboard`,
        {},
      ),
    onSuccess: () => {
      setMsg("Offboarded.");
      qc.invalidateQueries({ queryKey: ["hr", "roster", containerId] });
    },
    onError: (e: any) => setMsg(e.message ?? "Offboard failed."),
  });

  const people: Person[] = Array.isArray(roster.data) ? roster.data : [];

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
            value={newActorId}
            onChange={(e) => setNewActorId(e.target.value)}
            placeholder="Actor ID (UUID)"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white flex-1 min-w-[220px]"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Display name"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white flex-1 min-w-[160px]"
          />
          <button
            onClick={() => createPerson.mutate()}
            disabled={!newActorId.trim() || createPerson.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Add person
          </button>
        </div>
      )}

      {roster.isLoading ? (
        <div className="text-sm text-neutral-500">Loading roster…</div>
      ) : people.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No personnel records yet.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
          {people.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-black dark:text-white truncate">
                  {p.display_name ?? p.actor_id}
                  {p.status !== "active" && (
                    <span className="ml-2 text-[10px] uppercase text-neutral-400">
                      {p.status}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {p.record_type}
                  {p.employee_no ? ` · ${p.employee_no}` : ""}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {canHire && p.status === "active" && (
                  <button
                    onClick={() => hire.mutate(p.id)}
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                  >
                    Hire
                  </button>
                )}
                {canMove && p.status === "active" && (
                  <button
                    onClick={() => promote.mutate(p.id)}
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                  >
                    Promote
                  </button>
                )}
                {canOffboard && p.status === "active" && (
                  <button
                    onClick={() => offboard.mutate(p.id)}
                    className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                  >
                    Offboard
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

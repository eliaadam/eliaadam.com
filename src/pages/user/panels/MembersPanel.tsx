import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

function headers(): Record<string, string> {
  const token = localStorage.getItem("maicore_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const e: any = new Error(b.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.body = b;
    throw e;
  }
  if (res.status === 204) return null;
  const j = await res.json();
  return j.data ?? j;
}

// HR is on its own path (/api/hr). Failures degrade silently — HR is optional.
async function hrApi(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}/api/hr${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const e: any = new Error(b.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  if (res.status === 204) return null;
  const j = await res.json();
  return j.data ?? j;
}

type Role = { code: string; display_name: string; is_system: boolean };
type Member = {
  membership_id: string;
  actor_id: string;
  display_name: string;
  code: string | null;
  status: "active" | "invited" | "suspended";
  seat: string;
  joined_at: string;
  roles: Role[];
};
type Invitation = {
  id: string;
  email: string;
  role_code: string | null;
  created_at: string;
};
type GrantableRole = Role & { permission_count: number };
type MembersData = {
  members: Member[];
  invitations: Invitation[];
  grantable_roles: GrantableRole[];
};

type Position = {
  id: string;
  title: string;
  grants_roles: string[] | string | null;
  status: string;
};
type WorkforceRow = {
  actor_id: string;
  personnel_record_id: string;
  actor_type: string;
  position_id: string | null;
  position_title: string | null;
  assignment_id: string | null;
};

export default function MembersPanel({
  containerId,
  permissions,
  hrEnabled = false,
}: {
  containerId: string;
  permissions: string[];
  hrEnabled?: boolean;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [removing, setRemoving] = useState<Member | null>(null);
  const [advancedFor, setAdvancedFor] = useState<string | null>(null);

  const can = (code: string) => permissions.includes(code);
  const canAssignPosition = hrEnabled && can("system.hr.assignment.assign");

  const q = useQuery({
    queryKey: ["members", containerId],
    queryFn: () =>
      api(
        "GET",
        `/hierarchy/containers/${containerId}/members`,
      ) as Promise<MembersData>,
  });

  // HR overlay — only when HR is enabled. Degrades silently if it fails.
  const workforce = useQuery({
    queryKey: ["hr", "workforce-map", containerId],
    queryFn: () =>
      hrApi("GET", `/containers/${containerId}/workforce/map`) as Promise<
        WorkforceRow[]
      >,
    enabled: hrEnabled,
    retry: false,
  });
  const positions = useQuery({
    queryKey: ["hr", "positions", containerId],
    queryFn: () =>
      hrApi("GET", `/containers/${containerId}/positions`) as Promise<
        Position[]
      >,
    enabled: canAssignPosition,
    retry: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["members", containerId] });
    qc.invalidateQueries({ queryKey: ["hr", "workforce-map", containerId] });
  };

  const invite = useMutation({
    mutationFn: () =>
      api("POST", `/hierarchy/containers/${containerId}/members/invite`, {
        email,
        role_code: roleCode || null,
      }),
    onSuccess: () => {
      invalidate();
      setInviting(false);
      setEmail("");
      setRoleCode("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (m: Member) =>
      api(
        "DELETE",
        `/hierarchy/containers/${containerId}/members/${m.actor_id}`,
      ),
    onSuccess: (data: any) => {
      invalidate();
      setRemoving(null);
      if (data?.records_orphaned > 0) setError(data.message);
      else setError(null);
    },
    onError: (e: Error) => {
      setError(e.message);
      setRemoving(null);
    },
  });

  const grantRole = useMutation({
    mutationFn: ({ actorId, code }: { actorId: string; code: string }) =>
      api(
        "POST",
        `/hierarchy/containers/${containerId}/members/${actorId}/roles`,
        { role_code: code },
      ),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const revokeRole = useMutation({
    mutationFn: ({ actorId, code }: { actorId: string; code: string }) =>
      api(
        "DELETE",
        `/hierarchy/containers/${containerId}/members/${actorId}/roles/${code}`,
      ),
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  // Assign a position (HR) — the primary lever when HR is on. Uses hire when the
  // member has no active assignment, transfer when they already hold one.
  const assignPosition = useMutation({
    mutationFn: ({
      row,
      positionId,
    }: {
      row: WorkforceRow;
      positionId: string;
    }) => {
      if (row.assignment_id) {
        return hrApi(
          "POST",
          `/containers/${containerId}/personnel/${row.personnel_record_id}/transfer`,
          { position_id: positionId },
        );
      }
      return hrApi("POST", `/containers/${containerId}/assignments/hire`, {
        personnel_record_id: row.personnel_record_id,
        position_id: positionId,
      });
    },
    onSuccess: () => {
      invalidate();
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const data = q.data;
  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];
  const grantable = data?.grantable_roles ?? [];

  const wfByActor: Record<string, WorkforceRow> = {};
  (workforce.data ?? []).forEach((r) => {
    wfByActor[r.actor_id] = r;
  });
  const openPositions = (positions.data ?? []).filter(
    (p) => p.status === "active",
  );

  const btn =
    "px-3 py-1.5 text-xs font-semibold rounded-md transition disabled:opacity-40";
  const input =
    "px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 flex items-start justify-between gap-3">
          <p className="text-xs text-amber-800 dark:text-amber-400 m-0">
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-amber-600 flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Invite ── */}
      {can("system.membership.member.invite") && (
        <div className="mb-6">
          {!inviting ? (
            <button
              onClick={() => setInviting(true)}
              className={`${btn} bg-black text-white dark:bg-white dark:text-black`}
            >
              + Invite someone
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="flex flex-wrap gap-2 mb-3">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  type="email"
                  className={`${input} flex-1 min-w-[220px]`}
                />
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className={`${input} w-56`}
                >
                  <option value="">No role — member only</option>
                  {grantable.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.display_name} ({r.permission_count})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3 mt-0">
                The role is granted when they accept — never before. You can
                only offer roles whose permissions you hold yourself.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => invite.mutate()}
                  disabled={invite.isPending || !email}
                  className={`${btn} bg-black text-white dark:bg-white dark:text-black`}
                >
                  {invite.isPending ? "Sending…" : "Send invitation"}
                </button>
                <button
                  onClick={() => {
                    setInviting(false);
                    setError(null);
                  }}
                  className={`${btn} border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Pending invitations ── */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Pending ({invitations.length})
          </p>
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
              >
                <span className="text-sm text-neutral-600 dark:text-neutral-400 flex-1">
                  {inv.email}
                </span>
                {inv.role_code && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                    {inv.role_code}
                  </span>
                )}
                {can("system.membership.invitation.cancel") && (
                  <button
                    onClick={() =>
                      api("DELETE", `/hierarchy/invitations/${inv.id}`).then(
                        invalidate,
                      )
                    }
                    className="text-xs text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Members ── */}
      {q.isLoading ? (
        <p className="text-sm text-neutral-500">Loading members…</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {members.map((m, i) => {
            const wf = wfByActor[m.actor_id];
            const showAdvanced = advancedFor === m.actor_id;
            return (
              <div
                key={m.membership_id}
                className={`px-4 py-3 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-black dark:text-white m-0 truncate">
                        {m.display_name}
                      </p>
                      {m.seat === "owner" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-black">
                          owner
                        </span>
                      )}
                      {wf?.actor_type && wf.actor_type !== "user" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                          {wf.actor_type}
                        </span>
                      )}
                      {m.status !== "active" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                          {m.status}
                        </span>
                      )}
                    </div>
                    {/* Position line — the job (when HR is on) */}
                    {hrEnabled && (
                      <p className="text-[11px] text-neutral-500 m-0 mt-0.5">
                        {wf?.position_title ? (
                          <>
                            Position:{" "}
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {wf.position_title}
                            </span>
                          </>
                        ) : wf ? (
                          "No position assigned"
                        ) : (
                          "Not in HR"
                        )}
                      </p>
                    )}
                    {m.code && (
                      <p className="text-[11px] text-neutral-400 m-0 mt-0.5 truncate">
                        {m.code}
                      </p>
                    )}
                  </div>

                  {can("system.membership.member.remove") && (
                    <button
                      onClick={() => setRemoving(m)}
                      className={`${btn} text-neutral-500 hover:text-red-600`}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* PRIMARY (HR on): assign position. */}
                {canAssignPosition && wf && (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value=""
                      onChange={(e) =>
                        e.target.value &&
                        assignPosition.mutate({
                          row: wf,
                          positionId: e.target.value,
                        })
                      }
                      className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
                    >
                      <option value="">
                        {wf.position_title
                          ? "Change position…"
                          : "Assign position…"}
                      </option>
                      {openPositions
                        .filter((p) => p.id !== wf.position_id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                    {assignPosition.isPending && (
                      <span className="text-[11px] text-neutral-400">
                        saving…
                      </span>
                    )}
                  </div>
                )}

                {/* Roles — shown as the authority the position/grants confer. */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {m.roles.map((r) => (
                    <span
                      key={r.code}
                      className="group inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                    >
                      {r.code}
                      {/* Direct revoke only in Advanced mode when HR is on. */}
                      {can("system.membership.member.assign_role") &&
                        (!hrEnabled || showAdvanced) && (
                          <button
                            onClick={() =>
                              revokeRole.mutate({
                                actorId: m.actor_id,
                                code: r.code,
                              })
                            }
                            className="opacity-0 group-hover:opacity-100 transition text-neutral-400 hover:text-red-600"
                            title="Revoke"
                          >
                            ×
                          </button>
                        )}
                    </span>
                  ))}
                  {m.roles.length === 0 && (
                    <span className="text-[11px] text-neutral-400">
                      no roles
                    </span>
                  )}
                </div>

                {/* ADVANCED: direct role-granting. Primary when HR off; behind a
                    toggle when HR on (positions are the intended path there). */}
                {can("system.membership.member.assign_role") &&
                  grantable.length > 0 && (
                    <div className="mt-2">
                      {hrEnabled && (
                        <button
                          onClick={() =>
                            setAdvancedFor(showAdvanced ? null : m.actor_id)
                          }
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                          {showAdvanced
                            ? "Hide advanced"
                            : "Advanced: grant role directly"}
                        </button>
                      )}
                      {(!hrEnabled || showAdvanced) && (
                        <select
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            grantRole.mutate({
                              actorId: m.actor_id,
                              code: e.target.value,
                            })
                          }
                          className="ml-2 text-[11px] px-1.5 py-0.5 rounded border border-dashed border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-400"
                        >
                          <option value="">+ role</option>
                          {grantable
                            .filter(
                              (r) => !m.roles.some((mr) => mr.code === r.code),
                            )
                            .map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.display_name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Removal confirmation ── */}
      {removing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 max-w-md w-full">
            <h3 className="text-base font-semibold text-black dark:text-white m-0 mb-3">
              Remove {removing.display_name}?
            </h3>
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 space-y-2">
              <p className="m-0">
                <strong className="text-black dark:text-white">
                  Their access ends immediately
                </strong>{" "}
                — here and in every container below this one. No grace period.
              </p>
              <p className="m-0">
                <strong className="text-black dark:text-white">
                  Their work is not deleted.
                </strong>{" "}
                Everything they created still exists and still names them as
                author. It will be marked as needing a new owner, and appear in
                this container&apos;s orphan queue.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRemoving(null)}
                className={`${btn} border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400`}
              >
                Cancel
              </button>
              <button
                onClick={() => remove.mutate(removing)}
                disabled={remove.isPending}
                className={`${btn} bg-red-600 text-white`}
              >
                {remove.isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!can("system.membership.member.invite") && (
        <p className="text-[11px] text-neutral-400 mt-3 mb-0">
          You can see who is here. You cannot invite or remove people.
        </p>
      )}
    </div>
  );
}

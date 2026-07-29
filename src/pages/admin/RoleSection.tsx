/*
 * ═══════════════════════════════════════════════════════════════════════
 *  PATCH → ContainerTemplateManagementPage.tsx
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Replaces the RoleSection (around line 700–860).
 *
 *  TWO PROBLEMS IT FIXES
 *
 *  1. You could only CREATE roles, never reference one. Every template that
 *     wanted `member` created its own. Now you pick from authority_roles or
 *     define a new one.
 *
 *  2. Permissions were two free-text boxes — resource_code and action_code.
 *     Type "invoces.create" and you get a role that grants nothing, with no
 *     error anywhere. Now you pick from permissions that actually exist.
 *
 *  Permissions are sent as flat codes ("invoice.create") rather than
 *  {resource_code, action_code}. The controller accepts both, so old templates
 *  still load.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TemplateRole } from "../../lib/template-types";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

function ah(): Record<string, string> {
  const t = localStorage.getItem("maicore_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}
async function rf(
  method: string,
  path: string,
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: ah(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const e: any = new Error(b.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    e.errors = b.errors;
    throw e;
  }
  if (res.status === 204) return null;
  const j = await res.json();
  return j.data ?? j;
}
const rbacApi = {
  // Roles
  listRoles: () => rf("GET", "/api/authority/rbac/roles"),
  createRole: (d: Record<string, unknown>) =>
    rf("POST", "/api/authority/rbac/roles", d),
  updateRole: (id: string, d: Record<string, unknown>) =>
    rf("PUT", `/api/authority/rbac/roles/${id}`, d),
  deleteRole: (id: string) => rf("DELETE", `/api/authority/rbac/roles/${id}`),
  rolePermissions: (id: string) =>
    rf("GET", `/api/authority/rbac/roles/${id}/permissions`),
  attachPerm: (roleId: string, permissionId: string) =>
    rf("POST", `/api/authority/rbac/roles/${roleId}/permissions`, {
      permission_id: permissionId,
    }),
  detachPerm: (roleId: string, permissionId: string) =>
    rf(
      "DELETE",
      `/api/authority/rbac/roles/${roleId}/permissions/${permissionId}`,
    ),

  // Permissions
  listPermissions: () => rf("GET", "/api/authority/rbac/permissions"),
  createPermission: (d: Record<string, unknown>) =>
    rf("POST", "/api/authority/rbac/permissions", d),
  deletePermission: (id: string) =>
    rf("DELETE", `/api/authority/rbac/permissions/${id}`),

  // Actions
  listActions: () => rf("GET", "/api/authority/rbac/actions"),
  createAction: (d: Record<string, unknown>) =>
    rf("POST", "/api/authority/rbac/actions", d),
  updateAction: (id: string, d: Record<string, unknown>) =>
    rf("PUT", `/api/authority/rbac/actions/${id}`, d),
  deleteAction: (id: string) =>
    rf("DELETE", `/api/authority/rbac/actions/${id}`),

  // Resources
  listResources: () => rf("GET", "/api/authority/rbac/resources"),
  createResource: (d: Record<string, unknown>) =>
    rf("POST", "/api/authority/rbac/resources", d),
  deleteResource: (id: string) =>
    rf("DELETE", `/api/authority/rbac/resources/${id}`),

  // Assignments
  listAssignments: (actorId: string, containerId: string) =>
    rf(
      "GET",
      `/api/authority/rbac/role-assignments/${actorId}?container_id=${containerId}`,
    ),
  assignRole: (actorId: string, containerId: string, roleId: string) =>
    rf("POST", "/api/authority/rbac/role-assignments", {
      actor_id: actorId,
      container_id: containerId,
      role_id: roleId,
    }),
  revokeAssignment: (assignmentId: string) =>
    rf("DELETE", "/api/authority/rbac/role-assignments", {
      assignment_id: assignmentId,
    }),

  listContainers: () => rf("GET", "/api/hierarchy/containers?status=active"),
};
// ─── Types ──────────────────────────────────────────────────────────────

type AuthorityRole = {
  id: string;
  code: string;
  display_name: string;
  is_system: boolean;
  permissions?: string[];
};

type AuthorityPermission = {
  id: string;
  code: string; // "invoice.create" | "documents.document.view"
  display_name: string;
  resource_code: string;
};

// ─── The section ────────────────────────────────────────────────────────

function RoleSection({
  roles,
  setRoles,
}: {
  roles: TemplateRole[];
  setRoles: (r: TemplateRole[]) => void;
}) {
  const [mode, setMode] = useState<"pick" | "create">("pick");

  const rolesQ = useQuery({
    queryKey: ["admin", "rbac", "roles"],
    queryFn: () => rbacApi.listRoles(),
  });

  const permsQ = useQuery({
    queryKey: ["admin", "rbac", "permissions"],
    queryFn: () => rbacApi.listPermissions(),
  });

  const allRoles = (rolesQ.data ?? []) as AuthorityRole[];
  const allPerms = (permsQ.data ?? []) as AuthorityPermission[];

  const taken = new Set(roles.map((r) => r.role_code));
  const available = allRoles.filter((r) => !taken.has(r.code));

  // Group permissions by resource so the picker is navigable rather than a
  // list of 200 codes.
  const permsByResource = allPerms.reduce<
    Record<string, AuthorityPermission[]>
  >((acc, p) => {
    (acc[p.resource_code] ??= []).push(p);
    return acc;
  }, {});

  const addExisting = (code: string) => {
    const role = allRoles.find((r) => r.code === code);
    if (!role) return;

    setRoles([
      ...roles,
      {
        role_code: role.code,
        role_name: role.display_name,
        permissions: role.permissions ?? [],
        auto_assign_creator: false,
        existing: true, // ← the materializer will NOT rewrite its permissions
      },
    ]);
  };

  const addNew = () =>
    setRoles([
      ...roles,
      {
        role_code: "",
        role_name: "",
        permissions: [],
        auto_assign_creator: false,
        existing: false,
      },
    ]);

  const update = (i: number, patch: Partial<TemplateRole>) =>
    setRoles(roles.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const remove = (i: number) => setRoles(roles.filter((_, idx) => idx !== i));

  const togglePerm = (i: number, code: string) => {
    const role = roles[i];
    const has = role.permissions.includes(code);

    update(i, {
      permissions: has
        ? role.permissions.filter((p) => p !== code)
        : [...role.permissions, code],
    });
  };

  const inputCls =
    "px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 " +
    "bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          Structural Roles
        </p>

        <div className="flex gap-1 p-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900">
          {(["pick", "create"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                mode === m
                  ? "bg-white dark:bg-neutral-950 text-black dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {m === "pick" ? "Existing" : "New"}
            </button>
          ))}
        </div>
      </div>

      {/* Roles granted because a CAPABILITY is enabled live in the Capability
          section. These are the roles the CONTAINER itself defines — member,
          moderator, marketer. */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 mt-0">
        Roles every container built from this template will have. A role with no
        permissions grants nothing — that is occasionally what you want, and
        usually a mistake.
      </p>

      {mode === "pick" ? (
        <div className="mb-4">
          {rolesQ.isLoading ? (
            <p className="text-xs text-neutral-400">Loading roles…</p>
          ) : available.length === 0 ? (
            <p className="text-xs text-neutral-400">
              Every existing role is already on this template.
            </p>
          ) : (
            <select
              value=""
              onChange={(e) => e.target.value && addExisting(e.target.value)}
              className={`${inputCls} w-full`}
            >
              <option value="">Add an existing role…</option>
              {available.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.display_name} ({r.code}){r.is_system ? " — system" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <button
          onClick={addNew}
          className="mb-4 px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
        >
          + Define a new role
        </button>
      )}

      {roles.map((role, ri) => (
        <div
          key={ri}
          className="mb-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex items-center gap-2 mb-3">
            {role.existing ? (
              <>
                <span className="text-sm font-semibold text-black dark:text-white">
                  {role.role_name}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
                  {role.role_code}
                </span>
                <span className="text-[11px] text-neutral-400">
                  existing — permissions managed in Roles &amp; Access
                </span>
              </>
            ) : (
              <>
                <input
                  value={role.role_code}
                  onChange={(e) =>
                    update(ri, {
                      role_code: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, ""),
                    })
                  }
                  placeholder="role-code"
                  className={`${inputCls} w-40 font-mono text-xs`}
                />
                <input
                  value={role.role_name}
                  onChange={(e) => update(ri, { role_name: e.target.value })}
                  placeholder="Display Name"
                  className={`${inputCls} flex-1`}
                />
              </>
            )}

            <button
              onClick={() => remove(ri)}
              className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-2"
            >
              ×
            </button>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={role.auto_assign_creator ?? false}
              onChange={(e) =>
                update(ri, { auto_assign_creator: e.target.checked })
              }
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              Grant to whoever creates the container
            </span>
          </label>

          {/* Permissions — a PICKER, not two text boxes. Typing "invoces.create"
              used to produce a role that silently granted nothing. */}
          {role.existing ? null : (
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Permissions ({role.permissions.length})
              </p>

              {permsQ.isLoading ? (
                <p className="text-xs text-neutral-400">Loading permissions…</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 p-2">
                  {Object.entries(permsByResource).map(([resource, perms]) => (
                    <div key={resource} className="mb-2">
                      <p className="text-[10px] font-mono text-neutral-400 mb-1 mt-0">
                        {resource}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {perms.map((p) => {
                          const on = role.permissions.includes(p.code);
                          return (
                            <button
                              key={p.id}
                              onClick={() => togglePerm(ri, p.code)}
                              className={`px-2 py-1 text-[11px] font-mono rounded border transition ${
                                on
                                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                                  : "border-neutral-200 dark:border-neutral-800 text-neutral-500"
                              }`}
                            >
                              {p.code.split(".").pop()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {role.permissions.length === 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-2 mb-0">
                  This role grants nothing. Anyone assigned it will be a member
                  and nothing more.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RoleSection;

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  ALSO NEEDED — the api module
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  These endpoints already exist from the RBAC management page. The template
 *  page simply never called them.
 *
 *      // api/rbac.ts
 *      export const rbacApi = {
 *        listRoles: () =>
 *          http.get("/authority/rbac/roles").then((r) => r.data.data),
 *
 *        listPermissions: () =>
 *          http.get("/authority/rbac/permissions").then((r) => r.data.data),
 *      };
 *
 *  Confirm the permissions endpoint returns `resource_code` on each row — the
 *  grouping above needs it. If it doesn't, derive it: code.split(".").slice(0, -1).join(".")
 */

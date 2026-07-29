import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../../lib/maicore";

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

const api = {
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

interface Role {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  status: string;
}
interface Permission {
  id: string;
  code: string;
  display_name: string;
  resource_id: string;
  action_id: string;
  status: string;
}
interface ActionEntity {
  id: string;
  code: string;
  name: string;
  display_name: string;
  status: string;
}
interface Resource {
  id: string;
  code: string;
  name: string;
  display_name: string;
  resource_type: string;
  status: string;
}
interface Assignment {
  id: string;
  actor_id: string;
  container_id: string;
  role_id: string;
  status: string;
}
interface Actor {
  id: string;
  display_name: string;
  code: string;
}
interface Container {
  id: string;
  code: string;
  display_name: string;
  path: string;
}

const K = {
  roles: ["rbac", "roles"] as const,
  perms: ["rbac", "permissions"] as const,
  actions: ["rbac", "actions"] as const,
  resources: ["rbac", "resources"] as const,
  rolePerms: (id: string) => ["rbac", "rolePerms", id] as const,
  assign: (a: string, c: string) => ["rbac", "assignments", a, c] as const,
  containers: ["rbac", "containers"] as const,
};

const IC =
  "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

const BTN_PRIMARY =
  "px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition";
const BTN_GHOST =
  "px-3 py-1 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300";
const BTN_DANGER =
  "px-3 py-1 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-black dark:hover:text-white";
const CARD =
  "bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl";

export default function RolePermissionManagementPage() {
  const [tab, setTab] = useState<
    "roles" | "permissions" | "actions" | "resources" | "assign"
  >("roles");

  const tabs = [
    { id: "roles", label: "Roles" },
    { id: "permissions", label: "Permissions" },
    { id: "actions", label: "Actions" },
    { id: "resources", label: "Resources" },
    { id: "assign", label: "Assignments" },
  ] as const;

  return (
    <div className="p-8 max-w-[1200px]">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white m-0">
          Roles & Permissions
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Full CRUD over the Authority domain — resources, actions, permissions,
          roles, and assignments.
        </p>
      </header>

      <div className="flex gap-1 mb-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "roles" && <RolesTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "actions" && <ActionsTab />}
      {tab === "resources" && <ResourcesTab />}
      {tab === "assign" && <AssignmentsTab />}
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : "Request failed.";
  return (
    <div className="text-sm font-medium text-black dark:text-white border-2 border-black dark:border-white rounded-lg px-3.5 py-2.5 mb-4">
      {msg}
    </div>
  );
}

/* ─────────────────────────── ROLES ─────────────────────────── */

function RolesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rolesQ = useQuery({
    queryKey: K.roles,
    queryFn: () => api.listRoles() as Promise<Role[]>,
  });
  const roles = rolesQ.data ?? [];

  const system = roles.filter((r) => r.is_system);
  const business = roles.filter((r) => !r.is_system);

  const done = () => {
    setShowCreate(false);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: K.roles });
  };

  const renderGroup = (title: string, list: Role[]) =>
    list.length === 0 ? null : (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
          {title} ({list.length})
        </h3>
        <div className="flex flex-col gap-2">
          {list.map((role) =>
            editingId === role.id ? (
              <RoleForm key={role.id} existing={role} onDone={done} />
            ) : (
              <RoleCard
                key={role.id}
                role={role}
                expanded={expandedId === role.id}
                onToggle={() =>
                  setExpandedId(expandedId === role.id ? null : role.id)
                }
                onEdit={() => {
                  setEditingId(role.id);
                  setShowCreate(false);
                }}
              />
            ),
          )}
        </div>
      </div>
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white m-0">
          {roles.length} Roles
        </h2>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className={BTN_PRIMARY}
        >
          {showCreate ? "Cancel" : "+ Create Role"}
        </button>
      </div>

      {showCreate && <RoleForm onDone={done} />}
      {rolesQ.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {renderGroup("System Roles", system)}
      {renderGroup("Business Roles", business)}
    </div>
  );
}

function RoleForm({
  existing,
  onDone,
}: {
  existing?: Role;
  onDone: () => void;
}) {
  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [isSystem, setIsSystem] = useState(existing?.is_system ?? false);

  const mut = useMutation({
    mutationFn: () =>
      existing
        ? api.updateRole(existing.id, {
            name,
            display_name: displayName || name,
            description: description || undefined,
          })
        : api.createRole({
            code,
            name,
            display_name: displayName || name,
            description: description || undefined,
            is_system: isSystem,
          }),
    onSuccess: onDone,
  });

  const fe = (mut.error as any)?.errors as Record<string, string[]> | undefined;

  return (
    <div className={`${CARD} p-6 mb-4`}>
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {existing ? "Edit Role" : "Create Role"}
      </h3>
      {!fe && <ErrorBox error={mut.error} />}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {!existing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Code *
            </label>
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""),
                )
              }
              placeholder="invoice-manager"
              className={IC}
            />
            {fe?.code && (
              <p className="text-xs font-medium text-black dark:text-white m-0">
                {fe.code[0]}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Invoice Manager"
            className={IC}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Invoice Manager"
            className={IC}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={IC}
          />
        </div>
      </div>

      {!existing && (
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={isSystem}
            onChange={(e) => setIsSystem(e.target.checked)}
            className="rounded"
          />
          <span className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            System role (platform-level, e.g. carries{" "}
            <span className="font-mono">system.*</span>)
          </span>
        </label>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !name || (!existing && !code)}
          className={BTN_PRIMARY}
        >
          {mut.isPending ? "Saving…" : existing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  expanded,
  onToggle,
  onEdit,
}: {
  role: Role;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const delMut = useMutation({
    mutationFn: () => api.deleteRole(role.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.roles }),
  });

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <span className="text-xs text-neutral-400 dark:text-neutral-600 w-3">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="text-sm font-semibold text-black dark:text-white">
            {role.display_name || role.name}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
            {role.code}
          </span>
          {role.is_system && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black">
              system
            </span>
          )}
        </button>

        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onEdit} className={BTN_GHOST}>
            Edit
          </button>
          {confirming ? (
            <>
              <button
                onClick={() => delMut.mutate()}
                disabled={delMut.isPending}
                className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                {delMut.isPending ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className={BTN_GHOST}
              >
                No
              </button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} className={BTN_DANGER}>
              Delete
            </button>
          )}
        </div>
      </div>

      {delMut.error && (
        <div className="px-5 pb-3">
          <ErrorBox error={delMut.error} />
        </div>
      )}

      {expanded && <RolePermissionEditor roleId={role.id} />}
    </div>
  );
}

function RolePermissionEditor({ roleId }: { roleId: string }) {
  const qc = useQueryClient();

  const allQ = useQuery({
    queryKey: K.perms,
    queryFn: () => api.listPermissions() as Promise<Permission[]>,
  });
  const attachedQ = useQuery({
    queryKey: K.rolePerms(roleId),
    queryFn: () => api.rolePermissions(roleId) as Promise<Permission[]>,
  });

  const all = allQ.data ?? [];
  const attachedIds = new Set((attachedQ.data ?? []).map((p) => p.id));

  const toggleMut = useMutation({
    mutationFn: ({ permId, on }: { permId: string; on: boolean }) =>
      on ? api.attachPerm(roleId, permId) : api.detachPerm(roleId, permId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.rolePerms(roleId) });
    },
  });

  // Group by resource prefix (code = "resource.action")
  const groups = new Map<string, Permission[]>();
  for (const p of all) {
    const prefix = p.code.split(".")[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(p);
  }

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide m-0">
          Permissions — click to attach or detach
        </h5>
        <span className="text-[11px] text-neutral-400 dark:text-neutral-600">
          {attachedIds.size} attached
        </span>
      </div>

      <ErrorBox error={toggleMut.error} />

      {(allQ.isLoading || attachedQ.isLoading) && (
        <p className="text-xs text-neutral-400 m-0">Loading permissions…</p>
      )}

      {!allQ.isLoading && all.length === 0 && (
        <p className="text-xs text-neutral-400 m-0">
          No permissions exist. Create some in the Permissions tab.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {Array.from(groups.entries()).map(([prefix, perms]) => (
          <div key={prefix}>
            <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-600 uppercase tracking-wide mb-1.5 m-0">
              {prefix}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {perms.map((p) => {
                const on = attachedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleMut.mutate({ permId: p.id, on: !on })}
                    disabled={toggleMut.isPending}
                    className={`px-2.5 py-1.5 text-xs font-mono rounded-md border transition disabled:opacity-50 ${
                      on
                        ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                        : "border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-black dark:hover:border-white"
                    }`}
                  >
                    {p.code}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 mt-3 m-0">
        Role ID: {roleId}
      </p>
    </div>
  );
}

/* ─────────────────────── PERMISSIONS ─────────────────────── */

function PermissionsTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const permsQ = useQuery({
    queryKey: K.perms,
    queryFn: () => api.listPermissions() as Promise<Permission[]>,
  });
  const actionsQ = useQuery({
    queryKey: K.actions,
    queryFn: () => api.listActions() as Promise<ActionEntity[]>,
  });
  const resourcesQ = useQuery({
    queryKey: K.resources,
    queryFn: () => api.listResources() as Promise<Resource[]>,
  });

  const perms = permsQ.data ?? [];
  const actions = actionsQ.data ?? [];
  const resources = resourcesQ.data ?? [];

  const groups = new Map<string, Permission[]>();
  for (const p of perms) {
    const prefix = p.code.split(".")[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(p);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white m-0">
          {perms.length} Permissions
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={BTN_PRIMARY}
        >
          {showCreate ? "Cancel" : "+ Create Permission"}
        </button>
      </div>

      {showCreate && (
        <PermissionForm
          actions={actions}
          resources={resources}
          onDone={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: K.perms });
          }}
        />
      )}

      {permsQ.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {Array.from(groups.entries()).map(([prefix, list]) => {
        const resource = resources.find((r) => r.code === prefix);
        return (
          <div key={prefix} className="mb-5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
              {resource?.display_name ?? prefix} ({list.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {list.map((p) => (
                <PermissionRow key={p.id} permission={p} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PermissionForm({
  actions,
  resources,
  onDone,
}: {
  actions: ActionEntity[];
  resources: Resource[];
  onDone: () => void;
}) {
  const [resourceId, setResourceId] = useState("");
  const [actionId, setActionId] = useState("");
  const [displayName, setDisplayName] = useState("");

  const resource = resources.find((r) => r.id === resourceId);
  const action = actions.find((a) => a.id === actionId);
  const code = resource && action ? `${resource.code}.${action.code}` : "";

  const mut = useMutation({
    mutationFn: () =>
      api.createPermission({
        resource_id: resourceId,
        action_id: actionId,
        code,
        display_name: displayName || code,
      }),
    onSuccess: onDone,
  });

  return (
    <div className={`${CARD} p-6 mb-4`}>
      <h3 className="text-base font-semibold text-black dark:text-white mb-1">
        Create Permission
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        A permission is a resource + action pair. Use action code{" "}
        <span className="font-mono">*</span> to create a wildcard like{" "}
        <span className="font-mono">invoice.*</span>.
      </p>
      <ErrorBox error={mut.error} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Resource *
          </label>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className={IC}
          >
            <option value="">Select resource…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name} ({r.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Action *
          </label>
          <select
            value={actionId}
            onChange={(e) => setActionId(e.target.value)}
            className={IC}
          >
            <option value="">Select action…</option>
            {actions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name || a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={code || "auto"}
            className={IC}
          />
        </div>
      </div>

      {code && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Code:{" "}
          <span className="font-mono font-semibold text-black dark:text-white">
            {code}
          </span>
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !resourceId || !actionId}
          className={BTN_PRIMARY}
        >
          {mut.isPending ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function PermissionRow({ permission: p }: { permission: Permission }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const delMut = useMutation({
    mutationFn: () => api.deletePermission(p.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.perms }),
  });

  return (
    <div className={`${CARD} px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-mono font-medium text-black dark:text-white">
          {p.code}
        </span>
        {p.display_name && p.display_name !== p.code && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {p.display_name}
          </span>
        )}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {confirming ? (
          <>
            <button
              onClick={() => delMut.mutate()}
              disabled={delMut.isPending}
              className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
            >
              {delMut.isPending ? "…" : "Delete"}
            </button>
            <button onClick={() => setConfirming(false)} className={BTN_GHOST}>
              No
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className={BTN_DANGER}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── ACTIONS ───────────────────────── */

function ActionsTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const actionsQ = useQuery({
    queryKey: K.actions,
    queryFn: () => api.listActions() as Promise<ActionEntity[]>,
  });
  const actions = actionsQ.data ?? [];

  const done = () => {
    setShowCreate(false);
    setEditingId(null);
    qc.invalidateQueries({ queryKey: K.actions });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white m-0">
          {actions.length} Actions
        </h2>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className={BTN_PRIMARY}
        >
          {showCreate ? "Cancel" : "+ Create Action"}
        </button>
      </div>

      {showCreate && <ActionForm onDone={done} />}
      {actionsQ.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      <div className="flex flex-col gap-1.5">
        {actions.map((a) =>
          editingId === a.id ? (
            <ActionForm key={a.id} existing={a} onDone={done} />
          ) : (
            <ActionRow
              key={a.id}
              action={a}
              onEdit={() => {
                setEditingId(a.id);
                setShowCreate(false);
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

function ActionForm({
  existing,
  onDone,
}: {
  existing?: ActionEntity;
  onDone: () => void;
}) {
  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");

  const mut = useMutation({
    mutationFn: () =>
      existing
        ? api.updateAction(existing.id, {
            name,
            display_name: displayName || name,
          })
        : api.createAction({ code, name, display_name: displayName || name }),
    onSuccess: onDone,
  });

  return (
    <div className={`${CARD} p-6 mb-4`}>
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {existing ? "Edit Action" : "Create Action"}
      </h3>
      <ErrorBox error={mut.error} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        {!existing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Code *
            </label>
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_*-]/g, ""),
                )
              }
              placeholder="approve"
              className={IC}
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Approve"
            className={IC}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Approve"
            className={IC}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !name || (!existing && !code)}
          className={BTN_PRIMARY}
        >
          {mut.isPending ? "Saving…" : existing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

function ActionRow({
  action,
  onEdit,
}: {
  action: ActionEntity;
  onEdit: () => void;
}) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const delMut = useMutation({
    mutationFn: () => api.deleteAction(action.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.actions }),
  });

  return (
    <div className={`${CARD} px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono font-semibold text-black dark:text-white">
          {action.code}
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {action.display_name || action.name}
        </span>
      </div>
      <div className="flex gap-1.5">
        <button onClick={onEdit} className={BTN_GHOST}>
          Edit
        </button>
        {confirming ? (
          <>
            <button
              onClick={() => delMut.mutate()}
              disabled={delMut.isPending}
              className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
            >
              {delMut.isPending ? "…" : "Delete"}
            </button>
            <button onClick={() => setConfirming(false)} className={BTN_GHOST}>
              No
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className={BTN_DANGER}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── RESOURCES ──────────────────────── */

function ResourcesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const resourcesQ = useQuery({
    queryKey: K.resources,
    queryFn: () => api.listResources() as Promise<Resource[]>,
  });
  const resources = resourcesQ.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg font-semibold text-black dark:text-white m-0">
          {resources.length} Resources
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={BTN_PRIMARY}
        >
          {showCreate ? "Cancel" : "+ Create Resource"}
        </button>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        A resource with type <span className="font-mono">business</span> becomes
        a mappable capability in the Capabilities page.
      </p>

      {showCreate && (
        <ResourceForm
          onDone={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: K.resources });
          }}
        />
      )}

      {resourcesQ.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      <div className="flex flex-col gap-1.5">
        {resources.map((r) => (
          <ResourceRow key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}

function ResourceForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("business");

  const mut = useMutation({
    mutationFn: () =>
      api.createResource({
        code,
        name,
        display_name: displayName || name,
        description: description || undefined,
        resource_type: resourceType,
      }),
    onSuccess: onDone,
  });

  return (
    <div className={`${CARD} p-6 mb-4`}>
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        Create Resource
      </h3>
      <ErrorBox error={mut.error} />

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Code *
          </label>
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
            }
            placeholder="document"
            className={IC}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Document"
            className={IC}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Type *
          </label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className={IC}
          >
            <option value="business">business (mappable capability)</option>
            <option value="system">system (platform-level)</option>
            <option value="custom">custom</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Document Management"
            className={IC}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={IC}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !code || !name}
          className={BTN_PRIMARY}
        >
          {mut.isPending ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}

function ResourceRow({ resource: r }: { resource: Resource }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const delMut = useMutation({
    mutationFn: () => api.deleteResource(r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.resources }),
  });

  return (
    <div className={`${CARD} px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-black dark:text-white">
          {r.display_name || r.name}
        </span>
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
          {r.code}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
            r.resource_type === "business"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {r.resource_type}
        </span>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {confirming ? (
          <>
            <button
              onClick={() => delMut.mutate()}
              disabled={delMut.isPending}
              className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
            >
              {delMut.isPending ? "…" : "Delete"}
            </button>
            <button onClick={() => setConfirming(false)} className={BTN_GHOST}>
              No
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className={BTN_DANGER}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── ASSIGNMENTS ─────────────────────── */

function AssignmentsTab() {
  const qc = useQueryClient();
  const [actor, setActor] = useState<Actor | null>(null);
  const [container, setContainer] = useState<Container | null>(null);
  const [actorSearch, setActorSearch] = useState("");
  const [containerFilter, setContainerFilter] = useState("");
  const [roleId, setRoleId] = useState("");

  const actorQ = useQuery({
    queryKey: ["rbac", "actorSearch", actorSearch],
    queryFn: () =>
      userApi.searchActors(actorSearch || undefined) as Promise<Actor[]>,
    enabled: actorSearch.length >= 1 && !actor,
  });

  const containersQ = useQuery({
    queryKey: K.containers,
    queryFn: () => api.listContainers() as Promise<Container[]>,
  });

  const rolesQ = useQuery({
    queryKey: K.roles,
    queryFn: () => api.listRoles() as Promise<Role[]>,
  });

  const assignQ = useQuery({
    queryKey: K.assign(actor?.id ?? "", container?.id ?? ""),
    queryFn: () =>
      api.listAssignments(actor!.id, container!.id) as Promise<Assignment[]>,
    enabled: !!actor && !!container,
  });

  const roles = rolesQ.data ?? [];
  const assignments = assignQ.data ?? [];
  const allContainers = containersQ.data ?? [];
  const containers = containerFilter
    ? allContainers.filter(
        (c) =>
          c.display_name
            .toLowerCase()
            .includes(containerFilter.toLowerCase()) ||
          (c.path ?? "").toLowerCase().includes(containerFilter.toLowerCase()),
      )
    : allContainers;

  const assignMut = useMutation({
    mutationFn: () => api.assignRole(actor!.id, container!.id, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: K.assign(actor!.id, container!.id) });
      setRoleId("");
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.revokeAssignment(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: K.assign(actor!.id, container!.id) }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className={`${CARD} p-6`}>
        <h3 className="text-sm font-semibold text-black dark:text-white mb-4">
          Select Actor & Container
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Actor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Actor
            </label>
            {actor ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex-1 truncate">
                  {actor.display_name}
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 ml-2">
                    {actor.code}
                  </span>
                </span>
                <button
                  onClick={() => {
                    setActor(null);
                    setActorSearch("");
                  }}
                  className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <input
                  value={actorSearch}
                  onChange={(e) => setActorSearch(e.target.value)}
                  placeholder="Search actors by name or email…"
                  className={IC}
                />
                {actorSearch && (actorQ.data ?? []).length > 0 && (
                  <div className="mt-1 max-h-[220px] overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
                    {(actorQ.data ?? []).slice(0, 12).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setActor(a);
                          setActorSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0"
                      >
                        <span className="font-medium text-black dark:text-white">
                          {a.display_name}
                        </span>
                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 ml-2">
                          {a.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Container */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Container
            </label>
            {container ? (
              <div className="flex items-center gap-2">
                <span className="px-3 py-2 text-sm rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex-1 truncate">
                  {container.display_name}
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 ml-2">
                    {container.path}
                  </span>
                </span>
                <button
                  onClick={() => setContainer(null)}
                  className="text-xs text-neutral-400 hover:text-black dark:hover:text-white px-2"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <input
                  value={containerFilter}
                  onChange={(e) => setContainerFilter(e.target.value)}
                  placeholder="Filter containers…"
                  className={IC}
                />
                <div className="mt-1 max-h-[220px] overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-lg">
                  {containers.slice(0, 40).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setContainer(c)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-900 last:border-b-0"
                    >
                      <span className="font-medium text-black dark:text-white">
                        {c.display_name}
                      </span>
                      <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 ml-2">
                        {c.path}
                      </span>
                    </button>
                  ))}
                  {containers.length === 0 && (
                    <p className="text-xs text-neutral-400 p-3 m-0">
                      No active containers.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {actor && container && (
        <div className={`${CARD} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-black dark:text-white m-0">
              {actor.display_name} → {container.display_name}
            </h3>
            <span className="text-xs text-neutral-400 dark:text-neutral-600">
              {assignments.length} active role
              {assignments.length !== 1 ? "s" : ""}
            </span>
          </div>

          <ErrorBox error={revokeMut.error} />

          {assignQ.isLoading && (
            <p className="text-xs text-neutral-400 m-0">Loading assignments…</p>
          )}

          {!assignQ.isLoading && assignments.length === 0 && (
            <p className="text-xs text-neutral-400 mb-4 m-0">
              No roles assigned in this container.
            </p>
          )}

          <div className="flex flex-col gap-2 mb-4">
            {assignments.map((a) => {
              const role = roles.find((r) => r.id === a.role_id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2.5 px-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-black dark:text-white">
                      {role?.display_name ||
                        role?.name ||
                        a.role_id.slice(0, 8)}
                    </span>
                    <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                      {role?.code ?? "—"}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                        a.status === "active"
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "border border-neutral-300 dark:border-neutral-700 text-neutral-400"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <button
                    onClick={() => revokeMut.mutate(a.id)}
                    disabled={revokeMut.isPending}
                    className={BTN_DANGER}
                  >
                    Revoke
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <ErrorBox error={assignMut.error} />
            <div className="flex gap-2">
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={`${IC} flex-1`}
              >
                <option value="">Select a role to assign…</option>
                {roles
                  .filter(
                    (r) =>
                      !assignments.some(
                        (a) => a.role_id === r.id && a.status === "active",
                      ),
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name || r.name} ({r.code})
                    </option>
                  ))}
              </select>
              <button
                onClick={() => assignMut.mutate()}
                disabled={!roleId || assignMut.isPending}
                className={BTN_PRIMARY}
              >
                {assignMut.isPending ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

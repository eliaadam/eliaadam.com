import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { capabilityApi, templateApi } from "../../lib/maicore";
import type { ContainerKind } from "../../lib/template-types";
import type { ContainerTemplate, TemplateRole } from "../../lib/template-types";
import type { AccessMode, TemplateFeature } from "../../lib/maicore-sdk";
import RoleSection from "./RoleSection";

const keys = {
  templates: ["admin", "containerTemplates"] as const,
  kinds: ["admin", "containerKinds"] as const,
};

export default function ContainerTemplateManagementPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: keys.templates,
    queryFn: () => templateApi.listTemplates() as Promise<ContainerTemplate[]>,
  });

  const templates = templatesQuery.data ?? [];

  return (
    <div className="p-8 max-w-[1100px]">
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white m-0">
            Container Templates
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Blueprints with kind, visibility, policy, and default
            roles/permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
        >
          {showCreate ? "Cancel" : "+ New Template"}
        </button>
      </header>

      {showCreate && <TemplateForm onDone={() => setShowCreate(false)} />}

      {templatesQuery.isLoading && (
        <p className="text-sm text-neutral-400 py-10 text-center">Loading…</p>
      )}

      {!templatesQuery.isLoading && templates.length === 0 && !showCreate && (
        <p className="text-sm text-neutral-400 py-10 text-center">
          No templates yet. Create container kinds first.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {templates.map((t) => (
          <div key={t.id}>
            {editingId === t.id ? (
              <TemplateForm existing={t} onDone={() => setEditingId(null)} />
            ) : (
              <TemplateCard
                template={t}
                onEdit={() => {
                  setEditingId(t.id);
                  setShowCreate(false);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function normalizeRoles(raw: unknown): TemplateRole[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((r): TemplateRole[] => {
    if (!r || typeof r !== "object" || !("role_code" in r)) return [];

    const role = r as Record<string, unknown>;
    const rawPerms = Array.isArray(role.permissions) ? role.permissions : [];

    const permissions = rawPerms.flatMap((p): string[] => {
      // Current: "invoice.create"
      if (typeof p === "string" && p) return [p];

      // Legacy: {resource_code: "invoice", action_code: "create"}
      if (p && typeof p === "object") {
        const legacy = p as Record<string, unknown>;
        const resource = legacy.resource_code;
        const action = legacy.action_code;

        if (
          typeof resource === "string" &&
          typeof action === "string" &&
          resource &&
          action
        ) {
          return [`${resource}.${action}`];
        }
      }

      return [];
    });

    return [
      {
        role_code: String(role.role_code),
        role_name: String(role.role_name ?? role.role_code),
        permissions: Array.from(new Set(permissions)),
        auto_assign_creator: Boolean(role.auto_assign_creator ?? false),
        existing: Boolean(role.existing ?? false),
      },
    ];
  });
}
function normalizeFeatures(raw: unknown): TemplateFeature[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((f): TemplateFeature[] => {
    if (typeof f === "string")
      return [{ code: f, access_mode: "role_required" }];
    if (f && typeof f === "object" && "code" in f) {
      const mode = (f as any).access_mode;
      return [
        {
          code: String((f as any).code),
          access_mode:
            mode === "open_to_members" ? "open_to_members" : "role_required",
        },
      ];
    }
    return [];
  });
}

function CapabilitySection({
  features,
  setFeatures,
  capRoles,
  setCapRoles,
}: {
  features: TemplateFeature[];
  setFeatures: (f: TemplateFeature[]) => void;
  capRoles: string[];
  setCapRoles: (r: string[]) => void;
}) {
  const capsQ = useQuery({
    queryKey: ["admin", "capabilities"],
    queryFn: () => capabilityApi.list(),
  });

  const caps = (capsQ.data ?? []) as Array<{
    code: string;
    display_name: string;
    description?: string;
    roles: Array<{ code: string; display_name: string; permissions: string[] }>;
  }>;

  const selected = (code: string) => features.find((f) => f.code === code);

  const toggleFeature = (code: string) => {
    if (selected(code)) {
      setFeatures(features.filter((f) => f.code !== code));
      // Drop any capability roles that belonged to the feature just removed.
      const orphaned =
        caps.find((c) => c.code === code)?.roles.map((r) => r.code) ?? [];
      setCapRoles(capRoles.filter((r) => !orphaned.includes(r)));
    } else {
      setFeatures([...features, { code, access_mode: "role_required" }]);
    }
  };

  const setMode = (code: string, mode: AccessMode) =>
    setFeatures(
      features.map((f) => (f.code === code ? { ...f, access_mode: mode } : f)),
    );

  const toggleRole = (code: string) =>
    setCapRoles(
      capRoles.includes(code)
        ? capRoles.filter((r) => r !== code)
        : [...capRoles, code],
    );

  // Only offer roles from capabilities that are actually enabled on this
  // template — granting invoice-manager where invoice isn't mapped is a no-op.
  const roleGated = features
    .filter((f) => f.access_mode === "role_required")
    .map((f) => f.code);

  const availableRoles = caps
    .filter((c) => roleGated.includes(c.code))
    .flatMap((c) => c.roles.map((r) => ({ ...r, capability: c.display_name })));

  const chip = (on: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md border transition ${
      on
        ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
        : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-black dark:hover:border-white"
    }`;

  return (
    <div className="mb-6">
      <SectionHeader title="Capabilities" />
      <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 mb-3">
        Enabled automatically on every container created from this template.
        Each capability decides for itself whether a role is needed.
      </p>

      {capsQ.isLoading && (
        <p className="text-xs text-neutral-400 mb-4">Loading capabilities…</p>
      )}

      {!capsQ.isLoading && caps.length === 0 && (
        <p className="text-xs text-neutral-400 mb-4">
          No business capabilities defined. Create a resource of type{" "}
          <span className="font-mono">business</span> in Roles &amp; Access.
        </p>
      )}

      <div className="flex flex-col gap-2 mb-6">
        {caps.map((c) => {
          const sel = selected(c.code);

          return (
            <div
              key={c.code}
              className={`rounded-lg border transition ${
                sel
                  ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleFeature(c.code)}
                  className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                >
                  <span
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      sel
                        ? "border-black dark:border-white"
                        : "border-neutral-300 dark:border-neutral-700"
                    }`}
                  >
                    {sel && (
                      <span className="w-2 h-2 rounded-sm bg-black dark:bg-white" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-black dark:text-white">
                    {c.display_name}
                  </span>
                  <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                    {c.code}
                  </span>
                </button>

                {sel && (
                  <select
                    value={sel.access_mode}
                    onChange={(e) =>
                      setMode(c.code, e.target.value as AccessMode)
                    }
                    className="px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white flex-shrink-0"
                  >
                    <option value="role_required">Role required</option>
                    <option value="open_to_members">
                      Open to everyone in the container
                    </option>
                  </select>
                )}
              </div>

              {sel?.access_mode === "open_to_members" && (
                <p className="px-4 pb-3 -mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 m-0">
                  Every active member of this container — and of anything
                  beneath it — can use
                  <strong> every action</strong> of {c.display_name}, including
                  destructive ones, without holding any role.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <SectionHeader title="Creator’s capability roles" />
      <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 mb-3">
        Granted to whoever instantiates this template, in the container it
        creates. Without at least one, the creator gets an organization they
        cannot use.
      </p>

      <div className="flex flex-wrap gap-2">
        {availableRoles.map((r) => (
          <button
            key={r.code}
            type="button"
            onClick={() => toggleRole(r.code)}
            className={chip(capRoles.includes(r.code))}
          >
            {r.display_name}
            <span className="text-[10px] opacity-60 ml-1">{r.capability}</span>
          </button>
        ))}

        {availableRoles.length === 0 && (
          <p className="text-xs text-neutral-400 m-0">
            {features.length === 0
              ? "Select a capability above to see its roles."
              : "Every selected capability is open to members — no roles needed."}
          </p>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template: t,
  onEdit,
}: {
  template: ContainerTemplate;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => templateApi.deleteTemplate(t.id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.templates }),
  });

  const roles = t.default_roles ?? [];
  const policy = t.default_policy ?? {};

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-sm font-semibold text-black dark:text-white m-0">
              {t.display_name}
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
              {t.code}
            </span>
          </div>
          {t.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mb-2">
              {t.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          {confirming ? (
            <>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                {deleteMutation.isPending ? "…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        <Tag label="Kind" value={t.container_kind?.display_name ?? "—"} />
        <Tag label="Visibility" value={t.default_visibility} />
        {t.name_pattern && <Tag label="Pattern" value={t.name_pattern} />}
        {policy.allow_public_join && <Tag label="Join" value="Public" />}
      </div>

      {/* Roles summary */}
      {roles.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-900">
          <p className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Default Roles ({roles.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-900 text-xs"
              >
                <span className="font-semibold text-black dark:text-white">
                  {r.role_name}
                </span>
                <span className="text-neutral-400 dark:text-neutral-600">
                  ({r.permissions.length} perm
                  {r.permissions.length !== 1 ? "s" : ""})
                </span>
                {r.auto_assign_creator && (
                  <span
                    className="text-[10px] text-neutral-500"
                    title="Auto-assigned to creator"
                  >
                    ★
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] font-mono text-neutral-400 dark:text-neutral-600 mt-2 m-0">
        {t.id}
      </p>
    </div>
  );
}

// ── Template Form with Roles Editor ───────────────────────────────
function TemplateForm({
  existing,
  onDone,
}: {
  existing?: ContainerTemplate;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  // Capability + capability-role state
  const [features, setFeatures] = useState<TemplateFeature[]>(
    normalizeFeatures(existing?.default_features ?? []),
  );
  const [capRoles, setCapRoles] = useState<string[]>(
    existing?.default_capability_roles ?? [],
  );

  const kindsQuery = useQuery({
    queryKey: keys.kinds,
    queryFn: () => templateApi.listKinds() as Promise<ContainerKind[]>,
  });
  const kinds = kindsQuery.data ?? [];

  const [code, setCode] = useState(existing?.code ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [displayName, setDisplayName] = useState(existing?.display_name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [kindId, setKindId] = useState(existing?.container_kind_id ?? "");
  const [visibility, setVisibility] = useState(
    existing?.default_visibility ?? "private",
  );
  const [namePattern, setNamePattern] = useState(existing?.name_pattern ?? "");

  // Policy
  const ep = existing?.default_policy ?? {};
  const [maxDepth, setMaxDepth] = useState(ep.maximum_depth?.toString() ?? "");
  const [maxChildren, setMaxChildren] = useState(
    ep.maximum_children?.toString() ?? "",
  );
  const [allowInvitations, setAllowInvitations] = useState(
    ep.allow_invitations ?? true,
  );
  const [allowTransfers, setAllowTransfers] = useState(
    ep.allow_transfers ?? true,
  );
  const [allowDiscovery, setAllowDiscovery] = useState(
    ep.allow_public_discovery ?? false,
  );
  const [allowPublicJoin, setAllowPublicJoin] = useState(
    ep.allow_public_join ?? false,
  );

  // Roles
  const [roles, setRoles] = useState<TemplateRole[]>(
    normalizeRoles(existing?.default_roles ?? []),
  );

  const mutation = useMutation({
    mutationFn: () => {
      const defaultPolicy: Record<string, unknown> = {
        allow_invitations: allowInvitations,
        allow_transfers: allowTransfers,
        allow_public_discovery: allowDiscovery,
        allow_public_join: allowPublicJoin,
      };
      if (maxDepth) defaultPolicy.maximum_depth = Number(maxDepth);
      if (maxChildren) defaultPolicy.maximum_children = Number(maxChildren);

      const payload = {
        name,
        display_name: displayName,
        description: description || undefined,
        container_kind_id: kindId,
        default_visibility: visibility,
        default_policy: defaultPolicy,
        default_roles: roles,
        name_pattern: namePattern || undefined,
        ...(!existing ? { code } : {}),

        default_features: features,
        default_capability_roles: capRoles,
      };

      if (existing) return templateApi.updateTemplate(existing.id, payload);
      return templateApi.createTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.templates });
      onDone();
    },
  });

  const fieldErrors = (
    mutation.error as unknown as { errors?: Record<string, string[]> }
  )?.errors;
  const fe = (f: string) => fieldErrors?.[f]?.[0] ?? null;
  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-4">
      <h3 className="text-base font-semibold text-black dark:text-white mb-4">
        {existing ? "Edit Template" : "Create Container Template"}
      </h3>

      {mutation.error && !fieldErrors && (
        <div className="px-3.5 py-2.5 text-sm rounded-lg border-2 border-black dark:border-white text-black dark:text-white mb-4 font-medium">
          {(mutation.error as Error).message}
        </div>
      )}

      {/* Basic fields */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {!existing && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              Code *
            </label>
            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                )
              }
              placeholder="org-hq"
              className={`${inputCls} ${fe("code") ? "!border-black dark:!border-white" : ""}`}
            />
            {fe("code") && (
              <p className="text-xs text-black dark:text-white font-medium m-0">
                {fe("code")}
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
            placeholder="Headquarters"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Display Name *
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Headquarters"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Container Kind *
          </label>
          <select
            value={kindId}
            onChange={(e) => setKindId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select kind…</option>
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.display_name} ({k.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className={inputCls}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Name Pattern
          </label>
          <input
            value={namePattern}
            onChange={(e) => setNamePattern(e.target.value)}
            placeholder="{prefix} Engineering"
            className={inputCls}
          />
        </div>
        <div className="col-span-3 flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={inputCls}
          />
        </div>
      </div>
      {/* Policy */}

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Max Depth
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={maxDepth}
            onChange={(e) => setMaxDepth(e.target.value)}
            placeholder="∞"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            Max Children
          </label>
          <input
            type="number"
            min="0"
            value={maxChildren}
            onChange={(e) => setMaxChildren(e.target.value)}
            placeholder="∞"
            className={inputCls}
          />
        </div>
      </div>
      <div className="flex gap-6 mb-6">
        <Toggle
          label="Invitations"
          checked={allowInvitations}
          onChange={setAllowInvitations}
        />
        <Toggle
          label="Transfers"
          checked={allowTransfers}
          onChange={setAllowTransfers}
        />
        <Toggle
          label="Discovery"
          checked={allowDiscovery}
          onChange={setAllowDiscovery}
        />
        <Toggle
          label="Public Join"
          checked={allowPublicJoin}
          onChange={setAllowPublicJoin}
        />
      </div>

      {/* Roles & Permissions */}
      <SectionHeader title="Default Roles & Permissions" />
      <RoleSection roles={roles} setRoles={setRoles} />

      {/* Capabilities & capability-roles — wired to this form's state */}
      <CapabilitySection
        features={features}
        setFeatures={setFeatures}
        capRoles={capRoles}
        setCapRoles={setCapRoles}
      />

      {/* Submit */}
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onDone}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={
            mutation.isPending ||
            !name ||
            !displayName ||
            !kindId ||
            (!existing && !code)
          }
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
        >
          {mutation.isPending ? "Saving…" : existing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
      {title}
    </h4>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform ${checked ? "translate-x-[18px] bg-white dark:bg-black" : "translate-x-[3px] bg-white dark:bg-black"}`}
        />
      </button>
      <span className="text-[13px] text-neutral-700 dark:text-neutral-300 font-medium">
        {label}
      </span>
    </label>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
      <span className="font-medium">{label}:</span> {value}
    </span>
  );
}

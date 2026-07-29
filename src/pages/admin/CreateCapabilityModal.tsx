import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/*
 * Create a CUSTOM capability from the UI.
 *
 * Honest framing, stated in the modal itself: this makes a NAMED PERMISSION SET
 * — resources, actions, roles, taxonomy. It does NOT create a screen or any
 * behaviour; that is code. The form exists to organise authority, not to
 * conjure features. Saying so up front prevents the "I built a capability but it
 * does nothing" confusion.
 */

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("maicore_token");
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message ?? `HTTP ${res.status}`);
  return j.data ?? j;
}

type DraftResource = { code: string; label: string; actions: string };
type DraftRole = { code: string; label: string; permissions: string };

export default function CreateCapabilityModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [featureCode, setFeatureCode] = useState("custom.");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [resources, setResources] = useState<DraftResource[]>([
    { code: "", label: "", actions: "view" },
  ]);
  const [roles, setRoles] = useState<DraftRole[]>([]);
  const [error, setError] = useState<string | null>(null);

  const families = useQuery({
    queryKey: ["catalog", "families"],
    queryFn: () => api("GET", "/authority/catalog/families"),
  });
  const industryOptions = useQuery({
    queryKey: ["catalog", "industries"],
    queryFn: () => api("GET", "/authority/catalog/industries"),
  });

  // Derive available permission codes from the resources being defined, so the
  // role editor offers real codes rather than free text.
  const permissionCodes = resources.flatMap((r) =>
    r.code
      ? r.actions
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a) => `${r.code.trim()}.${a}`)
      : [],
  );

  const create = useMutation({
    mutationFn: () =>
      api("POST", "/authority/custom-capabilities", {
        feature_code: featureCode.trim(),
        display_name: displayName.trim(),
        description: description.trim() || null,
        family_code: familyCode || null,
        industries,
        resources: resources
          .filter((r) => r.code.trim())
          .map((r) => ({
            code: r.code.trim(),
            label: r.label.trim() || r.code.trim(),
            actions: r.actions
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean),
          })),
        roles: roles
          .filter((r) => r.code.trim())
          .map((r) => ({
            code: r.code.trim(),
            label: r.label.trim() || r.code.trim(),
            permissions:
              r.permissions.trim() === "*"
                ? ["*"]
                : r.permissions
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
          })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capabilities"] });
      qc.invalidateQueries({ queryKey: ["catalog"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const canSubmit =
    featureCode.trim().length > 4 &&
    displayName.trim() &&
    resources.some((r) => r.code.trim());

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center overflow-y-auto py-10 z-50">
      <div className="bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-black dark:text-white m-0">
            New custom capability
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-black dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-neutral-400 mb-5 mt-1">
          This defines a permission set — resources, actions and roles you can
          grant. It does not create a screen or any behaviour; that requires a
          code manifest. Use this to organise authority over data other features
          manage.
        </p>

        {error && (
          <p className="text-xs text-amber-600 mb-4 p-2 rounded bg-amber-50 dark:bg-amber-950/40 m-0">
            {error}
          </p>
        )}

        {/* Identity */}
        <div className="space-y-3 mb-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] text-neutral-400">Feature code</span>
              <input
                value={featureCode}
                onChange={(e) => setFeatureCode(e.target.value)}
                placeholder="custom.assets"
                className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white font-mono"
              />
              <span className="text-[10px] text-neutral-400">
                Lowercase, dotted. Reserved: maicore./system./platform.
              </span>
            </label>
            <label className="block">
              <span className="text-[11px] text-neutral-400">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Asset Register"
                className="w-full mt-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
            </label>
          </div>

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this capability for?"
            className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            >
              <option value="">No family</option>
              {(families.data ?? []).map((f: any) => (
                <option key={f.code} value={f.code}>
                  {f.display_name}
                </option>
              ))}
            </select>
            <MultiSelect
              placeholder="Industries (empty = universal)"
              options={(industryOptions.data ?? []).map((i: any) => ({
                value: i.code,
                label: i.display_name,
              }))}
              selected={industries}
              onChange={setIndustries}
            />
          </div>
        </div>

        {/* Resources */}
        <Section
          title="Resources & actions"
          subtitle="Each resource + action becomes a grantable permission."
        >
          {resources.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 mb-2"
            >
              <input
                value={r.code}
                onChange={(e) =>
                  setResources((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, code: e.target.value } : x,
                    ),
                  )
                }
                placeholder={`${featureCode.trim() || "custom.x"}.thing`}
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white font-mono"
              />
              <input
                value={r.label}
                onChange={(e) =>
                  setResources((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                placeholder="Label"
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <input
                value={r.actions}
                onChange={(e) =>
                  setResources((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, actions: e.target.value } : x,
                    ),
                  )
                }
                placeholder="create, view, update"
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <button
                onClick={() => setResources((p) => p.filter((_, j) => j !== i))}
                className="text-neutral-400 hover:text-amber-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setResources((p) => [
                ...p,
                { code: "", label: "", actions: "view" },
              ])
            }
            className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
          >
            + Add resource
          </button>
        </Section>

        {/* Roles */}
        <Section
          title="Roles"
          subtitle="Bundle permissions into grantable roles. Use * for all of this capability's permissions."
        >
          {roles.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 mb-2"
            >
              <input
                value={r.code}
                onChange={(e) =>
                  setRoles((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, code: e.target.value } : x,
                    ),
                  )
                }
                placeholder={`${featureCode.trim() || "custom.x"}.manager`}
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white font-mono"
              />
              <input
                value={r.label}
                onChange={(e) =>
                  setRoles((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
                placeholder="Label"
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <input
                value={r.permissions}
                onChange={(e) =>
                  setRoles((p) =>
                    p.map((x, j) =>
                      j === i ? { ...x, permissions: e.target.value } : x,
                    ),
                  )
                }
                placeholder="* or code, code"
                className="px-2 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white font-mono"
              />
              <button
                onClick={() => setRoles((p) => p.filter((_, j) => j !== i))}
                className="text-neutral-400 hover:text-amber-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              setRoles((p) => [...p, { code: "", label: "", permissions: "*" }])
            }
            className="text-[11px] text-neutral-500 hover:text-black dark:hover:text-white"
          >
            + Add role
          </button>
          {permissionCodes.length > 0 && (
            <p className="text-[10px] text-neutral-400 mt-2 m-0">
              Available: {permissionCodes.join(", ")}
            </p>
          )}
        </Section>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-neutral-500"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && create.mutate()}
            disabled={!canSubmit || create.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {create.isPending ? "Creating…" : "Create capability"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 pt-4 border-t border-neutral-100 dark:border-neutral-900">
      <p className="text-xs font-semibold text-black dark:text-white m-0">
        {title}
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

function MultiSelect({
  placeholder,
  options,
  selected,
  onChange,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      >
        {selected.length === 0 ? (
          <span className="text-neutral-400">{placeholder}</span>
        ) : (
          `${selected.length} selected`
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, o.value]
                      : selected.filter((x) => x !== o.value),
                  )
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

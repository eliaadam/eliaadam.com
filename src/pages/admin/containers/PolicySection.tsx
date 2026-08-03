import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maicore } from "../../../lib/maicore";
import { containerKeys } from "./queryKeys";
import { DetailItem } from "./DetailItem";
import { Toggle } from "./Toggle";

export function PolicySection({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const policyQuery = useQuery({
    queryKey: containerKeys.policy(containerId),
    queryFn: async () => {
      try {
        return await maicore.hierarchy.policies.get(containerId);
      } catch {
        return null;
      }
    },
  });

  const [form, setForm] = useState({
    maximum_depth: "",
    maximum_children: "",
    allow_transfers: true,
    allow_invitations: true,
    allow_public_discovery: false,
    default_visibility: "private" as string,
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      maicore.hierarchy.policies.apply(containerId, {
        maximum_depth: form.maximum_depth ? Number(form.maximum_depth) : undefined,
        maximum_children: form.maximum_children
          ? Number(form.maximum_children)
          : undefined,
        allow_transfers: form.allow_transfers,
        allow_invitations: form.allow_invitations,
        allow_public_discovery: form.allow_public_discovery,
        default_visibility: form.default_visibility as
          | "public"
          | "protected"
          | "private",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: containerKeys.policy(containerId) });
      setEditing(false);
    },
  });

  const policy = policyQuery.data;

  const startEdit = () => {
    if (policy) {
      setForm({
        maximum_depth: policy.maximum_depth?.toString() ?? "",
        maximum_children: policy.maximum_children?.toString() ?? "",
        allow_transfers: policy.allow_transfers,
        allow_invitations: policy.allow_invitations,
        allow_public_discovery: policy.allow_public_discovery,
        default_visibility: policy.default_visibility ?? "private",
      });
    }
    setEditing(true);
  };

  const inputBase =
    "w-full px-3 py-2.5 sm:py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-black dark:text-white m-0">
          Hierarchy Policy
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs font-semibold text-black dark:text-white"
          >
            {policy ? "Edit" : "Apply Policy"}
          </button>
        )}
      </div>

      {policyQuery.isLoading && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Loading policy…
        </p>
      )}

      {!policyQuery.isLoading && !policy && !editing && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          No policy configured. Defaults apply (unlimited depth, children, all
          operations allowed).
        </p>
      )}

      {!editing && policy && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <DetailItem
            label="Max Depth"
            value={policy.maximum_depth?.toString() ?? "Unlimited"}
          />
          <DetailItem
            label="Max Children"
            value={policy.maximum_children?.toString() ?? "Unlimited"}
          />
          <DetailItem
            label="Transfers"
            value={policy.allow_transfers ? "Allowed" : "Blocked"}
          />
          <DetailItem
            label="Invitations"
            value={policy.allow_invitations ? "Allowed" : "Blocked"}
          />
          <DetailItem
            label="Discovery"
            value={policy.allow_public_discovery ? "Public" : "Hidden"}
          />
          <DetailItem label="Default Visibility" value={policy.default_visibility} />
        </div>
      )}

      {editing && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Max Depth (blank = unlimited)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.maximum_depth}
                onChange={(e) => setForm({ ...form, maximum_depth: e.target.value })}
                placeholder="Unlimited"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Max Children (blank = unlimited)
              </label>
              <input
                type="number"
                min="0"
                value={form.maximum_children}
                onChange={(e) =>
                  setForm({ ...form, maximum_children: e.target.value })
                }
                placeholder="Unlimited"
                className={inputBase}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Default Visibility
              </label>
              <select
                value={form.default_visibility}
                onChange={(e) =>
                  setForm({ ...form, default_visibility: e.target.value })
                }
                className={inputBase}
              >
                <option value="public">Public</option>
                <option value="protected">Protected</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mb-5">
            <Toggle
              label="Transfers"
              checked={form.allow_transfers}
              onChange={(v) => setForm({ ...form, allow_transfers: v })}
            />
            <Toggle
              label="Invitations"
              checked={form.allow_invitations}
              onChange={(v) => setForm({ ...form, allow_invitations: v })}
            />
            <Toggle
              label="Public Discovery"
              checked={form.allow_public_discovery}
              onChange={(v) => setForm({ ...form, allow_public_discovery: v })}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 sm:py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
            >
              Cancel
            </button>
            <button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="px-4 py-2.5 sm:py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
            >
              {applyMutation.isPending ? "Saving…" : "Apply Policy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hrApi as api } from "./hr-api";

/**
 * HR reconciliation policy — the explicit rules that connect HR to membership:
 *   - must an employed actor be a member?
 *   - does assigning a position grant its roles?
 *   - does assigning auto-seat membership if absent?
 *   - what base role to seat with.
 */
export default function HrPolicyPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canManage = can("maicore.hr.policy.manage");

  const policy = useQuery({
    queryKey: ["hr", "policy", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/policy`),
    enabled: can("maicore.hr.policy.view") || canManage,
  });

  const [form, setForm] = useState<any>(null);
  useEffect(() => {
    if (policy.data) setForm(policy.data);
  }, [policy.data]);

  const save = useMutation({
    mutationFn: () => api("PUT", `/containers/${containerId}/policy`, form),
    onSuccess: () => {
      setMsg("Policy saved.");
      qc.invalidateQueries({ queryKey: ["hr", "policy", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  if (!can("maicore.hr.policy.view") && !canManage) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        You don't have permission to view HR policy.
      </div>
    );
  }
  if (policy.isLoading || !form)
    return <div className="p-4 text-sm text-neutral-500">Loading…</div>;

  const Toggle = ({
    k,
    label,
    desc,
  }: {
    k: string;
    label: string;
    desc: string;
  }) => (
    <label className="flex items-start gap-3 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <input
        type="checkbox"
        checked={!!form[k]}
        disabled={!canManage}
        onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
        className="mt-1"
      />
      <div>
        <div className="text-sm font-medium text-black dark:text-white">
          {label}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {desc}
        </div>
      </div>
    </label>
  );

  return (
    <div className="p-4 max-w-xl space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
        <Toggle
          k="employment_requires_membership"
          label="Employment requires membership"
          desc="A personnel record must correspond to an active member of this container."
        />
        <Toggle
          k="assignment_grants_role"
          label="Assignment grants role"
          desc="Assigning someone to a position grants that position's roles automatically."
        />
        <Toggle
          k="assignment_seats_membership"
          label="Assignment seats membership"
          desc="If the assigned actor isn't a member yet, seat them automatically."
        />

        <div className="pt-3">
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            Default member role (when auto-seating)
          </label>
          <input
            value={form.default_member_role ?? "member"}
            disabled={!canManage}
            onChange={(e) =>
              setForm({ ...form, default_member_role: e.target.value })
            }
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-48"
          />
        </div>
      </div>

      {canManage && (
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          Save policy
        </button>
      )}
    </div>
  );
}

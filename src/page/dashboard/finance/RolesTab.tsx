import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { AccountRole } from "../../../lib/sdk/domains/finance";
import { badgeClass, cardClass, errorMessage, errorTextClass, secondaryButtonClass, selectClass } from "./ui";

/**
 * Account roles are how the rest of the system (and packs) talk to the
 * chart of accounts without hardcoding an account: a rule says "credit
 * generic.revenue" and this mapping decides which real account that is.
 */
export function RolesTab({ containerId }: { containerId: string }) {
  const { data: roles, isLoading, error } = useQuery({
    queryKey: ["finance", "roles", containerId],
    queryFn: () => sdk.finance.listRoles(containerId),
  });
  const { data: accounts } = useQuery({
    queryKey: ["finance", "accounts", containerId],
    queryFn: () => sdk.finance.listAccounts(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
        Map each role to one of your accounts. Automatic postings (from other parts of the system) use these roles —
        if one isn't mapped, that posting waits in the posting queue instead of guessing.
      </p>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={errorTextClass}>{errorMessage(error, "Couldn't load account roles.")}</p>}

      {roles && accounts && (
        <ul className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {roles.map((role) => (
            <RoleRow key={role.code} containerId={containerId} role={role} accounts={accounts} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RoleRow({
  containerId, role, accounts,
}: { containerId: string; role: AccountRole; accounts: import("../../../lib/sdk/domains/finance").Account[] }) {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(role.account?.id ?? "");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["finance", "roles", containerId] });
  const map = useMutation({ mutationFn: () => sdk.finance.mapRole(containerId, role.code, accountId), onSuccess: refresh });
  const unmap = useMutation({ mutationFn: () => sdk.finance.unmapRole(containerId, role.code), onSuccess: refresh });

  const eligible = accounts.filter((a) => role.account_types.includes(a.type) && a.is_active && !a.is_group);
  const changed = accountId !== (role.account?.id ?? "");

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{role.label}</span>
          <span className={badgeClass}>{role.code}</span>
        </div>
        {role.description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">{role.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <select className={`${selectClass} w-56`} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Not mapped</option>
          {eligible.map((a) => (
            <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
          ))}
        </select>
        {changed && accountId && (
          <button type="button" onClick={() => map.mutate()} disabled={map.isPending} className={secondaryButtonClass}>
            {map.isPending ? "Saving…" : "Save"}
          </button>
        )}
        {!changed && role.account && (
          <button type="button" onClick={() => { unmap.mutate(); setAccountId(""); }} disabled={unmap.isPending} className={secondaryButtonClass}>
            Unmap
          </button>
        )}
        {(map.isError || unmap.isError) && <p className={errorTextClass}>{errorMessage(map.error ?? unmap.error, "Couldn't save that.")}</p>}
      </div>
    </li>
  );
}

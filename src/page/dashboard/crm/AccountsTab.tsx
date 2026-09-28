import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { AccountStatus } from "../../../lib/sdk/domains/crm";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: AccountStatus): string {
  if (status === "customer") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "churned") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"; // prospect
}

export function AccountsTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["crm", "accounts", containerId],
    queryFn: () => sdk.crm.listAccountsForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Accounts</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New account"}
        </button>
      </div>

      {showCreate && (
        <CreateAccountForm containerId={containerId} onDone={() => setShowCreate(false)} />
      )}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {accounts && accounts.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Building2 className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No accounts yet.</p>
        </div>
      )}

      {accounts && accounts.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {accounts.map((a) => (
            <li key={a.id}>
              <Link
                to={`/dashboard/crm/accounts/${a.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <span
                      className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {(a.industry || a.website) && (
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {[a.industry, a.website].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateAccountForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.crm.createAccount(containerId, {
        name,
        industry: industry || undefined,
        website: website || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "accounts", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Name</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Industry</label>
          <input className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Website</label>
          <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this account.</p>
        )}
      </div>
    </div>
  );
}

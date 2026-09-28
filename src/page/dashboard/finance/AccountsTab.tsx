import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Account, AccountType } from "../../../lib/sdk/domains/finance";
import {
  accountTypeClasses,
  accountTypeLabel,
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  flattenAccounts,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
} from "./ui";

const TYPES: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

export function AccountsTab({ containerId }: { containerId: string }) {
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["finance", "accounts", containerId],
    queryFn: () => sdk.finance.listAccounts(containerId),
  });
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Group accounts (ones with sub-accounts) can't be posted to directly —
          post to one of their sub-accounts.
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className={primaryButtonClass}
        >
          {creating ? "Cancel" : "New account"}
        </button>
      </div>

      {creating && accounts && (
        <CreateAccountForm
          containerId={containerId}
          accounts={accounts}
          onDone={() => setCreating(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}
      {error && (
        <p className={errorTextClass}>
          {errorMessage(
            error,
            "Couldn't load the chart of accounts. Have the books been opened?",
          )}
        </p>
      )}

      {accounts && (
        <ul
          className={`flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}
        >
          {flattenAccounts(accounts).map(({ account, depth }) => (
            <AccountRow
              key={account.id}
              containerId={containerId}
              account={account}
              depth={depth}
              expanded={selected === account.id}
              onToggle={() =>
                setSelected(selected === account.id ? null : account.id)
              }
            />
          ))}
          {accounts.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
              No accounts yet.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CreateAccountForm({
  containerId,
  accounts,
  onDone,
}: {
  containerId: string;
  accounts: Account[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () =>
      sdk.finance.createAccount(containerId, {
        code: code.trim(),
        name: name.trim(),
        type,
        parent_id: parentId || null,
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["finance", "accounts", containerId],
      });
      onDone();
    },
  });

  const eligibleParents = accounts.filter(
    (a) => a.type === type && a.is_active,
  );

  return (
    <div className={`p-4 ${cardClass}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Code</label>
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="1000"
          />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cash"
          />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Type</label>
          <select
            className={selectClass}
            value={type}
            onChange={(e) => {
              setType(e.target.value as AccountType);
              setParentId("");
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {accountTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>
            Parent (optional)
          </label>
          <select
            className={selectClass}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None — a top-level account</option>
            {eligibleParents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={`mb-1 block ${labelClass}`}>
            Description (optional)
          </label>
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!code.trim() || !name.trim() || create.isPending}
          className={primaryButtonClass}
        >
          {create.isPending ? "Creating…" : "Create account"}
        </button>
        {create.isError && (
          <p className={errorTextClass}>
            {errorMessage(create.error, "Couldn't create the account.")}
          </p>
        )}
      </div>
    </div>
  );
}

function AccountRow({
  containerId,
  account,
  depth,
  expanded,
  onToggle,
}: {
  containerId: string;
  account: Account;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
          {account.code}
        </span>
        <span
          className={
            !account.is_active
              ? "text-neutral-400 line-through dark:text-neutral-600"
              : ""
          }
        >
          {account.name}
        </span>
        <span className={`${badgeClass} ${accountTypeClasses(account.type)}`}>
          {accountTypeLabel(account.type)}
        </span>
        {account.is_group && <span className={badgeClass}>Group</span>}
        {account.roles.map((r) => (
          <span key={r} className={badgeClass}>
            {r}
          </span>
        ))}
        {!account.is_active && <span className={badgeClass}>Inactive</span>}
      </button>
      {expanded && (
        <AccountEditPanel containerId={containerId} account={account} />
      )}
    </li>
  );
}

function AccountEditPanel({
  containerId,
  account,
}: {
  containerId: string;
  account: Account;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(account.name);
  const [description, setDescription] = useState(account.description);
  const [code, setCode] = useState(account.code);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["finance", "accounts", containerId],
    });

  const save = useMutation({
    mutationFn: () =>
      sdk.finance.updateAccount(containerId, account.id, {
        ...(name.trim() !== account.name ? { name: name.trim() } : {}),
        ...(description !== account.description ? { description } : {}),
        ...(code.trim() !== account.code ? { code: code.trim() } : {}),
      }),
    onSuccess: refresh,
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) =>
      active
        ? sdk.finance.activateAccount(containerId, account.id)
        : sdk.finance.deactivateAccount(containerId, account.id),
    onSuccess: refresh,
  });

  const changed =
    name.trim() !== account.name ||
    description !== account.description ||
    code.trim() !== account.code;

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Code</label>
          <input
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Description</label>
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Type can't change once this account has postings; it can't become a
        group once it has, either.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!changed || save.isPending}
          className={primaryButtonClass}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setActive.mutate(!account.is_active)}
          disabled={setActive.isPending}
          className={secondaryButtonClass}
        >
          {account.is_active ? "Deactivate" : "Activate"}
        </button>
        {(save.isError || setActive.isError) && (
          <p className={errorTextClass}>
            {errorMessage(
              save.error ?? setActive.error,
              "That change was refused.",
            )}
          </p>
        )}
      </div>
    </div>
  );
}

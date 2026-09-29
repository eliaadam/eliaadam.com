import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Customer } from "../../../lib/sdk/domains/customerCredit";
import {
  errorMessage,
  errorTextClass,
  formatMoney,
  inputClass,
  labelClass,
  secondaryButtonClass,
} from "./ui";

/**
 * Search an existing customer or add one on the spot, then show their
 * available credit once picked (opening a credit account for a brand-new
 * customer is a separate, deliberate step — not implied by adding them
 * here, since not every customer buys on credit).
 */
export function CustomerPicker({
  containerId,
  customerId,
  currency,
  onPick,
}: {
  containerId: string;
  customerId: string | null;
  currency: string;
  onPick: (customer: Customer | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: results } = useQuery({
    queryKey: ["customer-credit", "customers", containerId, search],
    queryFn: () =>
      sdk.customerCredit.listCustomers(containerId, search || undefined),
    enabled: search.trim().length > 0 && !customerId,
  });

  const { data: picked } = useQuery({
    queryKey: ["customer-credit", "customer", containerId, customerId],
    queryFn: () =>
      sdk.customerCredit.getCustomer(containerId, customerId as string),
    enabled: !!customerId,
  });

  const { data: account } = useQuery({
    queryKey: ["customer-credit", "account", containerId, customerId],
    queryFn: () =>
      sdk.customerCredit.getAccount(containerId, customerId as string),
    enabled: !!customerId,
    retry: false,
  });

  if (customerId && picked) {
    return (
      <div
        className={`flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800`}
      >
        <div>
          <span className="font-medium">{picked.name}</span>
          {picked.phone && (
            <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-500">
              {picked.phone}
            </span>
          )}
          <div className="text-xs text-neutral-500 dark:text-neutral-500">
            {account
              ? `${formatMoney(account.available, currency)} available`
              : "No credit account open for this customer"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onPick(null)}
          className={secondaryButtonClass}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        className={inputClass}
        placeholder="Search customer by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results && results.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-800">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(c);
                  setSearch("");
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span>{c.name}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-500">
                  {c.phone}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && results.length === 0 && search.trim() && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`mt-1 ${secondaryButtonClass}`}
        >
          No match — add "{search.trim()}" as a new customer
        </button>
      )}
      {adding && (
        <AddCustomerForm
          containerId={containerId}
          initialName={search}
          onDone={(c) => {
            onPick(c);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function AddCustomerForm({
  containerId,
  initialName,
  onDone,
  onCancel,
}: {
  containerId: string;
  initialName: string;
  onDone: (c: Customer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      sdk.customerCredit.createCustomer(containerId, {
        name: name.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (c) => {
      queryClient.invalidateQueries({
        queryKey: ["customer-credit", "customers", containerId],
      });
      onDone(c);
    },
  });

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <div>
        <label className={`mb-1 block ${labelClass}`}>Name</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className={`mb-1 block ${labelClass}`}>Phone (optional)</label>
        <input
          className={inputClass}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={!name.trim() || create.isPending}
          className={secondaryButtonClass}
        >
          {create.isPending ? "Adding…" : "Add customer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          Cancel
        </button>
        {create.isError && (
          <p className={errorTextClass}>
            {errorMessage(create.error, "Couldn't add that customer.")}
          </p>
        )}
      </div>
    </div>
  );
}

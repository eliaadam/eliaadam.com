import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContainer } from "../../components/context/ContainerContext";
import { sdk } from "../../lib/sdk";
import { CustomerDetail } from "./customer-credit/CustomerDetail";
import { badgeClass, cardClass, errorMessage, errorTextClass, inputClass, labelClass, primaryButtonClass } from "./customer-credit/ui";

/** Customer Credit — customers who can pay partially or later, each with a
 * running balance backed by real postings to Finance. */
export function CustomerCreditDashboard() {
  const { currentContainerId } = useContainer();

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — customers belong to whichever container you're in.
      </p>
    );
  }
  return <Loaded containerId={currentContainerId} />;
}

function Loaded({ containerId }: { containerId: string }) {
  const { data: settings } = useQuery({
    queryKey: ["finance", "settings", containerId],
    queryFn: () => sdk.finance.getSettings(containerId),
  });
  const currency = settings?.base_currency ?? "";

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customer-credit", "customers", containerId, search],
    queryFn: () => sdk.customerCredit.listCustomers(containerId, search || undefined),
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Customer Credit</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Customers who can pay partially or later. Every charge and payment posts a real journal in Finance.
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <input className={`${inputClass} max-w-xs`} placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" onClick={() => setCreating((v) => !v)} className={primaryButtonClass}>
          {creating ? "Cancel" : "New customer"}
        </button>
      </div>

      {creating && <CreateCustomerForm containerId={containerId} onDone={(id) => { setCreating(false); setSelectedId(id); }} />}

      {isLoading && <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}
      {error && <p className={`mt-3 ${errorTextClass}`}>{errorMessage(error, "Couldn't load customers.")}</p>}

      {customers && (
        <ul className={`mt-4 flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 ${cardClass}`}>
          {customers.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className={!c.is_active ? "text-neutral-400 line-through dark:text-neutral-600" : "font-medium"}>{c.name}</span>
                {c.phone && <span className="text-xs text-neutral-500 dark:text-neutral-500">{c.phone}</span>}
                {!c.is_active && <span className={badgeClass}>Inactive</span>}
              </button>
              {selectedId === c.id && <CustomerDetail containerId={containerId} customerId={c.id} currency={currency} />}
            </li>
          ))}
          {customers.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">No customers yet.</li>}
        </ul>
      )}
    </div>
  );
}

function CreateCustomerForm({ containerId, onDone }: { containerId: string; onDone: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const create = useMutation({
    mutationFn: () => sdk.customerCredit.createCustomer(containerId, { name: name.trim(), phone: phone.trim(), email: email.trim() }),
    onSuccess: (c) => { queryClient.invalidateQueries({ queryKey: ["customer-credit", "customers", containerId] }); onDone(c.id); },
  });

  return (
    <div className={`mt-3 p-4 ${cardClass}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className={`mb-1 block ${labelClass}`}>Email</label>
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending} className={primaryButtonClass}>
          {create.isPending ? "Creating…" : "Create customer"}
        </button>
        {create.isError && <p className={errorTextClass}>{errorMessage(create.error, "Couldn't create that customer.")}</p>}
      </div>
    </div>
  );
}

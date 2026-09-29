import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { StatementList } from "./StatementList";
import { errorMessage, errorTextClass, formatMoney, inputClass, isNotFound, labelClass, primaryButtonClass, secondaryButtonClass } from "./ui";

export function CustomerDetail({ containerId, customerId, currency }: { containerId: string; customerId: string; currency: string }) {
  const queryClient = useQueryClient();
  const { data: customer } = useQuery({
    queryKey: ["customer-credit", "customer", containerId, customerId],
    queryFn: () => sdk.customerCredit.getCustomer(containerId, customerId),
  });
  const { data: account, error: accountError } = useQuery({
    queryKey: ["customer-credit", "account", containerId, customerId],
    queryFn: () => sdk.customerCredit.getAccount(containerId, customerId),
    retry: false,
  });

  const refreshCustomer = () => queryClient.invalidateQueries({ queryKey: ["customer-credit", "customer", containerId, customerId] });
  const refreshAccount = () => queryClient.invalidateQueries({ queryKey: ["customer-credit", "account", containerId, customerId] });
  const refreshAll = () => {
    refreshAccount();
    queryClient.invalidateQueries({ queryKey: ["customer-credit", "transactions", containerId, customerId] });
    queryClient.invalidateQueries({ queryKey: ["customer-credit", "customers", containerId] });
  };

  const setActive = useMutation({
    mutationFn: (active: boolean) => (active ? sdk.customerCredit.activateCustomer(containerId, customerId) : sdk.customerCredit.deactivateCustomer(containerId, customerId)),
    onSuccess: () => { refreshCustomer(); queryClient.invalidateQueries({ queryKey: ["customer-credit", "customers", containerId] }); },
  });

  if (!customer) return <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">Loading…</div>;

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <ProfileForm containerId={containerId} customer={customer} onSaved={refreshCustomer} />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => setActive.mutate(!customer.is_active)} disabled={setActive.isPending} className={secondaryButtonClass}>
          {customer.is_active ? "Deactivate customer" : "Activate customer"}
        </button>
      </div>

      <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {isNotFound(accountError) ? (
          <OpenAccountForm containerId={containerId} customerId={customerId} onOpened={refreshAll} />
        ) : account ? (
          <>
            <AccountPanel containerId={containerId} customerId={customerId} account={account} currency={currency} onChanged={refreshAll} />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ChargeForm containerId={containerId} customerId={customerId} onDone={refreshAll} />
              <PaymentForm containerId={containerId} customerId={customerId} onDone={refreshAll} />
              <AdjustForm containerId={containerId} customerId={customerId} onDone={refreshAll} />
            </div>
            <div className="mt-4">
              <StatementList containerId={containerId} customerId={customerId} currency={currency} />
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading credit account…</p>
        )}
      </div>
    </div>
  );
}

function ProfileForm({ containerId, customer, onSaved }: { containerId: string; customer: import("../../../lib/sdk/domains/customerCredit").Customer; onSaved: () => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [notes, setNotes] = useState(customer.notes);

  const save = useMutation({
    mutationFn: () => sdk.customerCredit.updateCustomer(containerId, customer.id, {
      ...(name.trim() !== customer.name ? { name: name.trim() } : {}),
      ...(phone.trim() !== customer.phone ? { phone: phone.trim() } : {}),
      ...(email.trim() !== customer.email ? { email: email.trim() } : {}),
      ...(notes !== customer.notes ? { notes } : {}),
    }),
    onSuccess: onSaved,
  });

  const changed = name.trim() !== customer.name || phone.trim() !== customer.phone || email.trim() !== customer.email || notes !== customer.notes;

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div>
          <label className={`mb-1 block ${labelClass}`}>Notes</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => save.mutate()} disabled={!changed || save.isPending} className={secondaryButtonClass}>
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
        {save.isError && <p className={errorTextClass}>{errorMessage(save.error, "Couldn't save that.")}</p>}
      </div>
    </div>
  );
}

function OpenAccountForm({ containerId, customerId, onOpened }: { containerId: string; customerId: string; onOpened: () => void }) {
  const [limit, setLimit] = useState("");
  const open = useMutation({
    mutationFn: () => sdk.customerCredit.openAccount(containerId, customerId, Math.round((Number(limit) || 0) * 100)),
    onSuccess: onOpened,
  });

  return (
    <div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">No credit account is open for this customer yet.</p>
      <div className="mt-2 flex items-end gap-2">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Credit limit</label>
          <input className={`${inputClass} w-40`} type="number" min="0" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" />
        </div>
        <button type="button" onClick={() => open.mutate()} disabled={!limit || Number(limit) < 0 || open.isPending} className={primaryButtonClass}>
          {open.isPending ? "Opening…" : "Open credit account"}
        </button>
      </div>
      {open.isError && <p className={`mt-1 ${errorTextClass}`}>{errorMessage(open.error, "Couldn't open the account.")}</p>}
    </div>
  );
}

function AccountPanel({
  containerId, customerId, account, currency, onChanged,
}: { containerId: string; customerId: string; account: import("../../../lib/sdk/domains/customerCredit").CreditAccount; currency: string; onChanged: () => void }) {
  const [limit, setLimit] = useState(String(account.credit_limit / 100));
  const setLimitMut = useMutation({
    mutationFn: () => sdk.customerCredit.setCreditLimit(containerId, customerId, Math.round((Number(limit) || 0) * 100)),
    onSuccess: onChanged,
  });
  const toggleFreeze = useMutation({
    mutationFn: () => (account.is_active ? sdk.customerCredit.freezeAccount(containerId, customerId) : sdk.customerCredit.unfreezeAccount(containerId, customerId)),
    onSuccess: onChanged,
  });
  const limitChanged = Math.round((Number(limit) || 0) * 100) !== account.credit_limit;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <div className={labelClass}>Balance</div>
        <div className="text-lg font-semibold">{formatMoney(account.balance, currency)}</div>
      </div>
      <div>
        <div className={labelClass}>Available</div>
        <div className="text-sm">{formatMoney(account.available, currency)}</div>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className={`mb-1 block ${labelClass}`}>Credit limit</label>
          <input className={`${inputClass} w-32`} type="number" min="0" step="0.01" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </div>
        {limitChanged && (
          <button type="button" onClick={() => setLimitMut.mutate()} disabled={setLimitMut.isPending} className={secondaryButtonClass}>
            {setLimitMut.isPending ? "Saving…" : "Save limit"}
          </button>
        )}
      </div>
      <button type="button" onClick={() => toggleFreeze.mutate()} disabled={toggleFreeze.isPending} className={secondaryButtonClass}>
        {account.is_active ? "Freeze account" : "Unfreeze account"}
      </button>
      {!account.is_active && <span className="text-xs text-amber-700 dark:text-amber-400">Frozen — no new charges, payments still accepted.</span>}
      {(setLimitMut.isError || toggleFreeze.isError) && <p className={errorTextClass}>{errorMessage(setLimitMut.error ?? toggleFreeze.error, "That change was refused.")}</p>}
    </div>
  );
}

function ChargeForm({ containerId, customerId, onDone }: { containerId: string; customerId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const charge = useMutation({
    mutationFn: () => sdk.customerCredit.charge(containerId, customerId, Math.round((Number(amount) || 0) * 100), description.trim()),
    onSuccess: () => { setAmount(""); setDescription(""); onDone(); },
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className={labelClass}>Record a charge</div>
      <input className={inputClass} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input className={inputClass} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="button" onClick={() => charge.mutate()} disabled={!amount || !description.trim() || charge.isPending} className={secondaryButtonClass}>
        {charge.isPending ? "Charging…" : "Charge"}
      </button>
      {charge.isError && <p className={errorTextClass}>{errorMessage(charge.error, "Couldn't record that charge.")}</p>}
    </div>
  );
}

function PaymentForm({ containerId, customerId, onDone }: { containerId: string; customerId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const pay = useMutation({
    mutationFn: () => sdk.customerCredit.recordPayment(containerId, customerId, Math.round((Number(amount) || 0) * 100), description.trim()),
    onSuccess: () => { setAmount(""); setDescription(""); onDone(); },
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className={labelClass}>Record a payment</div>
      <input className={inputClass} type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input className={inputClass} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="button" onClick={() => pay.mutate()} disabled={!amount || !description.trim() || pay.isPending} className={secondaryButtonClass}>
        {pay.isPending ? "Recording…" : "Record payment"}
      </button>
      {pay.isError && <p className={errorTextClass}>{errorMessage(pay.error, "Couldn't record that payment.")}</p>}
    </div>
  );
}

function AdjustForm({ containerId, customerId, onDone }: { containerId: string; customerId: string; onDone: () => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [offsetRole, setOffsetRole] = useState("generic.expense");
  const adjust = useMutation({
    mutationFn: () => sdk.customerCredit.adjust(containerId, customerId, Math.round((Number(delta) || 0) * 100), reason.trim(), offsetRole),
    onSuccess: () => { setDelta(""); setReason(""); onDone(); },
  });
  return (
    <div className="flex flex-col gap-1.5">
      <div className={labelClass}>Adjustment</div>
      <input className={inputClass} type="number" step="0.01" placeholder="Delta (negative to reduce)" value={delta} onChange={(e) => setDelta(e.target.value)} />
      <input className={inputClass} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <input className={inputClass} placeholder="Offset role (e.g. generic.expense)" value={offsetRole} onChange={(e) => setOffsetRole(e.target.value)} />
      <button type="button" onClick={() => adjust.mutate()} disabled={!delta || Number(delta) === 0 || !reason.trim() || !offsetRole.trim() || adjust.isPending} className={secondaryButtonClass}>
        {adjust.isPending ? "Adjusting…" : "Apply adjustment"}
      </button>
      {adjust.isError && <p className={errorTextClass}>{errorMessage(adjust.error, "Couldn't apply that adjustment.")}</p>}
    </div>
  );
}

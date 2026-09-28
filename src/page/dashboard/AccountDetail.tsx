import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { ActivityLog } from "./crm/ActivityLog";

/**
 * One account's own page — mirrors EmployeeDetail's/ProjectDetail's
 * role: the deep page where everything about one customer converges
 * (contacts, opportunities, cases, activity). Container-wide views
 * (all accounts, the pipeline board, the case queue) live on
 * CRMDashboard's own tabs.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

export function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ["crm", "account", accountId],
    queryFn: () => sdk.crm.getAccount(accountId!),
    enabled: Boolean(accountId),
  });

  const invalidateAccount = () =>
    queryClient.invalidateQueries({ queryKey: ["crm", "account", accountId] });

  const customerMutation = useMutation({
    mutationFn: () => sdk.crm.markAccountCustomer(accountId!),
    onSuccess: invalidateAccount,
  });
  const churnedMutation = useMutation({
    mutationFn: () => sdk.crm.markAccountChurned(accountId!),
    onSuccess: invalidateAccount,
  });

  if (!accountId) return null;
  if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>;
  if (!account) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Account not found.</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{account.name}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {[account.industry, account.website, account.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium dark:bg-neutral-800">
            {account.status}
          </span>
          {account.status !== "customer" && (
            <button
              type="button"
              onClick={() => customerMutation.mutate()}
              disabled={customerMutation.isPending}
              className={secondaryButtonClass}
            >
              Mark customer
            </button>
          )}
          {account.status !== "churned" && (
            <button
              type="button"
              onClick={() => churnedMutation.mutate()}
              disabled={churnedMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Mark churned
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <ContactsSection accountId={accountId} />
          <OpportunitiesSection accountId={accountId} />
          <CasesSection accountId={accountId} />
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="mb-3 text-sm font-medium">Activity</p>
          <ActivityLog relatedToType="account" relatedToId={accountId} />
        </div>
      </div>
    </div>
  );
}

function ContactsSection({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");

  const { data: contacts } = useQuery({
    queryKey: ["crm", "contacts", accountId],
    queryFn: () => sdk.crm.listContactsForAccount(accountId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.crm.createContact(accountId, {
        full_name: fullName,
        email: email || undefined,
        title: title || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "contacts", accountId] });
      setFullName("");
      setEmail("");
      setTitle("");
      setShowAdd(false);
    },
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Contacts</p>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className={secondaryButtonClass}>
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>
      {showAdd && (
        <div className="mt-2 flex flex-col gap-2">
          <input className={inputClass} placeholder="Full name…" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} placeholder="Email…" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inputClass} placeholder="Title…" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!fullName.trim() || mutation.isPending}
            className={`w-fit ${secondaryButtonClass}`}
          >
            Add contact
          </button>
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-1.5 text-xs">
        {contacts?.map((c) => (
          <li key={c.id} className="text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-black dark:text-white">{c.full_name}</span>
            {[c.title, c.email].filter(Boolean).length > 0 && ` · ${[c.title, c.email].filter(Boolean).join(" · ")}`}
          </li>
        ))}
        {contacts?.length === 0 && <li className="text-neutral-400 dark:text-neutral-600">No contacts yet.</li>}
      </ul>
    </div>
  );
}

function OpportunitiesSection({ accountId }: { accountId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");

  const { data: opportunities } = useQuery({
    queryKey: ["crm", "account-opportunities", accountId],
    queryFn: () => sdk.crm.listOpportunitiesForAccount(accountId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.crm.createOpportunity(accountId, {
        name,
        amount: amount ? Number(amount) : undefined,
        currency: currency || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "account-opportunities", accountId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "pipeline"] });
      setName("");
      setAmount("");
      setCurrency("");
      setShowAdd(false);
    },
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Opportunities</p>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className={secondaryButtonClass}>
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>
      {showAdd && (
        <div className="mt-2 flex flex-col gap-2">
          <input className={inputClass} placeholder="Opportunity name…" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} type="number" placeholder="Amount…" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={inputClass} placeholder="Currency (e.g. TZS)…" value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className={`w-fit ${secondaryButtonClass}`}
          >
            Add opportunity
          </button>
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-1.5 text-xs">
        {opportunities?.map((o) => (
          <li key={o.id} className="text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-black dark:text-white">{o.name}</span> · {o.stage.replace("_", " ")}
            {o.amount != null && ` · ${o.currency ?? ""} ${o.amount.toLocaleString()}`}
            {o.stage === "closed_lost" && o.lost_reason && ` · ${o.lost_reason}`}
          </li>
        ))}
        {opportunities?.length === 0 && <li className="text-neutral-400 dark:text-neutral-600">No opportunities yet.</li>}
      </ul>
    </div>
  );
}

function CasesSection({ accountId }: { accountId: string }) {
  const { data: cases } = useQuery({
    queryKey: ["crm", "account-cases", accountId],
    queryFn: () => sdk.crm.listCasesForAccount(accountId),
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium">Support cases</p>
      <ul className="mt-2 flex flex-col gap-1.5 text-xs">
        {cases?.map((c) => (
          <li key={c.id} className="text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-black dark:text-white">{c.subject}</span> · {c.priority} · {c.status}
          </li>
        ))}
        {cases?.length === 0 && <li className="text-neutral-400 dark:text-neutral-600">No cases on record.</li>}
      </ul>
    </div>
  );
}

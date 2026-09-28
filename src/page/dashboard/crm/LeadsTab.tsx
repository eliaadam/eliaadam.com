import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { sdk } from "../../../lib/sdk";
import type { ConvertLeadResult, Lead, LeadStatus } from "../../../lib/sdk/domains/crm";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

// Mirrors the backend's own legal-moves table (domain/transitions.py).
const NEXT_STATUS: Record<LeadStatus, LeadStatus | null> = {
  new: "contacted",
  contacted: "qualified",
  qualified: null,
  unqualified: null,
  converted: null,
};

function statusClasses(status: LeadStatus): string {
  if (status === "converted") return "bg-black text-white dark:bg-white dark:text-black";
  if (status === "unqualified") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  if (status === "qualified") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export function LeadsTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [lastConversion, setLastConversion] = useState<ConvertLeadResult | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["crm", "leads", containerId],
    queryFn: () => sdk.crm.listLeadsForContainer(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Leads</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New lead"}
        </button>
      </div>

      {showCreate && <CreateLeadForm containerId={containerId} onDone={() => setShowCreate(false)} />}

      {lastConversion && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
          <span>
            Converted — created account <b>{lastConversion.account.name}</b> and opportunity{" "}
            <b>{lastConversion.opportunity.name}</b>.
          </span>
          <div className="flex items-center gap-3">
            <Link
              to={`/dashboard/crm/accounts/${lastConversion.account.id}`}
              className="text-xs font-medium hover:underline"
            >
              Open account →
            </Link>
            <button
              type="button"
              onClick={() => setLastConversion(null)}
              className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      {leads && leads.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <UserPlus className="mx-auto text-neutral-400 dark:text-neutral-600" size={20} />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">No leads yet.</p>
        </div>
      )}

      {leads && leads.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {leads.map((l) => (
            <LeadRow key={l.id} lead={l} containerId={containerId} onConverted={setLastConversion} />
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  containerId,
  onConverted,
}: {
  lead: Lead;
  containerId: string;
  onConverted: (r: ConvertLeadResult) => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["crm", "leads", containerId] });
    queryClient.invalidateQueries({ queryKey: ["crm", "accounts", containerId] });
    queryClient.invalidateQueries({ queryKey: ["crm", "pipeline", containerId] });
  };

  const advanceMutation = useMutation({
    mutationFn: (to: LeadStatus) => sdk.crm.advanceLead(lead.id, to),
    onSuccess: invalidate,
  });
  const convertMutation = useMutation({
    mutationFn: () => sdk.crm.convertLead(lead.id),
    onSuccess: (result) => {
      invalidate();
      onConverted(result);
    },
  });

  const next = NEXT_STATUS[lead.status];
  const canDisqualify = lead.status === "contacted" || lead.status === "qualified";
  const canConvert = lead.status === "contacted" || lead.status === "qualified";
  const isTerminal = lead.status === "converted" || lead.status === "unqualified";

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{lead.full_name}</p>
          <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(lead.status)}`}>
            {lead.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
          {[lead.company_name, lead.email, lead.source].filter(Boolean).join(" · ")}
        </p>
        {convertMutation.isError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Couldn't convert this lead.</p>
        )}
      </div>
      {!isTerminal && (
        <div className="flex flex-none items-center gap-2">
          {next && (
            <button
              type="button"
              onClick={() => advanceMutation.mutate(next)}
              disabled={advanceMutation.isPending}
              className={secondaryButtonClass}
            >
              → {next}
            </button>
          )}
          {canConvert && (
            <button
              type="button"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              className={primaryButtonClass}
            >
              {convertMutation.isPending ? "Converting…" : "Convert"}
            </button>
          )}
          {canDisqualify && (
            <button
              type="button"
              onClick={() => advanceMutation.mutate("unqualified")}
              disabled={advanceMutation.isPending}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Disqualify
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function CreateLeadForm({ containerId, onDone }: { containerId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [source, setSource] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.crm.createLead(containerId, {
        full_name: fullName,
        email: email || undefined,
        company_name: companyName || undefined,
        source: source || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads", containerId] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Full name</label>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Email</label>
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Company</label>
          <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">Source</label>
          <input className={inputClass} value={source} onChange={(e) => setSource(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!fullName.trim() || mutation.isPending}
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
          <p className="text-xs text-red-600 dark:text-red-400">Couldn't create this lead.</p>
        )}
      </div>
    </div>
  );
}

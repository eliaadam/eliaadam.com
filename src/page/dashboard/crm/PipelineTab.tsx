import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type { Opportunity, OpportunityStage } from "../../../lib/sdk/domains/crm";

const secondaryButtonClass =
  "rounded-md px-2 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

// Open stages, left to right — mirrors the backend's own legal-moves
// table (domain/transitions.py); closed_won/closed_lost leave the
// board entirely since listPipeline returns open opportunities only.
const OPEN_STAGES: { key: OpportunityStage; label: string }[] = [
  { key: "prospecting", label: "Prospecting" },
  { key: "qualification", label: "Qualification" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
];

const NEXT_STAGE: Partial<Record<OpportunityStage, OpportunityStage>> = {
  prospecting: "qualification",
  qualification: "proposal",
  proposal: "negotiation",
  negotiation: "closed_won",
};

function weightedValue(opps: Opportunity[]): number {
  return opps.reduce((sum, o) => sum + ((o.amount ?? 0) * (o.probability ?? 0)) / 100, 0);
}

export function PipelineTab({ containerId }: { containerId: string }) {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["crm", "pipeline", containerId],
    queryFn: () => sdk.crm.listPipeline(containerId),
  });

  const all = opportunities ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Open pipeline</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          {all.length} open · weighted value {Math.round(weightedValue(all)).toLocaleString()}
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>}

      <div className="grid grid-cols-4 gap-3">
        {OPEN_STAGES.map((stage) => {
          const inStage = all.filter((o) => o.stage === stage.key);
          return (
            <div
              key={stage.key}
              className="flex min-h-[8rem] flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/40"
            >
              <div className="flex items-baseline justify-between px-1">
                <p className="text-xs font-medium">{stage.label}</p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-500">{inStage.length}</p>
              </div>
              {inStage.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} containerId={containerId} />
              ))}
              {inStage.length === 0 && (
                <p className="px-1 text-[11px] text-neutral-400 dark:text-neutral-600">Empty</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  containerId,
}: {
  opportunity: Opportunity;
  containerId: string;
}) {
  const queryClient = useQueryClient();
  const [showLostForm, setShowLostForm] = useState(false);
  const [reason, setReason] = useState("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "pipeline", containerId] });

  const advanceMutation = useMutation({
    mutationFn: (to: OpportunityStage) => sdk.crm.advanceOpportunity(opportunity.id, to),
    onSuccess: invalidate,
  });
  const lostMutation = useMutation({
    mutationFn: () => sdk.crm.markOpportunityLost(opportunity.id, reason || undefined),
    onSuccess: invalidate,
  });

  const next = NEXT_STAGE[opportunity.stage];

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
      <Link
        to={`/dashboard/crm/accounts/${opportunity.account_id}`}
        className="truncate text-xs font-medium hover:underline"
      >
        {opportunity.name}
      </Link>
      <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
        {opportunity.amount != null
          ? `${opportunity.currency ?? ""} ${opportunity.amount.toLocaleString()}`.trim()
          : "No amount"}
        {opportunity.probability != null && ` · ${opportunity.probability}%`}
      </p>
      <div className="flex items-center gap-1">
        {next && (
          <button
            type="button"
            onClick={() => advanceMutation.mutate(next)}
            disabled={advanceMutation.isPending}
            className={secondaryButtonClass}
          >
            {next === "closed_won" ? "Won ✓" : `→ ${next}`}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowLostForm((v) => !v)}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Lost
        </button>
      </div>
      {showLostForm && (
        <div className="flex items-center gap-1">
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Reason (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            onClick={() => lostMutation.mutate()}
            disabled={lostMutation.isPending}
            className={secondaryButtonClass}
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import type { ImpactLevel, ProbabilityLevel, RiskIssue, RiskIssueStatus, RiskIssueType } from "../../../lib/sdk/domains/projects";
import { sdk } from "../../../lib/sdk";
 
/**
 * Risk / Issue / Blocker tracking — one entity, one type field, not
 * three separate tabs, matching the backend's own RiskIssueState
 * shape. Every transition shows regardless of viewer — the backend's
 * own Ownership-OR-Authority check (this risk/issue's own owner, or
 * project.manage) is the real gate.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

function statusClasses(status: RiskIssueStatus): string {
  if (status === "resolved" || status === "closed") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "escalated") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  if (status === "mitigating") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"; // open
}

function impactClasses(impact: ImpactLevel): string {
  if (impact === "critical") return "text-red-600 dark:text-red-400";
  if (impact === "high") return "text-amber-600 dark:text-amber-400";
  return "text-neutral-500 dark:text-neutral-500";
}

export function RisksTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: riskIssues, isLoading } = useQuery({
    queryKey: ["projects", "risk-issues", projectId],
    queryFn: () => sdk.projects.listRiskIssuesForProject(projectId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Risks, issues & blockers</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New"}
        </button>
      </div>

      {showCreate && (
        <CreateRiskIssueForm
          projectId={projectId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {riskIssues && riskIssues.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <AlertTriangle
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            Nothing tracked yet.
          </p>
        </div>
      )}

      {riskIssues && riskIssues.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {riskIssues.map((ri) => (
            <RiskIssueRow key={ri.id} riskIssue={ri} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RiskIssueRow({ riskIssue }: { riskIssue: RiskIssue }) {
  const queryClient = useQueryClient();
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateTo, setEscalateTo] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "risk-issues", riskIssue.project_id],
    });

  const startMitigatingMutation = useMutation({
    mutationFn: () => sdk.projects.startMitigatingRiskIssue(riskIssue.id),
    onSuccess: invalidate,
  });
  const resolveMutation = useMutation({
    mutationFn: () => sdk.projects.resolveRiskIssue(riskIssue.id),
    onSuccess: invalidate,
  });
  const closeMutation = useMutation({
    mutationFn: () => sdk.projects.closeRiskIssue(riskIssue.id),
    onSuccess: invalidate,
  });
  const reopenMutation = useMutation({
    mutationFn: () => sdk.projects.reopenRiskIssue(riskIssue.id),
    onSuccess: invalidate,
  });
  const escalateMutation = useMutation({
    mutationFn: () => sdk.projects.escalateRiskIssue(riskIssue.id, escalateTo),
    onSuccess: () => {
      setShowEscalateForm(false);
      setEscalateTo("");
      invalidate();
    },
  });

  const isTerminal = riskIssue.status === "resolved" || riskIssue.status === "closed";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {riskIssue.type}
            </span>
            <p className="truncate text-sm font-medium">{riskIssue.title}</p>
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(riskIssue.status)}`}
            >
              {riskIssue.status}
            </span>
            <span
              className={`flex-none text-[11px] font-medium ${impactClasses(riskIssue.impact)}`}
            >
              {riskIssue.impact} impact
            </span>
          </div>
          {riskIssue.description && (
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              {riskIssue.description}
            </p>
          )}
          {riskIssue.mitigation_plan && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
              Mitigation: {riskIssue.mitigation_plan}
            </p>
          )}
          {riskIssue.owner_actor_id && (
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-600">
              Owner: {riskIssue.owner_actor_id}
            </p>
          )}
        </div>

        {!isTerminal && (
          <div className="flex flex-none flex-wrap items-center gap-2">
            {riskIssue.status === "open" && (
              <button
                type="button"
                onClick={() => startMitigatingMutation.mutate()}
                disabled={startMitigatingMutation.isPending}
                className={secondaryButtonClass}
              >
                Start mitigating
              </button>
            )}
            <button
              type="button"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
              className={primaryButtonClass}
            >
              Resolve
            </button>
            {riskIssue.status !== "escalated" && (
              <button
                type="button"
                onClick={() => setShowEscalateForm((v) => !v)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Escalate
              </button>
            )}
            <button
              type="button"
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending}
              className={secondaryButtonClass}
            >
              Close
            </button>
          </div>
        )}
        {isTerminal && (
          <button
            type="button"
            onClick={() => reopenMutation.mutate()}
            disabled={reopenMutation.isPending}
            className={`flex-none ${secondaryButtonClass}`}
          >
            Reopen
          </button>
        )}
      </div>

      {showEscalateForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-900/10">
          <input
            className={inputClass}
            placeholder="Escalate to actor id…"
            value={escalateTo}
            onChange={(e) => setEscalateTo(e.target.value)}
          />
          <button
            type="button"
            onClick={() => escalateMutation.mutate()}
            disabled={!escalateTo.trim() || escalateMutation.isPending}
            className="flex-none rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            Escalate
          </button>
          <button
            type="button"
            onClick={() => setShowEscalateForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function CreateRiskIssueForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<RiskIssueType>("risk");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<ImpactLevel>("medium");
  const [probability, setProbability] = useState<ProbabilityLevel | "">("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [ownerActorId, setOwnerActorId] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createRiskIssue(projectId, {
        type,
        title,
        description: description || undefined,
        impact,
        probability: type === "risk" && probability ? probability : undefined,
        mitigation_plan: mitigationPlan || undefined,
        owner_actor_id: ownerActorId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "risk-issues", projectId],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Type
          </label>
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as RiskIssueType)}
          >
            <option value="risk">Risk</option>
            <option value="issue">Issue</option>
            <option value="blocker">Blocker</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Impact
          </label>
          <select
            className={inputClass}
            value={impact}
            onChange={(e) => setImpact(e.target.value as ImpactLevel)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Title
        </label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {type === "risk" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Probability
          </label>
          <select
            className={inputClass}
            value={probability}
            onChange={(e) => setProbability(e.target.value as ProbabilityLevel)}
          >
            <option value="">Not set</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Mitigation plan
        </label>
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={mitigationPlan}
          onChange={(e) => setMitigationPlan(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Owner (optional)
        </label>
        <input
          className={inputClass}
          placeholder="Actor id…"
          value={ownerActorId}
          onChange={(e) => setOwnerActorId(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!title.trim() || mutation.isPending}
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
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't create this.
          </p>
        )}
      </div>
    </div>
  );
}

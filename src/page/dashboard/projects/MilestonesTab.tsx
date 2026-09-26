import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Plus } from "lucide-react";
import type { Milestone, MilestoneStatus } from "../../../lib/sdk/domains/projects";
import { sdk } from "../../../lib/sdk";
 
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: MilestoneStatus): string {
  if (status === "completed") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "missed") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export function MilestonesTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["projects", "milestones", projectId],
    queryFn: () => sdk.projects.listMilestonesForProject(projectId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Milestones</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New milestone"}
        </button>
      </div>

      {showCreate && (
        <CreateMilestoneForm
          projectId={projectId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {milestones && milestones.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Flag
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No milestones yet.
          </p>
        </div>
      )}

      {milestones && milestones.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "milestones", milestone.project_id],
    });

  const startMutation = useMutation({
    mutationFn: () => sdk.projects.startMilestone(milestone.id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => sdk.projects.completeMilestone(milestone.id),
    onSuccess: invalidate,
  });
  const missMutation = useMutation({
    mutationFn: () => sdk.projects.markMilestoneMissed(milestone.id),
    onSuccess: invalidate,
  });

  const isTerminal = milestone.status === "completed" || milestone.status === "missed";

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{milestone.name}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(milestone.status)}`}
          >
            {milestone.status.replace("_", " ")}
          </span>
        </div>
        {milestone.due_date && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Due {new Date(milestone.due_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {!isTerminal && (
        <div className="flex flex-none items-center gap-2">
          {milestone.status === "pending" && (
            <button
              type="button"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Start
            </button>
          )}
          <button
            type="button"
            onClick={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            className={primaryButtonClass}
          >
            Complete
          </button>
          <button
            type="button"
            onClick={() => missMutation.mutate()}
            disabled={missMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Mark missed
          </button>
        </div>
      )}
    </li>
  );
}

function CreateMilestoneForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createMilestone(projectId, {
        name,
        due_date: dueDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "milestones", projectId],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Name
        </label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Due date
        </label>
        <input
          type="date"
          className={inputClass}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
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
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't create this milestone.
          </p>
        )}
      </div>
    </div>
  );
}

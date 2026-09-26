import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, ProjectStatus } from "../../../lib/sdk/domains/projects";
import { sdk } from "../../../lib/sdk";
 
/**
 * Project details, edit form, and lifecycle transitions. Every
 * transition button shows regardless of viewer — the backend's own
 * Ownership-OR-Authority check (the project's own owner, or
 * project.manage) is the real gate; a non-qualifying click gets a
 * genuine 403 rather than a hidden button pretending the action
 * doesn't exist.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

function statusClasses(status: ProjectStatus): string {
  if (status === "active") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "completed") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "cancelled" || status === "archived") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
}

export function OverviewTab({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "detail", project.id],
    });

  const startMutation = useMutation({
    mutationFn: () => sdk.projects.startProject(project.id),
    onSuccess: invalidate,
  });
  const holdMutation = useMutation({
    mutationFn: () => sdk.projects.putProjectOnHold(project.id),
    onSuccess: invalidate,
  });
  const resumeMutation = useMutation({
    mutationFn: () => sdk.projects.resumeProject(project.id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => sdk.projects.completeProject(project.id),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => sdk.projects.cancelProject(project.id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.projects.archiveProject(project.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return <EditProjectForm project={project} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(project.status)}`}
        >
          {project.status.replace("_", " ")}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={secondaryButtonClass}
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {project.goals && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Goals
            </p>
            <p className="mt-1">{project.goals}</p>
          </div>
        )}
        {project.scope && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Scope
            </p>
            <p className="mt-1">{project.scope}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Priority
          </p>
          <p className="mt-1 capitalize">{project.priority}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Owner
          </p>
          <p className="mt-1 truncate">{project.owner_actor_id ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Start date
          </p>
          <p className="mt-1">
            {project.start_date
              ? new Date(project.start_date).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            End date
          </p>
          <p className="mt-1">
            {project.end_date
              ? new Date(project.end_date).toLocaleDateString()
              : "—"}
          </p>
        </div>
        {project.budget_amount != null && (
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Budget
            </p>
            <p className="mt-1">
              {project.budget_currency}{" "}
              {(project.budget_amount / 100).toFixed(2)}
            </p>
          </div>
        )}
        {project.stakeholder_actor_ids.length > 0 && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Stakeholders
            </p>
            <p className="mt-1 text-xs">
              {project.stakeholder_actor_ids.join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {project.status === "planning" && (
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className={primaryButtonClass}
          >
            Start
          </button>
        )}
        {project.status === "active" && (
          <>
            <button
              type="button"
              onClick={() => holdMutation.mutate()}
              disabled={holdMutation.isPending}
              className={secondaryButtonClass}
            >
              Put on hold
            </button>
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className={primaryButtonClass}
            >
              Complete
            </button>
          </>
        )}
        {project.status === "on_hold" && (
          <>
            <button
              type="button"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className={primaryButtonClass}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className={secondaryButtonClass}
            >
              Complete
            </button>
          </>
        )}
        {(project.status === "active" || project.status === "on_hold") && (
          <button
            type="button"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Cancel
          </button>
        )}
        {(project.status === "completed" || project.status === "cancelled") && (
          <button
            type="button"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className={secondaryButtonClass}
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

function EditProjectForm({
  project,
  onDone,
}: {
  project: Project;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [goals, setGoals] = useState(project.goals);
  const [scope, setScope] = useState(project.scope);
  const [priority, setPriority] = useState(project.priority);

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.updateProject(project.id, {
        name,
        description,
        goals,
        scope,
        priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "detail", project.id],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
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
          Description
        </label>
        <textarea
          className={`${inputClass} min-h-[4rem]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Goals
        </label>
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Scope
        </label>
        <textarea
          className={`${inputClass} min-h-[3rem]`}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Priority
        </label>
        <select
          className={inputClass}
          value={priority}
          onChange={(e) => setPriority(e.target.value as Project["priority"])}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save"}
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
            Couldn't save changes.
          </p>
        )}
      </div>
    </div>
  );
}

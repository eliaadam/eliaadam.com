import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus } from "lucide-react";
 
import { useContainer } from "../../components/context/ContainerContext";
import type { Project, ProjectStatus } from "../../lib/sdk/domains/projects";
import { sdk } from "../../lib/sdk";

/**
 * The projects list/create shell for the current container. A single
 * project's own content (milestones, tasks, activity) lives on its
 * own routed page (ProjectDetail.tsx) rather than expanding inline
 * here — split from the start this time, rather than growing into
 * one large file the way Marketplace.tsx originally did.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

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
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"; // planning/on_hold
}

export function ProjectsDashboard() {
  const { currentContainerId } = useContainer();
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "list", currentContainerId],
    queryFn: () => sdk.projects.listProjectsForContainer(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — projects belong to whichever
        container you're currently in.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Plan, assign, and track work for this container.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex flex-none items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New project"}
        </button>
      </div>

      {showCreate && (
        <div className="mt-4">
          <CreateProjectForm
            containerId={currentContainerId}
            onDone={() => setShowCreate(false)}
          />
        </div>
      )}

      {isLoading && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {projects && projects.length === 0 && !showCreate && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <FolderKanban
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            No projects yet.
          </p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {projects.map((p) => (
            <ProjectRow key={p.id} project={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <li>
      <Link
        to={`/dashboard/projects/${project.id}`}
        className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(project.status)}`}
            >
              {project.status.replace("_", " ")}
            </span>
          </div>
          {project.description && (
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
              {project.description}
            </p>
          )}
        </div>
        {project.end_date && (
          <span className="flex-none text-xs text-neutral-500 dark:text-neutral-500">
            Due {new Date(project.end_date).toLocaleDateString()}
          </span>
        )}
      </Link>
    </li>
  );
}

function CreateProjectForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createProject(containerId, {
        name,
        description: description || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      onDone();
    },
  });

  const canSubmit = Boolean(name.trim());

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
          Description
        </label>
        <textarea
          className={`${inputClass} min-h-[4rem]`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Start date
          </label>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            End date
          </label>
          <input
            type="date"
            className={inputClass}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create project"}
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
            Couldn't create this project.
          </p>
        )}
      </div>
    </div>
  );
}

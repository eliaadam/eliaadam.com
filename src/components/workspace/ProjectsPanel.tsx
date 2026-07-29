import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Project {
  id: string;
  name: string;
  description: string;
  assignee: string | null;
  status: "open" | "in_progress" | "closed";
  created_at: string;
}

let projectStore: Project[] = [];
let projectCounter = 100;

export default function ProjectsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = permissions.includes("project.create");
  const canView = permissions.includes("project.view");
  const canAssign = permissions.includes("project.assign");
  const canClose = permissions.includes("project.close");

  const projectsQuery = useQuery({
    queryKey: ["workspace", "projects", containerId],
    queryFn: () => projectStore.filter(() => canView) as Project[],
    enabled: canView,
  });

  const projects = projectsQuery.data ?? [];

  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-black dark:text-white m-0">
            Projects
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mt-0.5">
            {canView
              ? `${projects.length} project${projects.length !== 1 ? "s" : ""}`
              : "View access required"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PermBadge label="create" allowed={canCreate} />
          <PermBadge label="view" allowed={canView} />
          <PermBadge label="assign" allowed={canAssign} />
          <PermBadge label="close" allowed={canClose} />
        </div>
      </div>

      {canCreate && (
        <div className="px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          {showCreate ? (
            <CreateProjectForm
              containerId={containerId}
              onCreated={() => {
                setShowCreate(false);
                queryClient.invalidateQueries({
                  queryKey: ["workspace", "projects", containerId],
                });
              }}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold text-black dark:text-white"
            >
              + New Project
            </button>
          )}
        </div>
      )}

      {!canView && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            You don't have permission to view projects.
          </p>
        </div>
      )}

      {canView && projects.length === 0 && (
        <div className="px-6 py-10 text-center">
          <p className="text-sm text-neutral-400">
            No projects yet.{canCreate ? " Create one above." : ""}
          </p>
        </div>
      )}

      {canView && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
          {projects.map((proj) => (
            <ProjectRow
              key={proj.id}
              project={proj}
              canAssign={canAssign}
              canClose={canClose}
              containerId={containerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateProjectForm({
  containerId,
  onCreated,
  onCancel,
}: {
  containerId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      projectCounter++;
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        description,
        assignee: null,
        status: "open",
        created_at: new Date().toISOString(),
      };
      projectStore = [project, ...projectStore];
      return project;
    },
    onSuccess: onCreated,
  });

  const inputCls =
    "px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white outline-none focus:border-black dark:focus:border-white transition-colors";

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
          className={`${inputCls} w-48`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          Description
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          className={`${inputCls} w-56`}
        />
      </div>
      <button
        onClick={() => createMutation.mutate()}
        disabled={!name}
        className="px-4 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        Create
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
      >
        Cancel
      </button>
    </div>
  );
}

function ProjectRow({
  project: proj,
  canAssign,
  canClose,
  containerId,
}: {
  project: Project;
  canAssign: boolean;
  canClose: boolean;
  containerId: string;
}) {
  const queryClient = useQueryClient();
  const [assigning, setAssigning] = useState(false);
  const [assignee, setAssignee] = useState("");

  const actionMutation = useMutation({
    mutationFn: async (action: "assign" | "close") => {
      projectStore = projectStore.map((p) => {
        if (p.id !== proj.id) return p;
        if (action === "close") return { ...p, status: "closed" as const };
        if (action === "assign")
          return { ...p, assignee, status: "in_progress" as const };
        return p;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", "projects", containerId],
      });
      setAssigning(false);
    },
  });

  const statusStyles: Record<string, string> = {
    open: "border-dashed border-neutral-400 dark:border-neutral-600 text-neutral-500",
    in_progress: "bg-black text-white dark:bg-white dark:text-black",
    closed: "border-neutral-300 dark:border-neutral-700 text-neutral-400",
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    closed: "Closed",
  };

  return (
    <div className="px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p
            className={`text-sm font-medium m-0 ${proj.status === "closed" ? "text-neutral-400 line-through" : "text-black dark:text-white"}`}
          >
            {proj.name}
          </p>
          {proj.description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mt-0.5 truncate">
              {proj.description}
            </p>
          )}
        </div>
        {proj.assignee && (
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 flex-shrink-0">
            → {proj.assignee}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full uppercase border ${statusStyles[proj.status]}`}
        >
          {statusLabels[proj.status]}
        </span>

        {proj.status === "open" && canAssign && !assigning && (
          <button
            onClick={() => setAssigning(true)}
            className="px-3 py-1 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            Assign
          </button>
        )}

        {assigning && (
          <div className="flex items-center gap-1.5">
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Name"
              className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black text-black dark:text-white w-28 outline-none"
            />
            <button
              onClick={() => actionMutation.mutate("assign")}
              disabled={!assignee}
              className="px-2 py-1 text-[11px] font-semibold rounded bg-black text-white dark:bg-white dark:text-black"
            >
              Go
            </button>
            <button
              onClick={() => setAssigning(false)}
              className="px-2 py-1 text-[11px] text-neutral-400"
            >
              ×
            </button>
          </div>
        )}

        {["open", "in_progress"].includes(proj.status) && canClose && (
          <button
            onClick={() => actionMutation.mutate("close")}
            className="px-3 py-1 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-black dark:hover:text-white transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function PermBadge({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
        allowed
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 line-through"
      }`}
    >
      {label}
    </span>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Plus,
  X,
} from "lucide-react";
import type {
  Priority,
  Task,
  TaskStatus,
} from "../../../lib/sdk/domains/projects";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";

function statusClasses(status: TaskStatus): string {
  if (status === "done") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  if (status === "in_review") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"; // todo
}

function priorityClasses(priority: Priority): string {
  if (priority === "critical") return "text-red-600 dark:text-red-400";
  if (priority === "high") return "text-amber-600 dark:text-amber-400";
  return "text-neutral-500 dark:text-neutral-500";
}

export function TasksTab({ projectId }: { projectId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["projects", "tasks", projectId],
    queryFn: () => sdk.projects.listTasksForProject(projectId),
  });

  // Top-level tasks only — subtasks are shown nested under their own
  // parent row rather than duplicated in the flat list.
  const topLevel = (tasks ?? []).filter((t) => !t.parent_task_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Tasks</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New task"}
        </button>
      </div>

      {showCreate && (
        <CreateTaskForm
          projectId={projectId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {topLevel.length === 0 && !showCreate && !isLoading && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <ListTodo
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No tasks yet.
          </p>
        </div>
      )}

      {topLevel.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {topLevel.map((t) => (
            <TaskRow key={t.id} task={t} projectId={projectId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, projectId }: { task: Task; projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "tasks", projectId],
    });

  const startMutation = useMutation({
    mutationFn: () => sdk.projects.startTask(task.id),
    onSuccess: invalidate,
  });
  const reviewMutation = useMutation({
    mutationFn: () => sdk.projects.submitTaskForReview(task.id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => sdk.projects.completeTask(task.id),
    onSuccess: invalidate,
  });
  const reopenMutation = useMutation({
    mutationFn: () => sdk.projects.reopenTask(task.id),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => sdk.projects.cancelTask(task.id),
    onSuccess: invalidate,
  });

  const isTerminal = task.status === "done" || task.status === "cancelled";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div
        className="flex cursor-pointer items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="flex-none text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="flex-none text-neutral-400" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(task.status)}`}
              >
                {task.status.replace("_", " ")}
              </span>
              <span
                className={`flex-none text-[11px] font-medium ${priorityClasses(task.priority)}`}
              >
                {task.priority}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
              {task.assignee_actor_id
                ? `Assigned to ${task.assignee_actor_id}`
                : "Unassigned"}
              {task.checklist_progress.total > 0 &&
                ` · ${task.checklist_progress.done}/${task.checklist_progress.total} checklist`}
              {task.due_date &&
                ` · due ${new Date(task.due_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {!isTerminal && (
          <div
            className="flex flex-none items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {task.status === "todo" && (
              <button
                type="button"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className={secondaryButtonClass}
              >
                Start
              </button>
            )}
            {task.status === "in_progress" && (
              <button
                type="button"
                onClick={() => reviewMutation.mutate()}
                disabled={reviewMutation.isPending}
                className={secondaryButtonClass}
              >
                Submit for review
              </button>
            )}
            {(task.status === "in_progress" || task.status === "in_review") && (
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className={primaryButtonClass}
              >
                Complete
              </button>
            )}
            <button
              type="button"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Cancel
            </button>
          </div>
        )}
        {task.status === "done" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reopenMutation.mutate();
            }}
            disabled={reopenMutation.isPending}
            className={secondaryButtonClass}
          >
            Reopen
          </button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-l border-neutral-200 pl-4 dark:border-neutral-800">
          {task.description && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {task.description}
            </p>
          )}
          <AssigneeEditor task={task} projectId={projectId} />
          <ChecklistEditor task={task} projectId={projectId} />
          <DependenciesSection taskId={task.id} />
          <SubtasksSection parentTask={task} projectId={projectId} />
        </div>
      )}
    </li>
  );
}

function AssigneeEditor({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [actorId, setActorId] = useState(task.assignee_actor_id ?? "");

  const mutation = useMutation({
    mutationFn: () => sdk.projects.assignTask(task.id, actorId || null),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["projects", "tasks", projectId],
      }),
  });

  return (
    <div className="flex items-center gap-2">
      <input
        className={`${inputClass} max-w-xs text-xs`}
        placeholder="Assignee actor id…"
        value={actorId}
        onChange={(e) => setActorId(e.target.value)}
      />
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className={secondaryButtonClass}
      >
        {mutation.isPending ? "Saving…" : "Assign"}
      </button>
    </div>
  );
}

function ChecklistEditor({
  task,
  projectId,
}: {
  task: Task;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "tasks", projectId],
    });

  const addMutation = useMutation({
    mutationFn: () => sdk.projects.addChecklistItem(task.id, newText),
    onSuccess: () => {
      setNewText("");
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      sdk.projects.toggleChecklistItem(task.id, itemId, done),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) =>
      sdk.projects.removeChecklistItem(task.id, itemId),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-500">
        <CheckSquare size={13} />
        Checklist
      </p>
      {task.checklist.length > 0 && (
        <ul className="flex flex-col gap-1">
          {task.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  toggleMutation.mutate({
                    itemId: item.id,
                    done: e.target.checked,
                  })
                }
              />
              <span
                className={
                  item.done ? "flex-1 text-neutral-400 line-through" : "flex-1"
                }
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => removeMutation.mutate(item.id)}
                aria-label="Remove"
                className="flex-none text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          className={`${inputClass} text-xs`}
          placeholder="Add checklist item…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!newText.trim() || addMutation.isPending}
          className={secondaryButtonClass}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function DependenciesSection({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [dependsOnId, setDependsOnId] = useState("");

  const { data: dependencies } = useQuery({
    queryKey: ["projects", "task-dependencies", taskId],
    queryFn: () => sdk.projects.listDependenciesForTask(taskId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["projects", "task-dependencies", taskId],
    });

  const addMutation = useMutation({
    mutationFn: () => sdk.projects.createDependency(taskId, dependsOnId),
    onSuccess: () => {
      setDependsOnId("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (dependencyId: string) =>
      sdk.projects.removeDependency(dependencyId),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        Depends on
      </p>
      {dependencies && dependencies.length > 0 && (
        <ul className="flex flex-col gap-1">
          {dependencies.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate">
                Task {d.depends_on_task_id} (
                {d.dependency_type.replace(/_/g, " ")})
              </span>
              <button
                type="button"
                onClick={() => removeMutation.mutate(d.id)}
                aria-label="Remove"
                className="flex-none text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <input
          className={`${inputClass} text-xs`}
          placeholder="Task id this depends on…"
          value={dependsOnId}
          onChange={(e) => setDependsOnId(e.target.value)}
        />
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!dependsOnId.trim() || addMutation.isPending}
          className={secondaryButtonClass}
        >
          Add
        </button>
      </div>
      {addMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't add this dependency — it may create a cycle, or the tasks may
          be in different projects.
        </p>
      )}
    </div>
  );
}

function SubtasksSection({
  parentTask,
  projectId,
}: {
  parentTask: Task;
  projectId: string;
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const { data: subtasks } = useQuery({
    queryKey: ["projects", "subtasks", parentTask.id],
    queryFn: () => sdk.projects.listSubtasks(parentTask.id),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createTask(projectId, {
        title,
        parent_task_id: parentTask.id,
      }),
    onSuccess: () => {
      setTitle("");
      setShowCreate(false);
      queryClient.invalidateQueries({
        queryKey: ["projects", "subtasks", parentTask.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", "tasks", projectId],
      });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Subtasks
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          {showCreate ? "Cancel" : "+ Add subtask"}
        </button>
      </div>
      {subtasks && subtasks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs">
              <span
                className={`flex-none rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusClasses(s.status)}`}
              >
                {s.status.replace("_", " ")}
              </span>
              <span className="truncate">{s.title}</span>
            </li>
          ))}
        </ul>
      )}
      {showCreate && (
        <div className="flex items-center gap-2">
          <input
            className={`${inputClass} text-xs`}
            placeholder="Subtask title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className={secondaryButtonClass}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function CreateTaskForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeActorId, setAssigneeActorId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const { data: milestones } = useQuery({
    queryKey: ["projects", "milestones", projectId],
    queryFn: () => sdk.projects.listMilestonesForProject(projectId),
  });
  const [milestoneId, setMilestoneId] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.projects.createTask(projectId, {
        title,
        description: description || undefined,
        assignee_actor_id: assigneeActorId || undefined,
        due_date: dueDate || undefined,
        priority,
        milestone_id: milestoneId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "tasks", projectId],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
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
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Assignee
          </label>
          <input
            className={inputClass}
            placeholder="Actor id…"
            value={assigneeActorId}
            onChange={(e) => setAssigneeActorId(e.target.value)}
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Priority
          </label>
          <select
            className={inputClass}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Milestone
          </label>
          <select
            className={inputClass}
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
          >
            <option value="">None</option>
            {milestones?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!title.trim() || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create task"}
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
            Couldn't create this task.
          </p>
        )}
      </div>
    </div>
  );
}

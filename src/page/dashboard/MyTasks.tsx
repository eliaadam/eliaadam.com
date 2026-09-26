import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ListTodo } from "lucide-react";
import type { Priority, TaskStatus } from "../../lib/sdk/domains/projects";
import { sdk } from "../../lib/sdk";

/**
 * "My tasks" — every task assigned to the current actor, across
 * every project, actor-scoped, no permission needed (pattern #5) —
 * same shape as My deliveries/My assignments elsewhere in this
 * codebase.
 */

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
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

function priorityClasses(priority: Priority): string {
  if (priority === "critical") return "text-red-600 dark:text-red-400";
  if (priority === "high") return "text-amber-600 dark:text-amber-400";
  return "text-neutral-500 dark:text-neutral-500";
}

export function MyTasks() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["projects", "my-tasks"],
    queryFn: () => sdk.projects.listMyTasks(),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">My tasks</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Everything assigned to you, across every project.
      </p>

      {isLoading && (
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {tasks && tasks.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <ListTodo
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            Nothing assigned to you right now.
          </p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={`/dashboard/projects/${task.project_id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              >
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
                  {task.checklist_progress.total > 0 && (
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
                      {task.checklist_progress.done}/
                      {task.checklist_progress.total} checklist items
                    </p>
                  )}
                </div>
                {task.due_date && (
                  <span className="flex-none text-xs text-neutral-500 dark:text-neutral-500">
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { sdk } from "../../../lib/sdk";

function describeEntry(verb: string, subjectType: string): string {
  return `${verb.replace(/_/g, " ")} — ${subjectType}`;
}

export function ActivityTab({ projectId }: { projectId: string }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["projects", "activity", projectId],
    queryFn: () => sdk.projects.listProjectActivity(projectId, { limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-3">
      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {entries && entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Activity
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            Nothing recorded yet.
          </p>
        </div>
      )}

      {entries && entries.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                  {describeEntry(entry.verb, entry.subject_type)}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
                  {entry.actor_id}
                </p>
              </div>
              {entry.occurred_at && (
                <span className="flex-none text-xs text-neutral-400 dark:text-neutral-600">
                  {new Date(entry.occurred_at).toLocaleString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

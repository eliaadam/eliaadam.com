import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import type { GoalOwnerType } from "../../../lib/sdk/domains/hr";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

/**
 * Organization/department/team goals only — employee-level goals live
 * on EmployeeDetail's own page, scoped to that specific person.
 */
export function PerformanceTab({ containerId }: { containerId: string }) {
  const [ownerType, setOwnerType] = useState<GoalOwnerType>("organization");
  const [ownerId, setOwnerId] = useState(containerId);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const { data: goals, isLoading } = useQuery({
    queryKey: ["hr", "goals", containerId, ownerType, ownerId],
    queryFn: () => sdk.hr.listGoalsForOwner(containerId, ownerType, ownerId),
    enabled: Boolean(ownerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createGoal(containerId, {
        owner_type: ownerType,
        owner_id: ownerId,
        title,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "goals", containerId, ownerType, ownerId],
      });
      setTitle("");
      setShowCreate(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Owner type
          </label>
          <select
            className={inputClass}
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value as GoalOwnerType)}
          >
            <option value="organization">Organization</option>
            <option value="department">Department</option>
            <option value="team">Team</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Owner id
          </label>
          <input
            className={inputClass}
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Goals</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New goal"}
        </button>
      </div>

      {showCreate && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <input
            className={inputClass}
            placeholder="Goal title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className={`flex-none ${primaryButtonClass}`}
          >
            Create
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {goals && goals.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Target
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No goals yet for this owner.
          </p>
        </div>
      )}

      {goals && goals.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{g.title}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">
                {g.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

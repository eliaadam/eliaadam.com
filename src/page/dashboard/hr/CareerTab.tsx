import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp } from "lucide-react";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

export function CareerTab({ containerId }: { containerId: string }) {
  const [fromPositionId, setFromPositionId] = useState("");
  const [toPositionId, setToPositionId] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const { data: paths } = useQuery({
    queryKey: ["hr", "career-paths", "from", fromPositionId],
    queryFn: () => sdk.hr.listCareerPathsFromPosition(fromPositionId),
    enabled: Boolean(fromPositionId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createCareerPath(containerId, {
        from_position_id: fromPositionId,
        to_position_id: toPositionId,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "career-paths", "from", fromPositionId],
      });
      setToPositionId("");
      setDescription("");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Career paths</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Enter a position id to see the paths defined from it, or add a new one.
      </p>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            From position id
          </label>
          <input
            className={inputClass}
            value={fromPositionId}
            onChange={(e) => setFromPositionId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            To position id
          </label>
          <input
            className={inputClass}
            value={toPositionId}
            onChange={(e) => setToPositionId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Description
          </label>
          <input
            className={inputClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={
            !fromPositionId.trim() || !toPositionId.trim() || mutation.isPending
          }
          className={`flex w-fit items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          Add path
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't create this path.
          </p>
        )}
      </div>

      {paths && paths.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <TrendingUp
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No paths from this position yet.
          </p>
        </div>
      )}

      {paths && paths.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {paths.map((p) => (
            <li key={p.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
              <span>→ {p.to_position_id}</span>
              {p.description && (
                <span className="text-xs text-neutral-500 dark:text-neutral-500">
                  {p.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

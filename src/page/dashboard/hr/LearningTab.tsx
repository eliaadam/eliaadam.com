import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

export function LearningTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [durationHours, setDurationHours] = useState("");

  const { data: programs, isLoading } = useQuery({
    queryKey: ["hr", "training-programs", containerId],
    queryFn: () => sdk.hr.listTrainingProgramsForContainer(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createTrainingProgram(containerId, {
        name,
        provider: provider || undefined,
        duration_hours: durationHours ? Number(durationHours) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "training-programs", containerId],
      });
      setName("");
      setProvider("");
      setDurationHours("");
      setShowCreate(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Training programs</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New program"}
        </button>
      </div>

      {showCreate && (
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Provider
              </label>
              <input
                className={inputClass}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Duration (hours)
              </label>
              <input
                type="number"
                className={inputClass}
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
              />
            </div>
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
            {mutation.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Couldn't create this program.
              </p>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {programs && programs.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <BookOpen
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No training programs yet.
          </p>
        </div>
      )}

      {programs && programs.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{p.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">
                {p.provider}
                {p.duration_hours != null && ` · ${p.duration_hours}h`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

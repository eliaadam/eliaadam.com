import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus } from "lucide-react";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

export function AttendanceTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["hr", "shifts", containerId],
    queryFn: () => sdk.hr.listShiftsForContainer(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createShift(containerId, {
        name,
        start_time: startTime,
        end_time: endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "shifts", containerId],
      });
      setName("");
      setShowCreate(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Shifts</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New shift"}
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
                Start time
              </label>
              <input
                className={inputClass}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="HH:MM"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                End time
              </label>
              <input
                className={inputClass}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="HH:MM"
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
                Couldn't create this shift.
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

      {shifts && shifts.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Clock
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No shifts defined yet.
          </p>
        </div>
      )}

      {shifts && shifts.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {shifts.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{s.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">
                {s.start_time}–{s.end_time}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Check-in/out, timesheets, and overtime are managed per employee — see an
        employee's own page.
      </p>
    </div>
  );
}

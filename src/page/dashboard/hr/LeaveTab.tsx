import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Umbrella } from "lucide-react";
import { sdk } from "../../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

export function LeaveTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [paid, setPaid] = useState(true);
  const [defaultDays, setDefaultDays] = useState("");

  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ["hr", "leave-types", containerId],
    queryFn: () => sdk.hr.listLeaveTypesForContainer(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.hr.createLeaveType(containerId, {
        name,
        paid,
        default_annual_days: defaultDays ? Number(defaultDays) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["hr", "leave-types", containerId],
      });
      setName("");
      setDefaultDays("");
      setShowCreate(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Leave types</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New leave type"}
        </button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="grid grid-cols-2 gap-3">
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
                Default annual days
              </label>
              <input
                type="number"
                className={inputClass}
                value={defaultDays}
                onChange={(e) => setDefaultDays(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />
            Paid
          </label>
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
                Couldn't create this leave type.
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

      {leaveTypes && leaveTypes.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Umbrella
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={20}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No leave types defined yet.
          </p>
        </div>
      )}

      {leaveTypes && leaveTypes.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {leaveTypes.map((lt) => (
            <li
              key={lt.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{lt.name}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-500">
                {lt.paid ? "Paid" : "Unpaid"}
                {lt.default_annual_days != null &&
                  ` · ${lt.default_annual_days} days/yr`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

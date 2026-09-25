import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlayCircle, Truck, XCircle } from "lucide-react";
import { sdk, type Trip, type TripStatus } from "../../../lib/sdk";

/**
 * "My assignments" — actor-scoped (pattern #5), no permission or
 * container context needed at all: every trip where the acting
 * actor is the assigned operator, regardless of which container it
 * belongs to. An operator working for more than one carrier
 * container would see all of them here in one place.
 */

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: TripStatus): string {
  if (status === "completed") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  if (status === "planned") {
    return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
}

export function MyAssignmentsTab() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["logistics", "trips-mine"],
    queryFn: () => sdk.logistics.listMyTrips(),
  });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Every trip you're the assigned operator on, across any carrier
        container.
      </p>

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {trips && trips.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Truck
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            No trips assigned to you yet.
          </p>
        </div>
      )}

      {trips && trips.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {trips.map((t) => (
            <MyTripRow key={t.id} trip={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MyTripRow({ trip }: { trip: Trip }) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["logistics", "trips-mine"] });

  const departMutation = useMutation({
    mutationFn: () => sdk.logistics.departTrip(trip.id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => sdk.logistics.completeTrip(trip.id),
    onSuccess: invalidate,
  });
  const failMutation = useMutation({
    mutationFn: () => sdk.logistics.failTrip(trip.id),
    onSuccess: invalidate,
  });

  const isTerminal = trip.status === "completed" || trip.status === "failed";

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(trip.status)}`}
          >
            {trip.status.replace("_", " ")}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-500">
            {trip.shipment_ids.length} shipment
            {trip.shipment_ids.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {!isTerminal && (
        <div className="flex flex-none items-center gap-2">
          {trip.status === "planned" && (
            <button
              type="button"
              onClick={() => departMutation.mutate()}
              disabled={departMutation.isPending}
              className={`flex items-center gap-1 ${primaryButtonClass}`}
            >
              <PlayCircle size={13} />
              Depart
            </button>
          )}
          {trip.status === "in_transit" && (
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className={`flex items-center gap-1 ${primaryButtonClass}`}
            >
              <CheckCircle2 size={13} />
              Complete
            </button>
          )}
          <button
            type="button"
            onClick={() => failMutation.mutate()}
            disabled={failMutation.isPending}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <XCircle size={13} />
            Failed
          </button>
        </div>
      )}
    </li>
  );
}

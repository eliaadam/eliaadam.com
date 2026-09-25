import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Route as RouteIcon, Truck } from "lucide-react";
import type { Trip, TripStatus } from "../../lib/sdk/domains/logistics";
import { sdk } from "../../lib/sdk";
 

/**
 * Dispatcher surface for Trip (+ Route, folded into the same "trip"
 * permission resource backend-side).
 *
 * A REAL WORKFLOW CONSTRAINT, not a UI limitation: Trip creation can
 * only pull in shipments that are still genuinely "unassigned" (see
 * the backend's own assign_to_trip() transition, which requires
 * !state.is_assigned). The only existing way this frontend can
 * discover unassigned shipments at all is the claim pool
 * (listClaimableShipments) — so in practice, a shipment needs to be
 * published for claim by its selling container before a dispatcher
 * can add it to a trip here, even though that reads a bit backwards
 * conceptually. Surfaced directly below rather than hidden.
 *
 * depart/complete/fail show for every trip regardless of viewer —
 * Ownership-OR-Authority (pattern #3) is enforced backend-side (the
 * trip's own assigned operator, or a dispatcher with trip.manage); a
 * non-qualifying actor gets a real 403 on click rather than a
 * client-side-hidden button pretending the action never existed.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

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
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"; // in_transit
}

export function TripsTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: trips, isLoading } = useQuery({
    queryKey: ["logistics", "trips", containerId],
    queryFn: () => sdk.logistics.listTrips(containerId),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Trips</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "Create trip"}
        </button>
      </div>

      {showCreate && (
        <CreateTripForm
          containerId={containerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {trips && trips.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Truck
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            No trips yet.
          </p>
        </div>
      )}

      {trips && trips.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {trips.map((t) => (
            <TripRow key={t.id} trip={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  const queryClient = useQueryClient();
  const [showFailForm, setShowFailForm] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["logistics", "trips"] });

  const departMutation = useMutation({
    mutationFn: () => sdk.logistics.departTrip(trip.id),
    onSuccess: invalidate,
  });
  const completeMutation = useMutation({
    mutationFn: () => sdk.logistics.completeTrip(trip.id),
    onSuccess: invalidate,
  });
  const failMutation = useMutation({
    mutationFn: () => sdk.logistics.failTrip(trip.id, reason || undefined),
    onSuccess: () => {
      setShowFailForm(false);
      setReason("");
      invalidate();
    },
  });

  const isTerminal = trip.status === "completed" || trip.status === "failed";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
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
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
            Operator {trip.operator_actor_id}
          </p>
        </div>

        {!isTerminal && (
          <div className="flex flex-none items-center gap-2">
            {trip.status === "planned" && (
              <button
                type="button"
                onClick={() => departMutation.mutate()}
                disabled={departMutation.isPending}
                className={primaryButtonClass}
              >
                Depart
              </button>
            )}
            {trip.status === "in_transit" && (
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
              onClick={() => setShowFailForm((v) => !v)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Mark failed
            </button>
          </div>
        )}
      </div>

      {showFailForm && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900/40 dark:bg-red-900/10">
          <input
            className={inputClass}
            placeholder="Why did this trip fail? (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            onClick={() => failMutation.mutate()}
            disabled={failMutation.isPending}
            className="flex-none rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {failMutation.isPending ? "Saving…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setShowFailForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </li>
  );
}

function CreateTripForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [transportUnitId, setTransportUnitId] = useState("");
  const [operatorActorId, setOperatorActorId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [showCreateRoute, setShowCreateRoute] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<Set<string>>(
    new Set(),
  );

  const { data: units } = useQuery({
    queryKey: ["logistics", "transport-units", containerId],
    queryFn: () => sdk.logistics.listTransportUnits(containerId),
  });

  const { data: operators } = useQuery({
    queryKey: ["logistics", "operators", containerId],
    queryFn: () => sdk.logistics.listOperators(containerId),
  });

  const { data: routes } = useQuery({
    queryKey: ["logistics", "routes", containerId],
    queryFn: () => sdk.logistics.listRoutes(containerId),
  });

  // See this module's own top docstring — the claim pool is
  // currently the only way to discover shipments still genuinely
  // unassigned, which is what Trip creation actually requires.
  const { data: claimableShipments } = useQuery({
    queryKey: ["logistics", "claimable"],
    queryFn: () => sdk.logistics.listClaimableShipments(),
  });

  const activeUnits = units?.filter((u) => u.status === "active") ?? [];
  const activeOperators = operators?.filter((o) => o.status === "active") ?? [];

  const toggleShipment = (id: string) => {
    setSelectedShipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createTrip(containerId, {
        transport_unit_id: transportUnitId,
        operator_actor_id: operatorActorId,
        shipment_ids: Array.from(selectedShipmentIds),
        route_id: routeId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "trips"] });
      queryClient.invalidateQueries({ queryKey: ["logistics", "claimable"] });
      onDone();
    },
  });

  const canSubmit =
    Boolean(transportUnitId) &&
    Boolean(operatorActorId) &&
    selectedShipmentIds.size > 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
        Only shipments currently published to the claim pool can be
        added to a trip — this is the only way to see genuinely
        unassigned shipments right now. Ask the selling container to
        publish for claim first if you don't see what you're looking
        for.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Transport unit
          </label>
          <select
            className={inputClass}
            value={transportUnitId}
            onChange={(e) => setTransportUnitId(e.target.value)}
          >
            <option value="">Choose…</option>
            {activeUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.identifier} — {u.make_model}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Operator
          </label>
          <select
            className={inputClass}
            value={operatorActorId}
            onChange={(e) => setOperatorActorId(e.target.value)}
          >
            <option value="">Choose…</option>
            {activeOperators.map((o) => (
              <option key={o.id} value={o.actor_id}>
                {o.credential_number} ({o.actor_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Route (optional)
          </label>
          <button
            type="button"
            onClick={() => setShowCreateRoute((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            <RouteIcon size={11} />
            {showCreateRoute ? "Cancel" : "New route"}
          </button>
        </div>
        {showCreateRoute ? (
          <InlineCreateRoute
            containerId={containerId}
            onCreated={(id) => {
              setRouteId(id);
              setShowCreateRoute(false);
            }}
          />
        ) : (
          <select
            className={inputClass}
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          >
            <option value="">None</option>
            {routes?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.origin} → {r.destination})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Shipments ({selectedShipmentIds.size} selected)
        </label>
        {claimableShipments && claimableShipments.length === 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Nothing in the claim pool right now.
          </p>
        )}
        {claimableShipments && claimableShipments.length > 0 && (
          <ul className="flex max-h-48 flex-col divide-y divide-neutral-200 overflow-y-auto rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {claimableShipments.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedShipmentIds.has(s.id)}
                  onChange={() => toggleShipment(s.id)}
                />
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  Buyer {s.buyer_actor_id}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create trip"}
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
            Couldn't create this trip — one of the selected shipments may
            no longer be available.
          </p>
        )}
      </div>
    </div>
  );
}

function InlineCreateRoute({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: (routeId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createRoute(containerId, {
        transport_mode: "land",
        name,
        origin,
        destination,
      }),
    onSuccess: (route) => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "routes"] });
      onCreated(route.id);
    },
  });

  const canSubmit = Boolean(name && origin && destination);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
      <input
        className={inputClass}
        placeholder="Route name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className={inputClass}
          placeholder="Origin…"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Destination…"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className={`self-start ${primaryButtonClass}`}
      >
        {mutation.isPending ? "Creating…" : "Create route"}
      </button>
      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't create this route.
        </p>
      )}
    </div>
  );
}

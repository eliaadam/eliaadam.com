import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Package,
  Plus,
  Route as RouteIcon,
  Truck,
} from "lucide-react";
import {
  sdk,
  type Shipment,
  type ShipmentEventStatus,
  type Trip,
  type TripStatus,
} from "../../../lib/sdk";

/**
 * The unified carrier-side "what this container has taken on to
 * deliver" view — merges what used to be two separate tabs ("My
 * deliveries" and "Trips") into one, since they were really one
 * system split in two: every shipment this carrier is responsible
 * for, some grouped into a Trip's own manifest, some assigned
 * directly. list_for_carrier() is now authoritative for BOTH —
 * assign_to_trip() was fixed to set carrier_container_id (a real,
 * confirmed bug: it previously only set trip_id/status, leaving
 * every trip-assigned shipment permanently invisible to this exact
 * query).
 *
 * A shipment under a trip is shown grouped, with trip-level
 * depart/complete/fail; a directly-assigned shipment (trip_id ===
 * null) is shown separately below, with its own assign-driver/
 * record-event actions — matching the two permanent assignment
 * paths this domain actually has (see the backend's own
 * ShipmentState module docstring).
 *
 * Trip creation still requires picking shipments from the claim
 * pool (see this file's own banner) — see the backend's own
 * assign_to_trip() transition, which requires a shipment still be
 * genuinely unassigned; that's the only existing way to discover
 * one.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const EVENT_STATUS_OPTIONS: ShipmentEventStatus[] = [
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
];

function tripStatusClasses(status: TripStatus): string {
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

export function MyDeliveriesTab({ containerId }: { containerId: string }) {
  const [showCreateTrip, setShowCreateTrip] = useState(false);

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ["logistics", "as-carrier", containerId],
    queryFn: () => sdk.logistics.listForContainerAsCarrier(containerId),
  });

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["logistics", "trips", containerId],
    queryFn: () => sdk.logistics.listTrips(containerId),
  });

  const directShipments = shipments?.filter((s) => !s.trip_id) ?? [];
  const isLoading = shipmentsLoading || tripsLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Trips</p>
        <button
          type="button"
          onClick={() => setShowCreateTrip((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreateTrip ? "Close" : "Create trip"}
        </button>
      </div>

      {showCreateTrip && (
        <CreateTripForm
          containerId={containerId}
          onDone={() => setShowCreateTrip(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {trips && trips.length === 0 && !showCreateTrip && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          No trips yet — group several shipments into one manifest, or
          just assign shipments directly below.
        </p>
      )}

      {trips && trips.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {trips.map((t) => (
            <TripGroupRow key={t.id} trip={t} />
          ))}
        </ul>
      )}

      <div>
        <p className="text-sm font-medium">Directly assigned</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
          Shipments handled one at a time, outside any trip.
        </p>

        {!isLoading && directShipments.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
            <Package
              className="mx-auto text-neutral-400 dark:text-neutral-600"
              size={22}
            />
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              Nothing assigned directly right now.
            </p>
          </div>
        )}

        {directShipments.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {directShipments.map((s) => (
              <DirectShipmentRow key={s.id} shipment={s} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TripGroupRow({ trip }: { trip: Trip }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["logistics", "trips"] });
    queryClient.invalidateQueries({ queryKey: ["logistics", "as-carrier"] });
  };

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
      <div
        className="flex cursor-pointer items-center justify-between gap-4"
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
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${tripStatusClasses(trip.status)}`}
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
        </div>

        {!isTerminal && (
          <div
            className="flex flex-none items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
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

      {expanded && (
        <ul className="flex flex-col gap-1 border-l border-neutral-200 pl-3 dark:border-neutral-800">
          {trip.shipment_ids.map((id) => (
            <TripMemberShipment key={id} shipmentId={id} />
          ))}
        </ul>
      )}
    </li>
  );
}

function TripMemberShipment({ shipmentId }: { shipmentId: string }) {
  const { data: shipment } = useQuery({
    queryKey: ["logistics", "shipment", shipmentId],
    queryFn: () => sdk.logistics.getShipment(shipmentId),
  });

  if (!shipment) {
    return (
      <li className="py-1 text-xs text-neutral-500 dark:text-neutral-500">
        Loading…
      </li>
    );
  }

  return (
    <li className="py-1 text-xs text-neutral-600 dark:text-neutral-400">
      Buyer {shipment.buyer_actor_id} · {shipment.status.replace("_", " ")}
    </li>
  );
}

function DirectShipmentRow({ shipment }: { shipment: Shipment }) {
  const queryClient = useQueryClient();
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverActorId, setDriverActorId] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventStatus, setEventStatus] =
    useState<ShipmentEventStatus>("picked_up");
  const [eventNote, setEventNote] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["logistics", "as-carrier"] });
    queryClient.invalidateQueries({
      queryKey: ["logistics", "shipment-events", shipment.id],
    });
  };

  const assignDriverMutation = useMutation({
    mutationFn: () => sdk.logistics.assignDriver(shipment.id, driverActorId),
    onSuccess: () => {
      setShowDriverForm(false);
      setDriverActorId("");
      invalidate();
    },
  });

  const recordEventMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.recordShipmentEvent(
        shipment.id,
        eventStatus,
        eventNote || undefined,
      ),
    onSuccess: () => {
      setShowEventForm(false);
      setEventNote("");
      invalidate();
    },
  });

  const isTerminal =
    shipment.status === "delivered" || shipment.status === "failed";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-none rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {shipment.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-500">
            Buyer {shipment.buyer_actor_id}
            {shipment.assigned_driver_actor_id &&
              ` · Driver ${shipment.assigned_driver_actor_id}`}
          </p>
        </div>

        {!isTerminal && (
          <div className="flex flex-none items-center gap-2">
            {!shipment.assigned_driver_actor_id && (
              <button
                type="button"
                onClick={() => setShowDriverForm((v) => !v)}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                Assign driver…
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowEventForm((v) => !v)}
              className={primaryButtonClass}
            >
              <span className="flex items-center gap-1">
                <Truck size={12} />
                Update tracking
              </span>
            </button>
          </div>
        )}
      </div>

      {showDriverForm && (
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <input
            className={inputClass}
            placeholder="Driver actor id…"
            value={driverActorId}
            onChange={(e) => setDriverActorId(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            onClick={() => assignDriverMutation.mutate()}
            disabled={!driverActorId.trim() || assignDriverMutation.isPending}
            className={`flex-none ${primaryButtonClass}`}
          >
            {assignDriverMutation.isPending ? "Assigning…" : "Assign"}
          </button>
          <button
            type="button"
            onClick={() => setShowDriverForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {showEventForm && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <select
              className={`${inputClass} max-w-[9rem]`}
              value={eventStatus}
              onChange={(e) =>
                setEventStatus(e.target.value as ShipmentEventStatus)
              }
            >
              {EVENT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Note (optional)…"
              value={eventNote}
              onChange={(e) => setEventNote(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => recordEventMutation.mutate()}
              disabled={recordEventMutation.isPending}
              className={primaryButtonClass}
            >
              {recordEventMutation.isPending ? "Saving…" : "Record"}
            </button>
            <button
              type="button"
              onClick={() => setShowEventForm(false)}
              className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
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
      queryClient.invalidateQueries({ queryKey: ["logistics", "as-carrier"] });
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

const TRANSPORT_MODE_OPTIONS = ["land", "sea", "air"];

function InlineCreateRoute({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: (routeId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [transportMode, setTransportMode] = useState("land");
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createRoute(containerId, {
        transport_mode: transportMode,
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
      <select
        className={inputClass}
        value={transportMode}
        onChange={(e) => setTransportMode(e.target.value)}
      >
        {TRANSPORT_MODE_OPTIONS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
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

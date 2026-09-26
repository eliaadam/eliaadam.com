import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus, Route as RouteIcon, X } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type { Route } from "../../lib/sdk/domains/logistics";
 

/**
 * Standing fleet/personnel relationships per Route — "this operator
 * regularly runs this route", "this truck regularly runs this
 * route" — independent of any specific Trip. See the backend's own
 * RouteOperatorAssignment/RouteTransportUnitAssignment docstrings.
 * A dispatcher creating a new Trip for a route can use these as a
 * starting point rather than picking from a flat list every time
 * (see MyDeliveriesTab's own CreateTripForm).
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const TRANSPORT_MODE_OPTIONS = ["land", "sea", "air"];

export function RoutesTab({ containerId }: { containerId: string }) {
  const [showCreate, setShowCreate] = useState(false);

  const { data: routes, isLoading } = useQuery({
    queryKey: ["logistics", "routes", containerId],
    queryFn: () => sdk.logistics.listRoutes(containerId),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Routes</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500">
            Assign operators and transport units to a route on a
            standing basis, so they're ready to suggest the next time
            you plan a trip along it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={`flex flex-none items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showCreate ? "Close" : "New route"}
        </button>
      </div>

      {showCreate && (
        <CreateRouteForm
          containerId={containerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {routes && routes.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <RouteIcon
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
            No routes yet.
          </p>
        </div>
      )}

      {routes && routes.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {routes.map((r) => (
            <RouteRow key={r.id} containerId={containerId} route={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RouteRow({
  containerId,
  route,
}: {
  containerId: string;
  route: Route;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div
        className="flex cursor-pointer items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown size={14} className="flex-none text-neutral-400" />
          ) : (
            <ChevronRight size={14} className="flex-none text-neutral-400" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{route.name}</p>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
              {route.transport_mode} · {route.origin} → {route.destination}
            </p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-l border-neutral-200 pl-3 dark:border-neutral-800 sm:grid-cols-2">
          <StandingOperators containerId={containerId} route={route} />
          <StandingTransportUnits containerId={containerId} route={route} />
        </div>
      )}
    </li>
  );
}

function StandingOperators({
  containerId,
  route,
}: {
  containerId: string;
  route: Route;
}) {
  const queryClient = useQueryClient();
  const [selectedActorId, setSelectedActorId] = useState("");

  const { data: assignments } = useQuery({
    queryKey: ["logistics", "route-operators", route.id],
    queryFn: () => sdk.logistics.listRouteOperatorAssignments(route.id),
  });

  const { data: operators } = useQuery({
    queryKey: ["logistics", "operators", containerId],
    queryFn: () => sdk.logistics.listOperators(containerId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "route-operators", route.id],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.assignRouteOperator(route.id, selectedActorId),
    onSuccess: () => {
      setSelectedActorId("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.logistics.removeRouteOperatorAssignment(route.id, actorId),
    onSuccess: invalidate,
  });

  const assignedIds = new Set((assignments ?? []).map((a) => a.operator_actor_id));
  const available = (operators ?? []).filter((o) => !assignedIds.has(o.actor_id));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        Standing operators
      </p>
      {assignments && assignments.length === 0 && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          None yet.
        </p>
      )}
      {assignments && assignments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs dark:bg-neutral-900/50"
            >
              <span className="truncate">{a.operator_actor_id}</span>
              <button
                type="button"
                onClick={() => removeMutation.mutate(a.operator_actor_id)}
                aria-label="Remove"
                className="flex-none text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <select
          className={`${inputClass} text-xs`}
          value={selectedActorId}
          onChange={(e) => setSelectedActorId(e.target.value)}
        >
          <option value="">Add operator…</option>
          {available.map((o) => (
            <option key={o.id} value={o.actor_id}>
              {o.credential_number} ({o.actor_id})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!selectedActorId || addMutation.isPending}
          className="flex-none rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function StandingTransportUnits({
  containerId,
  route,
}: {
  containerId: string;
  route: Route;
}) {
  const queryClient = useQueryClient();
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const { data: assignments } = useQuery({
    queryKey: ["logistics", "route-units", route.id],
    queryFn: () => sdk.logistics.listRouteTransportUnitAssignments(route.id),
  });

  const { data: units } = useQuery({
    queryKey: ["logistics", "transport-units", containerId],
    queryFn: () => sdk.logistics.listTransportUnits(containerId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "route-units", route.id],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.assignRouteTransportUnit(route.id, selectedUnitId),
    onSuccess: () => {
      setSelectedUnitId("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (unitId: string) =>
      sdk.logistics.removeRouteTransportUnitAssignment(route.id, unitId),
    onSuccess: invalidate,
  });

  const assignedIds = new Set(
    (assignments ?? []).map((a) => a.transport_unit_id),
  );
  const available = (units ?? []).filter((u) => !assignedIds.has(u.id));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        Standing transport units
      </p>
      {assignments && assignments.length === 0 && (
        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          None yet.
        </p>
      )}
      {assignments && assignments.length > 0 && (
        <ul className="flex flex-col gap-1">
          {assignments.map((a) => {
            const unit = (units ?? []).find((u) => u.id === a.transport_unit_id);
            return (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs dark:bg-neutral-900/50"
              >
                <span className="truncate">
                  {unit ? unit.identifier : a.transport_unit_id}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(a.transport_unit_id)}
                  aria-label="Remove"
                  className="flex-none text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <select
          className={`${inputClass} text-xs`}
          value={selectedUnitId}
          onChange={(e) => setSelectedUnitId(e.target.value)}
        >
          <option value="">Add unit…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.identifier} — {u.make_model}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!selectedUnitId || addMutation.isPending}
          className="flex-none rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CreateRouteForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "routes"] });
      onDone();
    },
  });

  const canSubmit = Boolean(name && origin && destination);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Mode
        </label>
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
      </div>
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
            Origin
          </label>
          <input
            className={inputClass}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Destination
          </label>
          <input
            className={inputClass}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Creating…" : "Create route"}
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
            Couldn't create this route.
          </p>
        )}
      </div>
    </div>
  );
}

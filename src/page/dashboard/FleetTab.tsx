import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Users, X } from "lucide-react";
import type { TransportUnit, TransportUnitParticipantRole, TransportUnitStatus } from "../../lib/sdk/domains/logistics";
import { sdk } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
 
/**
 * Fleet-admin surface for TransportUnit. Status updates
 * (maintenance/reactivate) are Ownership-OR-Authority — a real
 * participant on THAT SPECIFIC unit, or transport_unit.manage
 * (pattern #3) — so those two buttons show for anyone, not gated
 * client-side; a non-owner, non-admin actor gets a real 403 from the
 * backend if they try. Retiring a unit stays Authority-only
 * deliberately (a permanent fleet decision, not routine) — same
 * backend distinction, not replicated as a client-side gate either,
 * for the same reason.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: TransportUnitStatus): string {
  if (status === "active") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "maintenance") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"; // retired
}

export function FleetTab({ containerId }: { containerId: string }) {
  const [showRegister, setShowRegister] = useState(false);

  const { data: units, isLoading } = useQuery({
    queryKey: ["logistics", "transport-units", containerId],
    queryFn: () => sdk.logistics.listTransportUnits(containerId),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Transport units</p>
        <button
          type="button"
          onClick={() => setShowRegister((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showRegister ? "Close" : "Register unit"}
        </button>
      </div>

      {showRegister && (
        <RegisterUnitForm
          containerId={containerId}
          onDone={() => setShowRegister(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {units && units.length === 0 && !showRegister && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Truck
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            No transport units registered yet.
          </p>
        </div>
      )}

      {units && units.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {units.map((u) => (
            <UnitRow key={u.id} unit={u} />
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitRow({ unit }: { unit: TransportUnit }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [managingParticipants, setManagingParticipants] = useState(false);
  const [editing, setEditing] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "transport-units"],
    });

  const maintenanceMutation = useMutation({
    mutationFn: () => sdk.logistics.setTransportUnitMaintenance(unit.id),
    onSuccess: invalidate,
  });
  const reactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.reactivateTransportUnit(unit.id),
    onSuccess: invalidate,
  });
  const retireMutation = useMutation({
    mutationFn: () => sdk.logistics.retireTransportUnit(unit.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li className="p-4">
        <UpdateUnitForm unit={unit} onDone={() => setEditing(false)} />
      </li>
    );
  }

  if (managingParticipants) {
    return (
      <li className="p-4">
        <ParticipantsSection
          unit={unit}
          currentActorId={user?.id}
          onDone={() => setManagingParticipants(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{unit.identifier}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(unit.status)}`}
          >
            {unit.status}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
          {unit.make_model} · {unit.capacity_description}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => setManagingParticipants(true)}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          <Users size={13} />
          Operators
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Edit
        </button>
        {unit.status !== "active" && unit.status !== "retired" && (
          <button
            type="button"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Reactivate
          </button>
        )}
        {unit.status === "active" && (
          <button
            type="button"
            onClick={() => maintenanceMutation.mutate()}
            disabled={maintenanceMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60 dark:text-amber-400 dark:hover:bg-amber-500/10"
          >
            Needs maintenance
          </button>
        )}
        {unit.status !== "retired" && (
          <button
            type="button"
            onClick={() => retireMutation.mutate()}
            disabled={retireMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Retire
          </button>
        )}
      </div>
    </li>
  );
}

function ParticipantsSection({
  unit,
  currentActorId,
  onDone,
}: {
  unit: TransportUnit;
  currentActorId: string | undefined;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [newActorId, setNewActorId] = useState("");
  const [newRole, setNewRole] =
    useState<TransportUnitParticipantRole>("primary");

  const { data: participants, isLoading } = useQuery({
    queryKey: ["logistics", "transport-unit-participants", unit.id],
    queryFn: () => sdk.logistics.listTransportUnitParticipants(unit.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["logistics", "transport-unit-participants", unit.id],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.addTransportUnitParticipant(unit.id, newActorId, newRole),
    onSuccess: () => {
      setNewActorId("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.logistics.removeTransportUnitParticipant(unit.id, actorId),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Operators — {unit.identifier}</p>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Done
        </button>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Operators listed here can update this unit's own status
        (maintenance/reactivate) without needing the fleet admin role.
      </p>

      {isLoading && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {participants && participants.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {p.actor_id}
                  {p.actor_id === currentActorId && (
                    <span className="ml-1.5 text-neutral-400 dark:text-neutral-600">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
                  {p.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeMutation.mutate(p.actor_id)}
                disabled={
                  removeMutation.isPending &&
                  removeMutation.variables === p.actor_id
                }
                aria-label="Remove operator"
                className="flex-none text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          placeholder="Actor id to add…"
          value={newActorId}
          onChange={(e) => setNewActorId(e.target.value)}
        />
        <select
          className={`${inputClass} max-w-[8rem]`}
          value={newRole}
          onChange={(e) =>
            setNewRole(e.target.value as TransportUnitParticipantRole)
          }
        >
          <option value="primary">primary</option>
          <option value="secondary">secondary</option>
        </select>
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!newActorId || addMutation.isPending}
          className={`flex-none ${primaryButtonClass}`}
        >
          {addMutation.isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {addMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't add that operator.
        </p>
      )}
    </div>
  );
}

function RegisterUnitForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [capacityDescription, setCapacityDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.registerTransportUnit(containerId, {
        transport_mode: "land",
        identifier,
        make_model: makeModel,
        capacity_description: capacityDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "transport-units"],
      });
      onDone();
    },
  });

  const canSubmit = Boolean(identifier && makeModel && capacityDescription);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Plate number
        </label>
        <input
          className={inputClass}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Make / model
          </label>
          <input
            className={inputClass}
            value={makeModel}
            onChange={(e) => setMakeModel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Capacity
          </label>
          <input
            className={inputClass}
            placeholder="2 tons, 20 seats…"
            value={capacityDescription}
            onChange={(e) => setCapacityDescription(e.target.value)}
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
          {mutation.isPending ? "Registering…" : "Register"}
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
            Couldn't register this unit.
          </p>
        )}
      </div>
    </div>
  );
}

function UpdateUnitForm({
  unit,
  onDone,
}: {
  unit: TransportUnit;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [makeModel, setMakeModel] = useState(unit.make_model);
  const [capacityDescription, setCapacityDescription] = useState(
    unit.capacity_description,
  );

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.updateTransportUnit(unit.id, {
        make_model: makeModel,
        capacity_description: capacityDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "transport-units"],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Make / model
          </label>
          <input
            className={inputClass}
            value={makeModel}
            onChange={(e) => setMakeModel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Capacity
          </label>
          <input
            className={inputClass}
            value={capacityDescription}
            onChange={(e) => setCapacityDescription(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save"}
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
            Couldn't save changes.
          </p>
        )}
      </div>
    </div>
  );
}

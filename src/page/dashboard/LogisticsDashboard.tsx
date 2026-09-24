import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Package, Truck } from "lucide-react";
import {
  sdk,
  type Shipment,
  type ShipmentEventStatus,
  type ShipmentStatus,
} from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";
import { useContainer } from "../../components/context/ContainerContext";

/**
 * Management view for capabilities.core.logistics — matches
 * LogisticsCapability's own navigation().route="logistics" exactly.
 * A container can be a seller, a carrier, or both — three tabs
 * rather than assuming one role, same reasoning Marketplace.tsx's own
 * browse/manage tab split already establishes for a container that
 * might browse AND host listings.
 *
 * "Assign to carrier" and "assign a driver" both use a raw text
 * input for the target id — no confirmed way to browse containers
 * filtered by ContainerKind, or actors within a container, exists
 * this session (SearchContainersParams has no kind filter at all).
 * Same honest fallback Inventory.tsx's own ParticipantsSection
 * already uses for "Actor id to add..." — not a polished picker,
 * because one isn't confirmed to exist yet to build against.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: ShipmentStatus): string {
  if (status === "delivered") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "failed") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  if (status === "unassigned") {
    return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"; // assigned/picked_up/in_transit
}

const EVENT_STATUS_OPTIONS: ShipmentEventStatus[] = [
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
];

export function LogisticsDashboard() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<"seller" | "claim" | "carrier">(
    "seller",
  );

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — shipments belong to whichever
        container you're currently in, as either seller or carrier.
      </p>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Logistics</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Track what this container needs delivered, browse jobs open to
        any carrier, and manage what this container has taken on to
        deliver.
      </p>

      <div className="mt-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-5">
          <TabButton
            active={activeTab === "seller"}
            onClick={() => setActiveTab("seller")}
          >
            My shipments
          </TabButton>
          <TabButton
            active={activeTab === "claim"}
            onClick={() => setActiveTab("claim")}
          >
            Claim pool
          </TabButton>
          <TabButton
            active={activeTab === "carrier"}
            onClick={() => setActiveTab("carrier")}
          >
            My deliveries
          </TabButton>
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "seller" && (
          <SellerShipmentsTab containerId={currentContainerId} />
        )}
        {activeTab === "claim" && (
          <ClaimPoolTab containerId={currentContainerId} />
        )}
        {activeTab === "carrier" && (
          <CarrierShipmentsTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 text-sm font-medium transition-colors ${
        active
          ? "text-black dark:text-white"
          : "text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-black dark:bg-white" />
      )}
    </button>
  );
}

// ── Tab: My shipments (seller side) ─────────────────────────────

function SellerShipmentsTab({ containerId }: { containerId: string }) {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["logistics", "as-seller", containerId],
    queryFn: () => sdk.logistics.listForContainerAsSeller(containerId),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        Loading…
      </p>
    );
  }

  if (shipments && shipments.length === 0) {
    return (
      <EmptyState message="No shipments yet — these appear automatically when a buyer purchases something physical this container sells." />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {shipments?.map((s) => (
        <SellerShipmentRow key={s.id} shipment={s} />
      ))}
    </ul>
  );
}

function SellerShipmentRow({ shipment }: { shipment: Shipment }) {
  const queryClient = useQueryClient();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [carrierContainerId, setCarrierContainerId] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["logistics", "as-seller"] });

  const assignMutation = useMutation({
    mutationFn: () =>
      sdk.logistics.assignShipment(shipment.id, carrierContainerId),
    onSuccess: () => {
      setShowAssignForm(false);
      setCarrierContainerId("");
      invalidate();
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => sdk.logistics.publishForClaim(shipment.id),
    onSuccess: invalidate,
  });

  const withdrawMutation = useMutation({
    mutationFn: () => sdk.logistics.withdrawFromClaim(shipment.id),
    onSuccess: invalidate,
  });

  const isUnassigned = shipment.status === "unassigned";

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(shipment.status)}`}
            >
              {shipment.status.replace("_", " ")}
            </span>
            {shipment.listed_for_claim && (
              <span className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                Listed for claim
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-500">
            Buyer {shipment.buyer_actor_id}
            {shipment.carrier_container_id &&
              ` · Carrier ${shipment.carrier_container_id}`}
          </p>
        </div>

        {isUnassigned && (
          <div className="flex flex-none items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAssignForm((v) => !v)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Assign…
            </button>
            {shipment.listed_for_claim ? (
              <button
                type="button"
                onClick={() => withdrawMutation.mutate()}
                disabled={withdrawMutation.isPending}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                Withdraw from claim
              </button>
            ) : (
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className={primaryButtonClass}
              >
                Publish for claim
              </button>
            )}
          </div>
        )}
      </div>

      {showAssignForm && (
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <input
            className={inputClass}
            placeholder="Carrier container id…"
            value={carrierContainerId}
            onChange={(e) => setCarrierContainerId(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            onClick={() => assignMutation.mutate()}
            disabled={!carrierContainerId.trim() || assignMutation.isPending}
            className={`flex-none ${primaryButtonClass}`}
          >
            {assignMutation.isPending ? "Assigning…" : "Assign"}
          </button>
          <button
            type="button"
            onClick={() => setShowAssignForm(false)}
            className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
      {assignMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't assign this shipment — check the carrier container id.
        </p>
      )}
    </li>
  );
}

// ── Tab: Claim pool ──────────────────────────────────────────────

function ClaimPoolTab({ containerId }: { containerId: string }) {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["logistics", "claimable"],
    queryFn: () => sdk.logistics.listClaimableShipments(),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        Loading…
      </p>
    );
  }

  if (shipments && shipments.length === 0) {
    return (
      <EmptyState message="No open jobs right now — check back once a seller publishes a shipment for claim." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Open to any carrier — claiming acts on behalf of your currently
        selected container.
      </p>
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {shipments?.map((s) => (
          <ClaimableShipmentRow
            key={s.id}
            shipment={s}
            containerId={containerId}
          />
        ))}
      </ul>
    </div>
  );
}

function ClaimableShipmentRow({
  shipment,
  containerId,
}: {
  shipment: Shipment;
  containerId: string;
}) {
  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: () => sdk.logistics.claimShipment(shipment.id, containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "claimable"] });
      queryClient.invalidateQueries({
        queryKey: ["logistics", "as-carrier"],
      });
    },
  });

  // A 409 here specifically means another carrier claimed it first —
  // a real, expected outcome under concurrent claims (see the
  // backend's own ShipmentAlreadyAssignedError docstring), not a bug.
  const alreadyClaimed =
    claimMutation.isError &&
    claimMutation.error instanceof ApiError &&
    claimMutation.error.status === 409;

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
          Buyer {shipment.buyer_actor_id}
        </p>
        {alreadyClaimed && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Someone else already claimed this.
          </p>
        )}
        {claimMutation.isError && !alreadyClaimed && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Couldn't claim this shipment.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => claimMutation.mutate()}
        disabled={claimMutation.isPending || alreadyClaimed}
        className={`flex-none ${primaryButtonClass}`}
      >
        {claimMutation.isPending ? "Claiming…" : "Claim"}
      </button>
    </li>
  );
}

// ── Tab: My deliveries (carrier side) ───────────────────────────

function CarrierShipmentsTab({ containerId }: { containerId: string }) {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ["logistics", "as-carrier", containerId],
    queryFn: () => sdk.logistics.listForContainerAsCarrier(containerId),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        Loading…
      </p>
    );
  }

  if (shipments && shipments.length === 0) {
    return (
      <EmptyState message="Nothing taken on yet — assigned or claimed shipments will show up here." />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {shipments?.map((s) => (
        <CarrierShipmentRow key={s.id} shipment={s} />
      ))}
    </ul>
  );
}

function CarrierShipmentRow({ shipment }: { shipment: Shipment }) {
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
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(shipment.status)}`}
            >
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
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} />
                {recordEventMutation.isPending ? "Saving…" : "Record"}
              </span>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <Package
        className="mx-auto text-neutral-400 dark:text-neutral-600"
        size={22}
      />
      <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
        {message}
      </p>
    </div>
  );
}

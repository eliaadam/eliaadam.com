import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Send, Truck } from "lucide-react";

import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { CarrierAvatar } from "./logistics/CarrierProfileTab";
import { MessageButton } from "../../components/messaging/MessageButton";
import type {
  CarrierJobRequestStatus,
  CarrierProfile,
} from "../../lib/sdk/domains/logistics";
import { sdk } from "../../lib/sdk";
import { MessageContainerButton } from "../../components/messaging/MessageContainerOwnerButton";

/**
 * The public carrier-discovery browse — open to any authenticated
 * actor, same "open discovery" shape Marketplace.tsx's own browse
 * tab already establishes. See the backend's own domain/entities.py
 * module docstring on why this is a dedicated endpoint rather than a
 * real surfacing.Listing browse — nothing is being purchased here,
 * the direction of payment (platform/vendor pays the carrier) is the
 * opposite of what a Listing models.
 *
 * REQUESTING A CARRIER — wraps the platform's own shared request/
 * approval primitive (domains.requests). Two shapes: an existing,
 * unassigned shipment this container already has, or a "custom job"
 * with no Shipment behind it at all yet (created fresh only if the
 * carrier accepts). Open to any authenticated actor — same "anyone
 * may initiate" shape purchasing itself already has; the carrier
 * decides whether to accept.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: CarrierJobRequestStatus): string {
  if (status === "approved") {
    return "bg-black text-white dark:bg-white dark:text-black";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
}

export function Carriers() {
  const [showMyRequests, setShowMyRequests] = useState(false);

  const { data: carriers, isLoading } = useQuery({
    queryKey: ["logistics", "carriers"],
    queryFn: () => sdk.logistics.listCarriers(),
  });

  const { data: myRequests } = useQuery({
    queryKey: ["logistics", "my-job-requests"],
    queryFn: () => sdk.logistics.listMyCarrierJobRequests(),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Carriers</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Containers offering delivery — what they carry, and how.
      </p>

      {myRequests && myRequests.length > 0 && (
        <div className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setShowMyRequests((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
          >
            {showMyRequests ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            My requests ({myRequests.length})
          </button>
          {showMyRequests && (
            <ul className="flex flex-col divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {myRequests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                    {(r.payload as { kind?: string }).kind === "custom_job"
                      ? "Custom job"
                      : "Existing shipment"}{" "}
                    → carrier {r.target_id}
                  </span>
                  <div className="flex flex-none items-center gap-2">
                    {r.decided_by_actor_id && (
                      <MessageButton
                        containerId={r.target_id}
                        otherActorId={r.decided_by_actor_id}
                        label="Message"
                      />
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLoading && (
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {carriers && carriers.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Truck
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No carriers listed yet</p>
        </div>
      )}

      {carriers && carriers.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {carriers.map((c) => (
            <CarrierRow key={c.id} carrier={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CarrierRow({ carrier }: { carrier: CarrierProfile }) {
  const [showRequestForm, setShowRequestForm] = useState(false);

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <CarrierAvatar
            displayName={carrier.display_name}
            avatarUrl={carrier.avatar_url}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {carrier.display_name}
            </p>
            <p className="mt-0.5 text-sm text-neutral-700 dark:text-neutral-300">
              {carrier.description}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
              {carrier.transport_modes.join(", ")}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <MessageContainerButton containerId={carrier.container_id} />
          <button
            type="button"
            onClick={() => setShowRequestForm((v) => !v)}
            className={`flex items-center gap-1 ${primaryButtonClass}`}
          >
            <Send size={12} />
            {showRequestForm ? "Cancel" : "Request"}
          </button>
        </div>
      </div>

      {showRequestForm && (
        <RequestCarrierForm
          carrierContainerId={carrier.container_id}
          onDone={() => setShowRequestForm(false)}
        />
      )}
    </li>
  );
}

function RequestCarrierForm({
  carrierContainerId,
  onDone,
}: {
  carrierContainerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentContainerId } = useContainer();
  const [kind, setKind] = useState<"existing_shipment" | "custom_job">(
    "existing_shipment",
  );
  const [shipmentId, setShipmentId] = useState("");
  const [pickupDescription, setPickupDescription] = useState("");
  const [dropoffDescription, setDropoffDescription] = useState("");
  const [cargoDescription, setCargoDescription] = useState("");

  const { data: myShipments } = useQuery({
    queryKey: ["logistics", "as-seller", currentContainerId],
    queryFn: () =>
      currentContainerId
        ? sdk.logistics.listForContainerAsSeller(currentContainerId)
        : Promise.resolve([]),
    enabled: kind === "existing_shipment" && Boolean(currentContainerId),
  });

  const unassignedShipments = (myShipments ?? []).filter(
    (s) => s.status === "unassigned",
  );

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.createCarrierJobRequest(
        carrierContainerId,
        kind === "existing_shipment"
          ? { kind: "existing_shipment", shipment_id: shipmentId }
          : {
              kind: "custom_job",
              seller_container_id: currentContainerId!,
              buyer_actor_id: user!.id,
              pickup_description: pickupDescription || undefined,
              dropoff_description: dropoffDescription || undefined,
              cargo_description: cargoDescription || undefined,
            },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["logistics", "my-job-requests"],
      });
      onDone();
    },
  });

  if (!currentContainerId) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Select a container first to request a carrier.
      </p>
    );
  }

  const canSubmit =
    kind === "existing_shipment"
      ? Boolean(shipmentId)
      : Boolean(pickupDescription || dropoffDescription || cargoDescription);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setKind("existing_shipment")}
          className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
            kind === "existing_shipment"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
          }`}
        >
          Existing shipment
        </button>
        <button
          type="button"
          onClick={() => setKind("custom_job")}
          className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${
            kind === "custom_job"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"
          }`}
        >
          Custom job
        </button>
      </div>

      {kind === "existing_shipment" ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Shipment
          </label>
          <select
            className={inputClass}
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
          >
            <option value="">Choose one of your unassigned shipments…</option>
            {unassignedShipments.map((s) => (
              <option key={s.id} value={s.id}>
                Buyer {s.buyer_actor_id}
              </option>
            ))}
          </select>
          {unassignedShipments.length === 0 && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
              No unassigned shipments on your current container.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
            No existing shipment — one is created only if this carrier accepts.
          </p>
          <input
            className={inputClass}
            placeholder="Pickup…"
            value={pickupDescription}
            onChange={(e) => setPickupDescription(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Dropoff…"
            value={dropoffDescription}
            onChange={(e) => setDropoffDescription(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="What's being moved…"
            value={cargoDescription}
            onChange={(e) => setCargoDescription(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Sending…" : "Send request"}
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
            Couldn't send this request.
          </p>
        )}
      </div>
    </div>
  );
}

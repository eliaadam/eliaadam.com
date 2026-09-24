import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.logistics`'s REST API
 * (`/api/logistics/...`).
 *
 * NOTE on response envelopes: same `{"results": [...]}` convention as
 * `order.ts`/`fulfillment.ts`/`container.ts`/`inventory.ts` — see
 * `order.ts`'s own module docstring for the full reasoning.
 */

export type ShipmentStatus =
  | "unassigned"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed";

export type ShipmentEventStatus =
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed";

export interface Shipment {
  id: string;
  fulfillment_id: string;
  seller_container_id: string;
  buyer_actor_id: string;
  carrier_container_id: string | null;
  assigned_driver_actor_id: string | null;
  status: ShipmentStatus;
  listed_for_claim: boolean;
  detail: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShipmentEventStatus;
  note: string | null;
  recorded_by_actor_id: string | null;
  occurred_at: string | null;
}

function getShipment(shipmentId: string): Promise<Shipment> {
  return api.get<Shipment>(`/api/logistics/shipments/${shipmentId}/`);
}

async function listShipmentEvents(
  shipmentId: string,
): Promise<ShipmentEvent[]> {
  const result = await api.get<{ results: ShipmentEvent[] }>(
    `/api/logistics/shipments/${shipmentId}/events/`,
  );
  return result.results;
}

/** Buyer-side — their own shipments, read-only tracking. */
async function listMyShipments(): Promise<Shipment[]> {
  const result = await api.get<{ results: Shipment[] }>(
    "/api/logistics/shipments/mine/",
  );
  return result.results;
}

/** The marketplace-style claim pool — see
 * `domain/entities.py`'s own module docstring on why this is NOT a
 * real `surfacing.Listing` browse. Open to any authenticated actor;
 * actually claiming still requires real container membership,
 * checked backend-side. */
async function listClaimableShipments(): Promise<Shipment[]> {
  const result = await api.get<{ results: Shipment[] }>(
    "/api/logistics/shipments/claimable/",
  );
  return result.results;
}

/** Seller/vendor-side — what this container needs delivered. */
async function listForContainerAsSeller(
  containerId: string,
): Promise<Shipment[]> {
  const result = await api.get<{ results: Shipment[] }>(
    `/api/logistics/containers/${containerId}/shipments/as-seller/`,
  );
  return result.results;
}

/** Carrier-side — what this container has taken on to deliver. */
async function listForContainerAsCarrier(
  containerId: string,
): Promise<Shipment[]> {
  const result = await api.get<{ results: Shipment[] }>(
    `/api/logistics/containers/${containerId}/shipments/as-carrier/`,
  );
  return result.results;
}

function publishForClaim(shipmentId: string): Promise<Shipment> {
  return api.post<Shipment>(
    `/api/logistics/shipments/${shipmentId}/publish-for-claim/`,
  );
}

function withdrawFromClaim(shipmentId: string): Promise<Shipment> {
  return api.post<Shipment>(
    `/api/logistics/shipments/${shipmentId}/withdraw-from-claim/`,
  );
}

/** Seller/admin-directed — does not require the shipment to have
 * ever been listed for claim. */
function assignShipment(
  shipmentId: string,
  carrierContainerId: string,
): Promise<Shipment> {
  return api.post<Shipment>(`/api/logistics/shipments/${shipmentId}/assign/`, {
    carrier_container_id: carrierContainerId,
  });
}

/** Carrier dispatcher's own claim — the requesting actor must
 * genuinely belong to `carrierContainerId`, checked backend-side
 * before the atomic assignment attempt even runs. May fail with a
 * 409 if another carrier claimed it first — a real, expected outcome
 * under concurrent claims, not a bug (see the backend's own
 * ShipmentAlreadyAssignedError docstring); surface that as "someone
 * else already claimed this," not a generic error. */
function claimShipment(
  shipmentId: string,
  carrierContainerId: string,
): Promise<Shipment> {
  return api.post<Shipment>(`/api/logistics/shipments/${shipmentId}/claim/`, {
    carrier_container_id: carrierContainerId,
  });
}

/** Carrier's own dispatcher, internal — assigns a driver within an
 * already-assigned carrier container. */
function assignDriver(
  shipmentId: string,
  driverActorId: string,
): Promise<Shipment> {
  return api.post<Shipment>(
    `/api/logistics/shipments/${shipmentId}/assign-driver/`,
    { driver_actor_id: driverActorId },
  );
}

/** The carrier's own tracking update — picked up / in transit /
 * delivered / failed, each appended as a real ShipmentEvent. */
function recordShipmentEvent(
  shipmentId: string,
  status: ShipmentEventStatus,
  note?: string,
): Promise<Shipment> {
  return api.post<Shipment>(
    `/api/logistics/shipments/${shipmentId}/record-event/`,
    note ? { status, note } : { status },
  );
}

export const logistics = {
  getShipment,
  listShipmentEvents,
  listMyShipments,
  listClaimableShipments,
  listForContainerAsSeller,
  listForContainerAsCarrier,
  publishForClaim,
  withdrawFromClaim,
  assignShipment,
  claimShipment,
  assignDriver,
  recordShipmentEvent,
};

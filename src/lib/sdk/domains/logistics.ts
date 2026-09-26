import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.logistics`'s REST API
 * (`/api/logistics/...`).
 *
 * NOTE on response envelopes: same `{"results": [...]}` convention as
 * `order.ts`/`fulfillment.ts`/`container.ts`/`inventory.ts` — see
 * `order.ts`'s own module docstring for the full reasoning.
 *
 * OWNERSHIP MECHANICS — several write actions below (operator
 * self-update, transport unit status updates, trip departures) are
 * gated backend-side by this domain's own Ownership-OR-Authority
 * checks (a real participant on that specific transport unit, or the
 * trip's own assigned operator), not container membership alone. A
 * 403 from any of these means neither condition was met — surfaced
 * generically here via ApiError, same as everywhere else in this SDK.
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
  trip_id: string | null;
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

export type OperatorStatus = "active" | "suspended" | "inactive";

export interface Operator {
  id: string;
  container_id: string;
  actor_id: string;
  transport_mode: string;
  credential_number: string;
  credential_type: string;
  credential_expires_at: string | null;
  phone: string | null;
  status: OperatorStatus;
  created_at: string | null;
  updated_at: string | null;
}

export type TransportUnitStatus = "active" | "maintenance" | "retired";

export interface TransportUnit {
  id: string;
  container_id: string;
  transport_mode: string;
  identifier: string;
  make_model: string;
  capacity_description: string;
  status: TransportUnitStatus;
  created_at: string | null;
  updated_at: string | null;
}

export type TransportUnitParticipantRole = "primary" | "secondary";

export interface TransportUnitParticipant {
  id: string;
  transport_unit_id: string;
  actor_id: string;
  role: TransportUnitParticipantRole;
  added_by_actor_id: string | null;
  joined_at: string | null;
}

export interface Route {
  id: string;
  container_id: string;
  transport_mode: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: string[];
  created_at: string | null;
}

/** A STANDING relationship — "this operator regularly runs this
 * route" — independent of any specific Trip. Distinct from a single
 * Trip's own one-off route_id choice. */
export interface RouteOperatorAssignment {
  id: string;
  route_id: string;
  operator_actor_id: string;
  added_by_actor_id: string | null;
  assigned_at: string | null;
}

export interface RouteTransportUnitAssignment {
  id: string;
  route_id: string;
  transport_unit_id: string;
  added_by_actor_id: string | null;
  assigned_at: string | null;
}

export type CarrierJobRequestStatus = "pending" | "approved" | "rejected";

/** An existing-shipment request: {"kind": "existing_shipment",
 * "shipment_id": "..."}. A custom-job request — no existing Shipment
 * at all, created fresh on approval — carries pickup/dropoff/cargo
 * description directly instead. */
export type CarrierJobRequestPayload =
  | { kind: "existing_shipment"; shipment_id: string }
  | {
      kind: "custom_job";
      seller_container_id: string;
      buyer_actor_id: string;
      pickup_description?: string;
      dropoff_description?: string;
      cargo_description?: string;
    };

export interface CarrierJobRequest {
  id: string;
  request_type: string;
  requester_actor_id: string;
  target_type: string;
  target_id: string;
  status: CarrierJobRequestStatus;
  payload: Record<string, unknown>;
  requested_at: string | null;
  decided_at: string | null;
  decided_by_actor_id: string | null;
  decision_reason: string | null;
}

export type TripStatus = "planned" | "in_transit" | "completed" | "failed";

export interface Trip {
  id: string;
  container_id: string;
  transport_unit_id: string;
  operator_actor_id: string;
  route_id: string | null;
  shipment_ids: string[];
  status: TripStatus;
  created_at: string | null;
  updated_at: string | null;
}

export type CarrierProfileStatus = "active" | "inactive";

export interface CarrierProfile {
  id: string;
  container_id: string;
  display_name: string;
  transport_modes: string[];
  description: string;
  avatar_url: string | null;
  status: CarrierProfileStatus;
  created_at: string | null;
  updated_at: string | null;
}

// -- Shipments ---------------------------------------------------------

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
 * already-assigned carrier container. Only meaningful for the DIRECT
 * assignment path (a shipment with no trip_id) — a trip-based
 * shipment's own responsible operator comes from its Trip instead
 * (see Trip's own docstring). */
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
 * delivered / failed, each appended as a real ShipmentEvent.
 * Ownership-OR-Authority backend-side: the shipment's own assigned
 * operator (via its Trip if it has one, else assigned_driver_actor_id
 * directly), or a container member with shipment.manage. */
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

// -- Operators -----------------------------------------------------------

export interface RegisterOperatorInput {
  actor_id: string;
  transport_mode: string;
  credential_number: string;
  credential_type: string;
  credential_expires_at?: string;
  phone?: string;
}

export interface UpdateOperatorInput {
  credential_number?: string;
  credential_type?: string;
  credential_expires_at?: string;
  phone?: string;
}

function registerOperator(
  containerId: string,
  input: RegisterOperatorInput,
): Promise<Operator> {
  return api.post<Operator>(
    `/api/logistics/containers/${containerId}/operators/`,
    input,
  );
}

async function listOperators(containerId: string): Promise<Operator[]> {
  const result = await api.get<{ results: Operator[] }>(
    `/api/logistics/containers/${containerId}/operators/`,
  );
  return result.results;
}

/** The acting actor's own operator profile on this container, or a
 * 404 if they aren't registered as one — actor-scoped, no permission
 * needed. */
function myOperatorProfile(containerId: string): Promise<Operator> {
  return api.get<Operator>(
    `/api/logistics/containers/${containerId}/operators/mine/`,
  );
}

function getOperator(operatorId: string): Promise<Operator> {
  return api.get<Operator>(`/api/logistics/operators/${operatorId}/`);
}

/** Self, or a fleet admin — see this module's own top docstring on
 * ownership mechanics. */
function updateOperator(
  operatorId: string,
  input: UpdateOperatorInput,
): Promise<Operator> {
  return api.post<Operator>(
    `/api/logistics/operators/${operatorId}/update/`,
    input,
  );
}

/** Authority-only, deliberately not self-service — see the backend's
 * own logistics_capability.py module docstring. */
function suspendOperator(operatorId: string): Promise<Operator> {
  return api.post<Operator>(`/api/logistics/operators/${operatorId}/suspend/`);
}

function reactivateOperator(operatorId: string): Promise<Operator> {
  return api.post<Operator>(
    `/api/logistics/operators/${operatorId}/reactivate/`,
  );
}

function deactivateOperator(operatorId: string): Promise<Operator> {
  return api.post<Operator>(
    `/api/logistics/operators/${operatorId}/deactivate/`,
  );
}

// -- Transport units -----------------------------------------------------

export interface RegisterTransportUnitInput {
  transport_mode: string;
  identifier: string;
  make_model: string;
  capacity_description: string;
}

export interface UpdateTransportUnitInput {
  make_model?: string;
  capacity_description?: string;
}

function registerTransportUnit(
  containerId: string,
  input: RegisterTransportUnitInput,
): Promise<TransportUnit> {
  return api.post<TransportUnit>(
    `/api/logistics/containers/${containerId}/transport-units/`,
    input,
  );
}

async function listTransportUnits(
  containerId: string,
): Promise<TransportUnit[]> {
  const result = await api.get<{ results: TransportUnit[] }>(
    `/api/logistics/containers/${containerId}/transport-units/`,
  );
  return result.results;
}

function getTransportUnit(unitId: string): Promise<TransportUnit> {
  return api.get<TransportUnit>(`/api/logistics/transport-units/${unitId}/`);
}

function updateTransportUnit(
  unitId: string,
  input: UpdateTransportUnitInput,
): Promise<TransportUnit> {
  return api.post<TransportUnit>(
    `/api/logistics/transport-units/${unitId}/update/`,
    input,
  );
}

/** A real participant on THIS unit, or transport_unit.manage — see
 * this module's own top docstring on ownership mechanics. */
function setTransportUnitMaintenance(unitId: string): Promise<TransportUnit> {
  return api.post<TransportUnit>(
    `/api/logistics/transport-units/${unitId}/maintenance/`,
  );
}

function reactivateTransportUnit(unitId: string): Promise<TransportUnit> {
  return api.post<TransportUnit>(
    `/api/logistics/transport-units/${unitId}/reactivate/`,
  );
}

/** Authority-only, deliberately: retiring a unit permanently is a
 * fleet decision, unlike the routine, reversible maintenance
 * toggle above. */
function retireTransportUnit(unitId: string): Promise<TransportUnit> {
  return api.post<TransportUnit>(
    `/api/logistics/transport-units/${unitId}/retire/`,
  );
}

async function listTransportUnitParticipants(
  unitId: string,
): Promise<TransportUnitParticipant[]> {
  const result = await api.get<{ results: TransportUnitParticipant[] }>(
    `/api/logistics/transport-units/${unitId}/participants/`,
  );
  return result.results;
}

function addTransportUnitParticipant(
  unitId: string,
  actorId: string,
  role: TransportUnitParticipantRole,
): Promise<TransportUnitParticipant> {
  return api.post<TransportUnitParticipant>(
    `/api/logistics/transport-units/${unitId}/participants/add/`,
    { actor_id: actorId, role },
  );
}

function removeTransportUnitParticipant(
  unitId: string,
  actorId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/logistics/transport-units/${unitId}/participants/remove/`,
    { actor_id: actorId },
  );
}

// -- Routes (folded into the "trip" permission resource) -----------------

export interface CreateRouteInput {
  transport_mode: string;
  name: string;
  origin: string;
  destination: string;
  waypoints?: string[];
}

function createRoute(containerId: string, input: CreateRouteInput): Promise<Route> {
  return api.post<Route>(
    `/api/logistics/containers/${containerId}/routes/`,
    input,
  );
}

async function listRoutes(containerId: string): Promise<Route[]> {
  const result = await api.get<{ results: Route[] }>(
    `/api/logistics/containers/${containerId}/routes/`,
  );
  return result.results;
}

async function listRouteOperatorAssignments(
  routeId: string,
): Promise<RouteOperatorAssignment[]> {
  const result = await api.get<{ results: RouteOperatorAssignment[] }>(
    `/api/logistics/routes/${routeId}/operators/`,
  );
  return result.results;
}

/** A STANDING assignment — persists independent of any specific
 * Trip. See RouteOperatorAssignment's own type docstring. */
function assignRouteOperator(
  routeId: string,
  operatorActorId: string,
): Promise<RouteOperatorAssignment> {
  return api.post<RouteOperatorAssignment>(
    `/api/logistics/routes/${routeId}/operators/`,
    { operator_actor_id: operatorActorId },
  );
}

function removeRouteOperatorAssignment(
  routeId: string,
  operatorActorId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/logistics/routes/${routeId}/operators/remove/`,
    { operator_actor_id: operatorActorId },
  );
}

async function listRouteTransportUnitAssignments(
  routeId: string,
): Promise<RouteTransportUnitAssignment[]> {
  const result = await api.get<{ results: RouteTransportUnitAssignment[] }>(
    `/api/logistics/routes/${routeId}/transport-units/`,
  );
  return result.results;
}

function assignRouteTransportUnit(
  routeId: string,
  transportUnitId: string,
): Promise<RouteTransportUnitAssignment> {
  return api.post<RouteTransportUnitAssignment>(
    `/api/logistics/routes/${routeId}/transport-units/`,
    { transport_unit_id: transportUnitId },
  );
}

function removeRouteTransportUnitAssignment(
  routeId: string,
  transportUnitId: string,
): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `/api/logistics/routes/${routeId}/transport-units/remove/`,
    { transport_unit_id: transportUnitId },
  );
}

// -- Trips -------------------------------------------------------------

export interface CreateTripInput {
  transport_unit_id: string;
  operator_actor_id: string;
  shipment_ids: string[];
  route_id?: string;
}

/** Creates the Trip AND assigns every shipment_id into its own
 * manifest, atomically, backend-side — see the backend's own
 * trip_service.py module docstring. */
function createTrip(containerId: string, input: CreateTripInput): Promise<Trip> {
  return api.post<Trip>(
    `/api/logistics/containers/${containerId}/trips/`,
    input,
  );
}

async function listTrips(containerId: string): Promise<Trip[]> {
  const result = await api.get<{ results: Trip[] }>(
    `/api/logistics/containers/${containerId}/trips/`,
  );
  return result.results;
}

/** "My assignments" — every trip where the acting actor is the
 * assigned operator, actor-scoped, no permission needed. */
async function listMyTrips(): Promise<Trip[]> {
  const result = await api.get<{ results: Trip[] }>("/api/logistics/trips/mine/");
  return result.results;
}

function getTrip(tripId: string): Promise<Trip> {
  return api.get<Trip>(`/api/logistics/trips/${tripId}/`);
}

/** The assigned operator, or trip.manage — see this module's own top
 * docstring on ownership mechanics. Triggers a status cascade to
 * every member shipment backend-side (records "picked_up" on each)
 * — best-effort per shipment, never blocking this trip's own
 * transition. */
function departTrip(tripId: string): Promise<Trip> {
  return api.post<Trip>(`/api/logistics/trips/${tripId}/depart/`);
}

/** Cascades "delivered" to every member shipment, same best-effort
 * shape as departTrip(). */
function completeTrip(tripId: string): Promise<Trip> {
  return api.post<Trip>(`/api/logistics/trips/${tripId}/complete/`);
}

/** Cascades "failed" to every member shipment not already terminal —
 * a shipment individually marked delivered before the trip itself
 * failed stays delivered, the override mechanism this domain
 * deliberately supports. */
function failTrip(tripId: string, reason?: string): Promise<Trip> {
  return api.post<Trip>(
    `/api/logistics/trips/${tripId}/fail/`,
    reason ? { reason } : undefined,
  );
}

// -- Carrier profiles ------------------------------------------------

export interface CreateCarrierProfileInput {
  display_name: string;
  transport_modes: string[];
  description: string;
  avatar_url?: string;
}

export interface UpdateCarrierProfileInput {
  display_name?: string;
  transport_modes?: string[];
  description?: string;
  avatar_url?: string;
}

/** The public carrier-discovery browse — open to any authenticated
 * actor. See the backend's own domain/entities.py module docstring
 * on why this is not a real surfacing.Listing browse. Now returns
 * every active profile across every carrier — a container running
 * several independent service lines shows up once per profile, not
 * once per container. */
async function listCarriers(): Promise<CarrierProfile[]> {
  const result = await api.get<{ results: CarrierProfile[] }>(
    "/api/logistics/carriers/",
  );
  return result.results;
}

/** Public, same as listCarriers. A container may have more than one
 * profile (one per independent service line) — this returns all of
 * them, not a single Optional. */
async function listCarrierProfilesForContainer(
  containerId: string,
): Promise<CarrierProfile[]> {
  const result = await api.get<{ results: CarrierProfile[] }>(
    `/api/logistics/containers/${containerId}/carrier-profiles/`,
  );
  return result.results;
}

function getCarrierProfile(profileId: string): Promise<CarrierProfile> {
  return api.get<CarrierProfile>(`/api/logistics/carrier-profiles/${profileId}/`);
}

/** Authority-only (carrier_profile.manage). Requires core.logistics
 * to actually be licensed on this container — a 409 here most likely
 * means it isn't. No uniqueness check — a container may create as
 * many independent profiles as it wants. */
function createCarrierProfile(
  containerId: string,
  input: CreateCarrierProfileInput,
): Promise<CarrierProfile> {
  return api.post<CarrierProfile>(
    `/api/logistics/containers/${containerId}/carrier-profiles/`,
    input,
  );
}

function updateCarrierProfile(
  profileId: string,
  input: UpdateCarrierProfileInput,
): Promise<CarrierProfile> {
  return api.post<CarrierProfile>(
    `/api/logistics/carrier-profiles/${profileId}/update/`,
    input,
  );
}

/** Hides this ONE profile from the public browse — any other profile
 * the same container has stays unaffected. */
function deactivateCarrierProfile(profileId: string): Promise<CarrierProfile> {
  return api.post<CarrierProfile>(
    `/api/logistics/carrier-profiles/${profileId}/deactivate/`,
  );
}

function reactivateCarrierProfile(profileId: string): Promise<CarrierProfile> {
  return api.post<CarrierProfile>(
    `/api/logistics/carrier-profiles/${profileId}/reactivate/`,
  );
}

// -- Carrier job requests ------------------------------------------------
//
// Wraps the platform's own shared request/approval primitive
// (domains.requests) rather than a parallel mechanism — "request a
// specific carrier to take a job, they accept or decline." Open to
// any authenticated actor to CREATE (same "anyone may initiate" shape
// purchasing itself already has); approving/rejecting requires
// shipment.manage on the target carrier container.

/** Open to any authenticated actor — requesting a carrier doesn't
 * require any special role, same as browsing the marketplace. */
function createCarrierJobRequest(
  carrierContainerId: string,
  payload: CarrierJobRequestPayload,
): Promise<CarrierJobRequest> {
  return api.post<CarrierJobRequest>("/api/logistics/carrier-job-requests/", {
    carrier_container_id: carrierContainerId,
    payload,
  });
}

/** Every request this actor themselves has made, actor-scoped. */
async function listMyCarrierJobRequests(): Promise<CarrierJobRequest[]> {
  const result = await api.get<{ results: CarrierJobRequest[] }>(
    "/api/logistics/carrier-job-requests/mine/",
  );
  return result.results;
}

/** A carrier's own inbox — pending (and past) requests asking this
 * container to take on a job. */
async function listCarrierJobRequestsForCarrier(
  containerId: string,
  status?: CarrierJobRequestStatus,
): Promise<CarrierJobRequest[]> {
  const query = status ? `?status=${status}` : "";
  const result = await api.get<{ results: CarrierJobRequest[] }>(
    `/api/logistics/containers/${containerId}/carrier-job-requests/${query}`,
  );
  return result.results;
}

function getCarrierJobRequest(requestId: string): Promise<CarrierJobRequest> {
  return api.get<CarrierJobRequest>(
    `/api/logistics/carrier-job-requests/${requestId}/`,
  );
}

/** Triggers the actual assignment/creation atomically with the
 * approval itself — if it fails (e.g. the referenced shipment was
 * claimed by someone else in the meantime), the whole thing rolls
 * back and the request stays pending. Returns both the updated
 * request and the resulting Shipment. */
function approveCarrierJobRequest(
  requestId: string,
): Promise<{ request: CarrierJobRequest; shipment: Shipment }> {
  return api.post<{ request: CarrierJobRequest; shipment: Shipment }>(
    `/api/logistics/carrier-job-requests/${requestId}/approve/`,
  );
}

function rejectCarrierJobRequest(
  requestId: string,
  reason?: string,
): Promise<CarrierJobRequest> {
  return api.post<CarrierJobRequest>(
    `/api/logistics/carrier-job-requests/${requestId}/reject/`,
    reason ? { reason } : undefined,
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
  registerOperator,
  listOperators,
  myOperatorProfile,
  getOperator,
  updateOperator,
  suspendOperator,
  reactivateOperator,
  deactivateOperator,
  registerTransportUnit,
  listTransportUnits,
  getTransportUnit,
  updateTransportUnit,
  setTransportUnitMaintenance,
  reactivateTransportUnit,
  retireTransportUnit,
  listTransportUnitParticipants,
  addTransportUnitParticipant,
  removeTransportUnitParticipant,
  createRoute,
  listRoutes,
  listRouteOperatorAssignments,
  assignRouteOperator,
  removeRouteOperatorAssignment,
  listRouteTransportUnitAssignments,
  assignRouteTransportUnit,
  removeRouteTransportUnitAssignment,
  createTrip,
  listTrips,
  listMyTrips,
  getTrip,
  departTrip,
  completeTrip,
  failTrip,
  listCarriers,
  listCarrierProfilesForContainer,
  getCarrierProfile,
  createCarrierProfile,
  updateCarrierProfile,
  deactivateCarrierProfile,
  reactivateCarrierProfile,
  createCarrierJobRequest,
  listMyCarrierJobRequests,
  listCarrierJobRequestsForCarrier,
  getCarrierJobRequest,
  approveCarrierJobRequest,
  rejectCarrierJobRequest,
};

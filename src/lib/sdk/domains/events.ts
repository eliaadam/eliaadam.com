import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.events`'s REST API
 * (`/api/events/...`). Response shapes match `_event_to_dict()`/
 * `_attendee_to_dict()`/`_participant_to_dict()` exactly, confirmed
 * against the real backend views.py. List-returning endpoints wrap in
 * `{"results": [...]}`, matching Inventory's own backend convention.
 *
 * OWNERSHIP RETROFIT — the old owner_status: "assigned"|"unassigned"|
 * "shared" field is GONE, replaced by an `ownership` object carrying
 * the real four-shape model (domains/foundations/ownership_shapes) —
 * "container"|"personal"|"container_shared"|"shared", mirroring
 * inventory.ts's own identical retrofit. ownership.is_owned_by_me is
 * computed SERVER-SIDE and included directly on every event response,
 * specifically so the frontend never needs a separate per-event
 * request just to know whether to show management controls.
 *
 * event_type is new — an open string classification, mirroring
 * Inventory's own item_type. Deliberately NOT the same thing as the
 * marketplace listing's own source_type (always "events" for this
 * capability, not event_type) — see the backend's own
 * catalog_seed.py for why.
 */

export type EventStatus = "draft" | "active" | "cancelled" | "archived";
export type AttendeeStatus = "registered" | "checked_in" | "cancelled";
export type EventOwnershipShape =
  "container" | "personal" | "container_shared" | "shared";
export type EventParticipantRole = "owner" | "admin" | "member";
export type EventParticipantStatus = "active" | "removed";

export interface EventPrice {
  base_amount: number;
  currency: string;
  tax_amount: number;
  transport_amount: number;
  discount_percent: number;
  subtotal: number;
  discount_amount: number;
  total: number;
  is_free: boolean;
}

export interface EventBrandingAsset {
  file_id: string;
  role: string;
}

export interface EventOwnership {
  shape: EventOwnershipShape;
  container_owner_id: string | null;
  label: string | null;
  allows_participants: boolean;
  is_owned_by_me: boolean | null;
}

export interface EventItem {
  id: string;
  container_id: string;
  title: string;
  event_type: string;
  description: string | null;
  price: EventPrice;
  branding: { assets: EventBrandingAsset[] };
  ownership: EventOwnership;
  starts_at: string;
  ends_at: string | null;
  physical_address: string | null;
  virtual_link: string | null;
  capacity: number | null;
  is_hybrid: boolean;
  status: EventStatus;
  is_published: boolean;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
}

export interface Attendee {
  id: string;
  event_id: string;
  actor_id: string;
  status: AttendeeStatus;
  registered_at: string | null;
  checked_in_at: string | null;
  is_checked_in: boolean;
}

export interface EventParticipant {
  id: string;
  resource_id: string;
  actor_id: string;
  role: EventParticipantRole;
  status: EventParticipantStatus;
  added_by_actor_id: string | null;
  joined_at: string | null;
}

export interface CreateEventInput {
  title: string;
  event_type: string;
  starts_at: string;
  description?: string;
  base_amount?: number;
  currency?: string;
  tax_amount?: number;
  transport_amount?: number;
  discount_percent?: number;
  ends_at?: string;
  physical_address?: string;
  virtual_link?: string;
  capacity?: number;
  owner_type?: EventOwnershipShape;
  /** Only meaningful for "container"/"container_shared" — defaults to
   * the event's own container_id server-side if omitted for those two
   * shapes. */
  container_owner_id?: string;
  /** Required by the backend for "personal"/"shared". */
  label?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  base_amount?: number;
  currency?: string;
  tax_amount?: number;
  transport_amount?: number;
  discount_percent?: number;
  starts_at?: string;
  ends_at?: string;
  physical_address?: string;
  virtual_link?: string;
  capacity?: number;
  /** event_type is deliberately NOT here — set once at creation, not
   * editable afterward, same convention Inventory's own item_type
   * already established. */
}

async function listEvents(
  containerId: string,
  status?: string,
): Promise<EventItem[]> {
  const query = status ? `?status=${status}` : "";
  const result = await api.get<{ results: EventItem[] }>(
    `/api/events/containers/${containerId}/events/${query}`,
  );
  return result.results;
}

function getEvent(eventId: string): Promise<EventItem> {
  return api.get<EventItem>(`/api/events/events/${eventId}/`);
}

function createEvent(
  containerId: string,
  input: CreateEventInput,
): Promise<EventItem> {
  return api.post<EventItem>(
    `/api/events/containers/${containerId}/events/`,
    input,
  );
}

function updateEvent(
  eventId: string,
  input: UpdateEventInput,
): Promise<EventItem> {
  return api.post<EventItem>(`/api/events/events/${eventId}/update/`, input);
}

function publishEvent(eventId: string): Promise<EventItem> {
  return api.post<EventItem>(`/api/events/events/${eventId}/publish/`);
}

function cancelEvent(eventId: string): Promise<EventItem> {
  return api.post<EventItem>(`/api/events/events/${eventId}/cancel/`);
}

function archiveEvent(eventId: string): Promise<EventItem> {
  return api.post<EventItem>(`/api/events/events/${eventId}/archive/`);
}

async function listAttendees(eventId: string): Promise<Attendee[]> {
  const result = await api.get<{ results: Attendee[] }>(
    `/api/events/events/${eventId}/attendees/`,
  );
  return result.results;
}

function checkInAttendee(attendeeId: string): Promise<Attendee> {
  return api.post<Attendee>(`/api/events/attendees/${attendeeId}/check-in/`);
}

function cancelAttendee(attendeeId: string): Promise<Attendee> {
  return api.post<Attendee>(`/api/events/attendees/${attendeeId}/cancel/`);
}

async function listParticipants(eventId: string): Promise<EventParticipant[]> {
  const result = await api.get<{ results: EventParticipant[] }>(
    `/api/events/events/${eventId}/participants/`,
  );
  return result.results;
}

function addParticipant(
  eventId: string,
  actorId: string,
  role: "admin" | "member" = "member",
): Promise<EventParticipant> {
  return api.post<EventParticipant>(
    `/api/events/events/${eventId}/participants/add/`,
    { actor_id: actorId, role },
  );
}

function removeParticipant(
  eventId: string,
  actorId: string,
): Promise<EventParticipant> {
  return api.post<EventParticipant>(
    `/api/events/events/${eventId}/participants/remove/`,
    { actor_id: actorId },
  );
}

export const events = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  publishEvent,
  cancelEvent,
  archiveEvent,
  listAttendees,
  checkInAttendee,
  cancelAttendee,
  listParticipants,
  addParticipant,
  removeParticipant,
};

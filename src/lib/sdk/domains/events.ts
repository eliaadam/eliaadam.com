import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.events`'s REST API
 * (`/api/events/...`). Response shapes match `_event_to_dict()`/
 * `_attendee_to_dict()` exactly, confirmed against the real backend
 * views.py. List-returning endpoints wrap in `{"results": [...]}`,
 * matching Inventory's own backend convention (NOT Surfacing's
 * `{"data": [...]}` — api.get() only auto-unwraps `.data`, so
 * `.results` is unwrapped manually here, same as inventory.ts does).
 */

export type EventStatus = "draft" | "active" | "cancelled" | "archived";
export type AttendeeStatus = "registered" | "checked_in" | "cancelled";
export type OwnerStatus = "assigned" | "unassigned" | "shared";

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

export interface BrandingAsset {
  file_id: string;
  role: string;
}

export interface EventItem {
  id: string;
  container_id: string;
  title: string;
  description: string | null;
  price: EventPrice;
  branding: { assets: BrandingAsset[] };
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
  owner_status: OwnerStatus;
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

export interface CreateEventInput {
  title: string;
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
};

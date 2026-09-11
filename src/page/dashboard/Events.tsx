import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar, Users, Check, X as XIcon } from "lucide-react";
import {
  sdk,
  type EventItem,
  type EventStatus,
  type Attendee,
} from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageEvents } from "../../lib/hooks/useCanManageEvents";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: EventStatus): string {
  if (status === "active") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "draft") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  if (status === "cancelled") {
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  }
  return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"; // archived
}

// datetime-local inputs give "2026-12-01T18:00" with no timezone —
// converting via Date/toISOString produces a real, unambiguous UTC
// ISO string the backend's datetime.fromisoformat() can parse
// correctly under Django's USE_TZ=True, rather than a naive datetime.
function toIsoOrUndefined(localValue: string): string | undefined {
  if (!localValue) return undefined;
  return new Date(localValue).toISOString();
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Events() {
  const { currentContainerId } = useContainer();
  const { user } = useAuth();
  const { data: canManage } = useCanManageEvents();
  const [showCreate, setShowCreate] = useState(false);

  const { data: allEvents, isLoading } = useQuery({
    queryKey: ["events", "list", currentContainerId],
    queryFn: () => sdk.events.listEvents(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — events belong to whichever container you're
        currently in.
      </p>
    );
  }

  const drafts =
    allEvents?.filter((e: EventItem) => e.status === "draft") ?? [];
  const active =
    allEvents?.filter((e: EventItem) => e.status === "active") ?? [];
  const cancelled =
    allEvents?.filter((e: EventItem) => e.status === "cancelled") ?? [];
  const archived =
    allEvents?.filter((e: EventItem) => e.status === "archived") ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Ticketed events this container can host — RSVP, check-in, and
            attendance, kept separate from where and how tickets are sold.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={`flex flex-none items-center gap-1.5 ${primaryButtonClass}`}
          >
            <Plus size={15} />
            New event
          </button>
        )}
      </div>

      {!canManage && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          You don't have permission to create events on this container — showing
          what's here, but the "New event" control is hidden. You may still see
          management controls on events you personally own.
        </p>
      )}

      {showCreate && canManage && (
        <EventForm
          containerId={currentContainerId}
          onDone={() => setShowCreate(false)}
        />
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

      {allEvents && allEvents.length === 0 && !showCreate && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Calendar
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No events yet</p>
        </div>
      )}

      {drafts.length > 0 && (
        <EventSection
          title="Drafts"
          events={drafts}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
      {active.length > 0 && (
        <EventSection
          title="Active"
          events={active}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
      {cancelled.length > 0 && (
        <EventSection
          title="Cancelled"
          events={cancelled}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
      {archived.length > 0 && (
        <EventSection
          title="Archived"
          events={archived}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
    </div>
  );
}

function EventSection({
  title,
  events,
  currentActorId,
  canManage,
}: {
  title: string;
  events: EventItem[];
  currentActorId: string | undefined;
  canManage: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        {title}
      </p>
      <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            currentActorId={currentActorId}
            canManage={canManage}
          />
        ))}
      </ul>
    </div>
  );
}

function EventRow({
  event,
  currentActorId,
  canManage,
}: {
  event: EventItem;
  currentActorId: string | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);

  // Combined "owner OR role-holder" check, mirroring the backend's
  // own _forbid_unless_owner_or_manager exactly — genuinely different
  // from Inventory's strict-ownership-only rule. Either half being
  // true is enough.
  const isOwner =
    Boolean(currentActorId) &&
    event.created_by_actor_id === currentActorId &&
    event.owner_status === "assigned";
  const canManageThis = isOwner || canManage;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["events"] });

  const publishMutation = useMutation({
    mutationFn: () => sdk.events.publishEvent(event.id),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => sdk.events.cancelEvent(event.id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.events.archiveEvent(event.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li className="p-4">
        <EventForm
          containerId={event.container_id}
          existing={event}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  if (showAttendees) {
    return (
      <li className="p-4">
        <AttendeesSection
          event={event}
          onDone={() => setShowAttendees(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{event.title}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(event.status)}`}
          >
            {event.status}
          </span>
          {event.owner_status === "unassigned" && (
            <span
              className="flex-none rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              title="No one currently owns this event — a container admin can reassign it."
            >
              unowned
            </span>
          )}
        </div>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
          {new Date(event.starts_at).toLocaleString()}
          {" · "}
          {event.physical_address || event.virtual_link || "No location set"}
          {event.is_hybrid && " (hybrid)"}
          {" · "}
          {event.price.is_free
            ? "Free"
            : `${event.price.currency} ${(event.price.total / 100).toFixed(2)}`}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAttendees(true)}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          <Users size={13} />
          Attendees
        </button>
        {canManageThis && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              Edit
            </button>
            {event.status === "draft" && (
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {publishMutation.isPending ? "Publishing…" : "Publish"}
              </button>
            )}
            {(event.status === "draft" || event.status === "active") && (
              <button
                type="button"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
              </button>
            )}
            {event.status !== "archived" && (
              <button
                type="button"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:hover:bg-neutral-900"
              >
                Archive
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function AttendeesSection({
  event,
  onDone,
}: {
  event: EventItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: attendees, isLoading } = useQuery({
    queryKey: ["events", "attendees", event.id],
    queryFn: () => sdk.events.listAttendees(event.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["events", "attendees", event.id],
    });

  const checkInMutation = useMutation({
    mutationFn: (attendeeId: string) => sdk.events.checkInAttendee(attendeeId),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: (attendeeId: string) => sdk.events.cancelAttendee(attendeeId),
    onSuccess: invalidate,
  });

  const registeredCount =
    attendees?.filter((a: Attendee) => a.status !== "cancelled").length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Attendees — {event.title}
          {event.capacity != null && (
            <span className="ml-1.5 text-xs font-normal text-neutral-500 dark:text-neutral-500">
              ({registeredCount}/{event.capacity})
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Done
        </button>
      </div>

      {isLoading && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {attendees && attendees.length === 0 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          No one has registered yet.
        </p>
      )}

      {attendees && attendees.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {attendees.map((attendee: Attendee) => (
            <AttendeeRow
              key={attendee.id}
              attendee={attendee}
              onCheckIn={() => checkInMutation.mutate(attendee.id)}
              onCancel={() => cancelMutation.mutate(attendee.id)}
              checkingIn={
                checkInMutation.isPending &&
                checkInMutation.variables === attendee.id
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AttendeeRow({
  attendee,
  onCheckIn,
  onCancel,
  checkingIn,
}: {
  attendee: Attendee;
  onCheckIn: () => void;
  onCancel: () => void;
  checkingIn: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{attendee.actor_id}</p>
        {attendee.registered_at && (
          <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
            Registered {new Date(attendee.registered_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">
        {attendee.status === "cancelled" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
            cancelled
          </span>
        ) : attendee.is_checked_in ? (
          <span className="flex items-center gap-1 rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-black">
            <Check size={11} />
            checked in
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onCheckIn}
              disabled={checkingIn}
              className="rounded-md bg-black px-2 py-1 text-[11px] font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {checkingIn ? "Checking in…" : "Check in"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel registration"
              className="text-neutral-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              <XIcon size={14} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function EventForm({
  containerId,
  existing,
  onDone,
}: {
  containerId: string;
  existing?: EventItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(existing);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [startsAt, setStartsAt] = useState(
    isoToLocalInput(existing?.starts_at ?? null),
  );
  const [endsAt, setEndsAt] = useState(
    isoToLocalInput(existing?.ends_at ?? null),
  );
  const [physicalAddress, setPhysicalAddress] = useState(
    existing?.physical_address ?? "",
  );
  const [virtualLink, setVirtualLink] = useState(existing?.virtual_link ?? "");
  const [capacity, setCapacity] = useState(
    existing?.capacity != null ? String(existing.capacity) : "",
  );
  const [baseAmount, setBaseAmount] = useState(
    existing ? String(existing.price.base_amount / 100) : "",
  );
  const [currency, setCurrency] = useState(existing?.price.currency ?? "USD");
  const [taxAmount, setTaxAmount] = useState(
    existing ? String(existing.price.tax_amount / 100) : "0",
  );
  const [transportAmount, setTransportAmount] = useState(
    existing ? String(existing.price.transport_amount / 100) : "0",
  );
  const [discountPercent, setDiscountPercent] = useState(
    existing ? String(existing.price.discount_percent) : "0",
  );

  const toCents = (v: string) => Math.round(Number(v || "0") * 100);

  // Mirrors Price's own subtotal/discount/total computation exactly
  // (base + tax + transport, discount applied to that whole subtotal,
  // floored) — the same formula verified against the backend for
  // Inventory's own price preview; NOT base*(1-discount/100), which
  // can differ by a cent from the backend's floor-based result.
  const subtotalCents =
    toCents(baseAmount) + toCents(taxAmount) + toCents(transportAmount);
  const discountCents = Math.floor(
    (subtotalCents * Number(discountPercent || "0")) / 100,
  );
  const totalCents = subtotalCents - discountCents;

  const mutation = useMutation({
    mutationFn: () => {
      const common = {
        title,
        description,
        base_amount: toCents(baseAmount),
        currency: currency.toUpperCase(),
        tax_amount: toCents(taxAmount),
        transport_amount: toCents(transportAmount),
        discount_percent: Number(discountPercent || "0"),
        ends_at: toIsoOrUndefined(endsAt),
        physical_address: physicalAddress || undefined,
        virtual_link: virtualLink || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      };
      if (isEdit) {
        return sdk.events.updateEvent(existing!.id, {
          ...common,
          starts_at: toIsoOrUndefined(startsAt),
        });
      }
      return sdk.events.createEvent(containerId, {
        ...common,
        starts_at: toIsoOrUndefined(startsAt) ?? new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onDone();
    },
  });

  const canSubmit =
    Boolean(title) &&
    Boolean(startsAt) &&
    Boolean(physicalAddress || virtualLink);

  return (
    <div
      className={
        isEdit
          ? "flex flex-col gap-3"
          : "mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Title
        </label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description (Markdown)
        </label>
        <textarea
          className={`${inputClass} min-h-[4rem] font-mono text-xs`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Starts
          </label>
          <input
            type="datetime-local"
            className={inputClass}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Ends (optional)
          </label>
          <input
            type="datetime-local"
            className={inputClass}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Physical address
        </label>
        <input
          className={inputClass}
          placeholder="123 Main St…"
          value={physicalAddress}
          onChange={(e) => setPhysicalAddress(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Virtual link
        </label>
        <input
          className={inputClass}
          placeholder="https://…"
          value={virtualLink}
          onChange={(e) => setVirtualLink(e.target.value)}
        />
        <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
          At least one of address or link is required — set both for a hybrid
          event.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Capacity (optional — informational only, not enforced)
        </label>
        <input
          className={`${inputClass} max-w-[8rem]`}
          type="number"
          min="0"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Price
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Tax
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Transport
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={transportAmount}
            onChange={(e) => setTransportAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Discount %
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          className={`${inputClass} max-w-[6rem]`}
          placeholder="USD"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Total ticket price:{" "}
          <span className="font-medium text-black dark:text-white">
            {currency.toUpperCase()} {(totalCents / 100).toFixed(2)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create event"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't save this event.
          </p>
        )}
      </div>
    </div>
  );
}

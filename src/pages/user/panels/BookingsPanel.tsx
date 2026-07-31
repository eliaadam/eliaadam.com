import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logisticsApi as api } from "./logistics-api";

type Booking = { id: string; reference: string; trip_id: string; passenger_name: string | null; seats: number; status: string; payment_status: string };
type Trip = { id: string; code: string; origin: string | null; destination: string | null; status: string; seats_total: number; seats_taken: number };

/**
 * Bookings — passenger fork. Staff/agents see all and manage; a customer sees
 * their own and self-books via `book`. Booking a seat picks an open trip.
 */
export default function BookingsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canViewAll = can("maicore.logistics.booking.view");
  const canCreate = can("maicore.logistics.booking.create");
  const canBookSelf = can("maicore.logistics.booking.book");

  const bookings = useQuery({
    queryKey: ["log", "bookings", containerId],
    queryFn: () => (canViewAll ? api("GET", `/containers/${containerId}/bookings`) : api("GET", `/containers/${containerId}/bookings/me`)),
  });
  const trips = useQuery({ queryKey: ["log", "trips", "passenger", containerId], queryFn: () => api("GET", `/containers/${containerId}/trips?trip_kind=passenger`) });

  const [tripId, setTripId] = useState("");
  const [pname, setPname] = useState("");
  const [seats, setSeats] = useState("1");

  const create = useMutation({
    mutationFn: () => {
      const body = { trip_id: tripId, passenger_name: pname.trim() || undefined, seats: Number(seats) || 1 };
      return api("POST", `/containers/${containerId}/bookings${canCreate ? "" : "/book"}`, body);
    },
    onSuccess: () => { setPname(""); setMsg("Booked."); qc.invalidateQueries({ queryKey: ["log", "bookings", containerId] }); qc.invalidateQueries({ queryKey: ["log", "trips", "passenger", containerId] }); },
    onError: (e: any) => setMsg(e.message),
  });

  const act = (id: string, action: string) =>
    api("POST", `/containers/${containerId}/bookings/${id}/${action}`, {}).then(() => {
      setMsg(`Booking ${action}.`);
      qc.invalidateQueries({ queryKey: ["log", "bookings", containerId] });
    }).catch((e: any) => setMsg(e.message));

  const list: Booking[] = Array.isArray(bookings.data) ? bookings.data : [];
  const openTrips: Trip[] = (Array.isArray(trips.data) ? trips.data : []).filter((t) => !["completed", "cancelled"].includes(t.status));

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      {(canCreate || canBookSelf) && (
        <div className="flex flex-wrap gap-2 items-end">
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white">
            <option value="">Trip…</option>
            {openTrips.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.origin} → {t.destination} ({t.seats_total - t.seats_taken} free)</option>)}
          </select>
          {canCreate && <input value={pname} onChange={(e) => setPname(e.target.value)} placeholder="Passenger name" className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-40" />}
          <input value={seats} onChange={(e) => setSeats(e.target.value)} type="number" min="1" className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-16" />
          <button onClick={() => create.mutate()} disabled={!tripId || create.isPending} className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">{canCreate ? "Book for customer" : "Book seat"}</button>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {bookings.isLoading ? <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div> : list.length === 0 ? <div className="px-3 py-2 text-sm text-neutral-500">No bookings.</div> : list.map((b) => (
          <div key={b.id} className="flex items-center justify-between px-3 py-2">
            <div className="text-sm text-black dark:text-white">
              {b.reference} <span className="text-[11px] text-neutral-400">{b.passenger_name ?? "—"} · {b.seats} seat(s) · {b.status} · {b.payment_status}</span>
            </div>
            <div className="flex gap-1">
              {b.status === "reserved" && can("maicore.logistics.booking.confirm") && <button onClick={() => act(b.id, "confirm")} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Confirm</button>}
              {["reserved", "confirmed"].includes(b.status) && can("maicore.logistics.booking.board") && <button onClick={() => act(b.id, "board")} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Board</button>}
              {!["cancelled", "completed"].includes(b.status) && can("maicore.logistics.booking.cancel") && <button onClick={() => act(b.id, "cancel")} className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400">Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

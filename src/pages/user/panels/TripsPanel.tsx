import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logisticsApi as api } from "./logistics-api";

type Trip = { id: string; code: string; trip_kind: string; origin: string | null; destination: string | null; status: string; seats_total: number; seats_taken: number; vehicle_id: string | null; driver_id: string | null };
type Vehicle = { id: string; plate: string; capacity_seats: number };
type Driver = { id: string; display_name: string | null; actor_id: string };

/**
 * Trips — the shared movement lifecycle. Schedule, assign vehicle+driver, then
 * start → complete (or cancel). Common to passenger and cargo.
 */
export default function TripsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const canViewAll = can("maicore.logistics.trip.view");

  const trips = useQuery({
    queryKey: ["log", "trips", containerId],
    queryFn: () => (canViewAll ? api("GET", `/containers/${containerId}/trips`) : api("GET", `/containers/${containerId}/trips/me`)),
  });
  const vehicles = useQuery({ queryKey: ["log", "vehicles", containerId], queryFn: () => api("GET", `/containers/${containerId}/vehicles`), enabled: can("maicore.logistics.trip.assign") });
  const drivers = useQuery({ queryKey: ["log", "drivers", containerId], queryFn: () => api("GET", `/containers/${containerId}/drivers`), enabled: can("maicore.logistics.trip.assign") });

  const [kind, setKind] = useState("passenger");
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");

  const schedule = useMutation({
    mutationFn: () => api("POST", `/containers/${containerId}/trips`, { trip_kind: kind, origin: origin.trim() || undefined, destination: dest.trim() || undefined }),
    onSuccess: () => { setOrigin(""); setDest(""); setMsg("Trip scheduled."); qc.invalidateQueries({ queryKey: ["log", "trips", containerId] }); },
    onError: (e: any) => setMsg(e.message),
  });

  const act = (id: string, action: string, body?: unknown) =>
    api("POST", `/containers/${containerId}/trips/${id}/${action}`, body).then(() => {
      setMsg(`Trip ${action}.`);
      qc.invalidateQueries({ queryKey: ["log", "trips", containerId] });
    }).catch((e: any) => setMsg(e.message));

  const list: Trip[] = Array.isArray(trips.data) ? trips.data : [];
  const vlist: Vehicle[] = Array.isArray(vehicles.data) ? vehicles.data : [];
  const dlist: Driver[] = Array.isArray(drivers.data) ? drivers.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      {can("maicore.logistics.trip.schedule") && (
        <div className="flex flex-wrap gap-2 items-end">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white">
            <option value="passenger">passenger</option>
            <option value="cargo">cargo</option>
          </select>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-36" />
          <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Destination" className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-36" />
          <button onClick={() => schedule.mutate()} disabled={schedule.isPending} className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">Schedule trip</button>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {trips.isLoading ? <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div> : list.length === 0 ? <div className="px-3 py-2 text-sm text-neutral-500">No trips.</div> : list.map((t) => (
          <div key={t.id} className="px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-black dark:text-white">
                {t.code} <span className="text-[11px] text-neutral-400">{t.trip_kind} · {t.origin ?? "?"} → {t.destination ?? "?"} · {t.status}{t.seats_total > 0 ? ` · ${t.seats_taken}/${t.seats_total} seats` : ""}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.status === "scheduled" && can("maicore.logistics.trip.assign") && (
                <>
                  <select id={`veh-${t.id}`} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white">
                    <option value="">vehicle…</option>
                    {vlist.map((v) => <option key={v.id} value={v.id}>{v.plate}</option>)}
                  </select>
                  <select id={`drv-${t.id}`} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white">
                    <option value="">driver…</option>
                    {dlist.map((d) => <option key={d.id} value={d.id}>{d.display_name ?? d.actor_id.slice(0, 6)}</option>)}
                  </select>
                  <button onClick={() => {
                    const veh = (document.getElementById(`veh-${t.id}`) as HTMLSelectElement)?.value || undefined;
                    const drv = (document.getElementById(`drv-${t.id}`) as HTMLSelectElement)?.value || undefined;
                    act(t.id, "assign", { vehicle_id: veh, driver_id: drv });
                  }} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Assign</button>
                </>
              )}
              {t.status === "assigned" && can("maicore.logistics.trip.start") && <button onClick={() => act(t.id, "start")} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Start</button>}
              {t.status === "in_progress" && can("maicore.logistics.trip.complete") && <button onClick={() => act(t.id, "complete")} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Complete</button>}
              {!["completed", "cancelled"].includes(t.status) && can("maicore.logistics.trip.cancel") && <button onClick={() => act(t.id, "cancel")} className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400">Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

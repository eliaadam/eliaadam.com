import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logisticsApi as api } from "./logistics-api";

type Shipment = {
  id: string;
  reference: string;
  receiver_name: string;
  origin: string;
  destination: string;
  contents: string | null;
  weight_kg: number;
  status: string;
  payment_status: string;
};
type TrackEvent = {
  id: string;
  event_type: string;
  location: string | null;
  note: string | null;
  occurred_at: string | null;
};

/**
 * Shipments — cargo fork. Create/send consignments, then record tracking events
 * (which advance the shipment status). Customers see their own and self-ship;
 * staff/drivers record tracking.
 */
export default function ShipmentsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const canViewAll = can("system.logistics.shipment.view");
  const canCreate = can("system.logistics.shipment.create");
  const canShipSelf = can("system.logistics.shipment.ship");
  const canTrack = can("system.logistics.tracking.update");

  const shipments = useQuery({
    queryKey: ["log", "shipments", containerId],
    queryFn: () =>
      canViewAll
        ? api("GET", `/containers/${containerId}/shipments`)
        : api("GET", `/containers/${containerId}/shipments/me`),
  });

  const [rcv, setRcv] = useState("");
  const [org, setOrg] = useState("");
  const [dst, setDst] = useState("");
  const [contents, setContents] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api(
        "POST",
        `/containers/${containerId}/shipments${canCreate ? "" : "/ship"}`,
        {
          receiver_name: rcv.trim(),
          origin: org.trim(),
          destination: dst.trim(),
          contents: contents.trim() || undefined,
        },
      ),
    onSuccess: () => {
      setRcv("");
      setOrg("");
      setDst("");
      setContents("");
      setMsg("Shipment created.");
      qc.invalidateQueries({ queryKey: ["log", "shipments", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const tracking = useQuery({
    queryKey: ["log", "tracking", containerId, openId],
    queryFn: () =>
      canViewAll
        ? api("GET", `/containers/${containerId}/shipments/${openId}/tracking`)
        : api(
            "GET",
            `/containers/${containerId}/shipments/${openId}/tracking/me`,
          ),
    enabled: !!openId,
  });

  const record = useMutation({
    mutationFn: (vars: { id: string; event_type: string }) =>
      api("POST", `/containers/${containerId}/shipments/${vars.id}/tracking`, {
        event_type: vars.event_type,
      }),
    onSuccess: () => {
      setMsg("Tracking updated.");
      qc.invalidateQueries({ queryKey: ["log", "shipments", containerId] });
      qc.invalidateQueries({
        queryKey: ["log", "tracking", containerId, openId],
      });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const list: Shipment[] = Array.isArray(shipments.data) ? shipments.data : [];
  const events: TrackEvent[] = Array.isArray(tracking.data)
    ? tracking.data
    : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {(canCreate || canShipSelf) && (
        <div className="flex flex-wrap gap-2 items-end">
          <input
            value={rcv}
            onChange={(e) => setRcv(e.target.value)}
            placeholder="Receiver"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
          />
          <input
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            placeholder="Origin"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-28"
          />
          <input
            value={dst}
            onChange={(e) => setDst(e.target.value)}
            placeholder="Destination"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-28"
          />
          <input
            value={contents}
            onChange={(e) => setContents(e.target.value)}
            placeholder="Contents"
            className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
          />
          <button
            onClick={() => create.mutate()}
            disabled={
              !rcv.trim() || !org.trim() || !dst.trim() || create.isPending
            }
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {canCreate ? "Create shipment" : "Send shipment"}
          </button>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {shipments.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No shipments.
          </div>
        ) : (
          list.map((s) => (
            <div key={s.id} className="px-3 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOpenId(openId === s.id ? null : s.id)}
                  className="text-left text-sm text-black dark:text-white"
                >
                  {s.reference}{" "}
                  <span className="text-[11px] text-neutral-400">
                    → {s.receiver_name} · {s.origin} → {s.destination} ·{" "}
                    {s.status}
                  </span>
                </button>
                {canTrack && !["delivered", "cancelled"].includes(s.status) && (
                  <div className="flex gap-1">
                    {s.status === "created" && (
                      <button
                        onClick={() =>
                          record.mutate({ id: s.id, event_type: "picked_up" })
                        }
                        className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                      >
                        Pick up
                      </button>
                    )}
                    {s.status === "picked_up" && (
                      <button
                        onClick={() =>
                          record.mutate({ id: s.id, event_type: "in_transit" })
                        }
                        className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                      >
                        In transit
                      </button>
                    )}
                    {["picked_up", "in_transit"].includes(s.status) && (
                      <button
                        onClick={() =>
                          record.mutate({ id: s.id, event_type: "delivered" })
                        }
                        className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                      >
                        Deliver
                      </button>
                    )}
                  </div>
                )}
              </div>
              {openId === s.id && (
                <div className="pl-3 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-1">
                  {tracking.isLoading ? (
                    <div className="text-[11px] text-neutral-400">
                      Loading events…
                    </div>
                  ) : events.length === 0 ? (
                    <div className="text-[11px] text-neutral-400">
                      No events.
                    </div>
                  ) : (
                    events.map((ev) => (
                      <div key={ev.id} className="text-[11px] text-neutral-500">
                        <span className="text-black dark:text-white">
                          {ev.event_type}
                        </span>
                        {ev.location ? ` · ${ev.location}` : ""}
                        {ev.occurred_at
                          ? ` · ${new Date(ev.occurred_at).toLocaleString()}`
                          : ""}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  marketplaceApi as api,
  inventoryApi,
  toMajor,
} from "./marketplace-api";

type Listing = {
  id: string;
  title: string;
  price: number;
  currency: string;
  visibility: string;
  status: string;
  offering_type: string;
  offering_id: string;
};
type Offering = {
  id: string;
  name: string;
  price: number;
  currency: string;
  offering_type: string;
  status: string;
};

/**
 * My Listings — publish offerings from Inventory, manage visibility (private ↔
 * public) and status (pause/resume/withdraw). Publishing snapshots the offering.
 */
export default function MyListingsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const canPublish = can("system.marketplace.listing.publish");
  const canManage = can("system.marketplace.listing.manage");

  const listings = useQuery({
    queryKey: ["mkt", "mine", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/listings`),
  });

  // Offerings available to publish (from Inventory). Empty if Inventory is off.
  const offerings = useQuery({
    queryKey: ["mkt", "publishable", containerId],
    queryFn: () =>
      inventoryApi(
        "GET",
        `/containers/${containerId}/offerings?status=active`,
      ) as Promise<Offering[]>,
    enabled: canPublish && publishing,
    retry: false,
  });

  const publish = useMutation({
    mutationFn: ({
      offeringId,
      visibility,
    }: {
      offeringId: string;
      visibility: string;
    }) =>
      api("POST", `/containers/${containerId}/listings`, {
        offering_id: offeringId,
        visibility,
      }),
    onSuccess: () => {
      setMsg("Published.");
      setPublishing(false);
      qc.invalidateQueries({ queryKey: ["mkt", "mine", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const act = (id: string, action: string, method = "POST", body?: unknown) =>
    api(method, `/containers/${containerId}/listings/${id}${action}`, body)
      .then(() => {
        setMsg("Updated.");
        qc.invalidateQueries({ queryKey: ["mkt", "mine", containerId] });
      })
      .catch((e: any) => setMsg(e.message));

  const list: Listing[] = Array.isArray(listings.data) ? listings.data : [];
  const publishable: Offering[] = Array.isArray(offerings.data)
    ? offerings.data
    : [];
  const listedIds = new Set(list.map((l) => l.offering_id));

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canPublish && (
        <div>
          <button
            onClick={() => setPublishing(!publishing)}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            {publishing ? "Close" : "+ Publish an offering"}
          </button>
          {publishing && (
            <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
              {offerings.isLoading ? (
                <p className="text-xs text-neutral-400">
                  Loading your offerings…
                </p>
              ) : publishable.length === 0 ? (
                <p className="text-xs text-neutral-400">
                  No active offerings to publish. Add some in the Inventory tab
                  first (Inventory must be enabled).
                </p>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                  {publishable.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="text-sm text-black dark:text-white">
                        {o.name}{" "}
                        <span className="text-[11px] text-neutral-400">
                          {toMajor(o.price)} {o.currency} · {o.offering_type}
                          {listedIds.has(o.id) ? " · already listed" : ""}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            publish.mutate({
                              offeringId: o.id,
                              visibility: "private",
                            })
                          }
                          className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                        >
                          Private
                        </button>
                        <button
                          onClick={() =>
                            publish.mutate({
                              offeringId: o.id,
                              visibility: "public",
                            })
                          }
                          className="px-2 py-1 text-[11px] rounded bg-black text-white dark:bg-white dark:text-black"
                        >
                          Public
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {listings.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No listings yet.
          </div>
        ) : (
          list.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div>
                <div className="text-sm text-black dark:text-white">
                  {l.title}
                  <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {l.visibility}
                  </span>
                  {l.status !== "active" && (
                    <span className="text-[10px] ml-1 text-neutral-400">
                      {l.status}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {toMajor(l.price)} {l.currency} · {l.offering_type}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      act(l.id, "/visibility", "PATCH", {
                        visibility:
                          l.visibility === "public" ? "private" : "public",
                      })
                    }
                    className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                  >
                    Make {l.visibility === "public" ? "private" : "public"}
                  </button>
                  {l.status === "active" ? (
                    <button
                      onClick={() => act(l.id, "/pause")}
                      className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                    >
                      Pause
                    </button>
                  ) : l.status === "paused" ? (
                    <button
                      onClick={() => act(l.id, "/resume")}
                      className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                    >
                      Resume
                    </button>
                  ) : null}
                  <button
                    onClick={() => act(l.id, "", "DELETE")}
                    className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                  >
                    Withdraw
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

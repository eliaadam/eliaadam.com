import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { inventoryApi as api, toMajor } from "./inventory-api";

type Asset = {
  id: string;
  asset_kind: string;
  source_capability: string;
  name: string;
  summary: string | null;
  value: number;
  currency: string;
  value_unit: string | null;
  quantity: number | null;
  availability: string;
  monetizable: boolean;
  thumbnail_url: string | null;
};

const CAP_LABELS: Record<string, string> = {
  "system.inventory": "Inventory",
  "system.hr": "Human Resources",
  "system.logistics": "Logistics",
};

/**
 * Assets — the container's whole asset picture. Every capability that registers
 * assets surfaces here in one place, grouped by source. This is the aggregating
 * + monetization view: monetizable assets can be published to the marketplace.
 */
export default function AssetsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const [filter, setFilter] = useState<string>("all");

  const summary = useQuery({
    queryKey: ["inv", "asset-summary", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/assets/summary`),
  });
  const assets = useQuery({
    queryKey: ["inv", "assets", containerId, filter],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/assets${filter !== "all" ? `?source_capability=${filter}` : ""}`,
      ),
  });

  if (!can("system.inventory.offering.view")) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        You don't have permission to view assets.
      </div>
    );
  }

  const list: Asset[] = Array.isArray(assets.data) ? assets.data : [];
  const byCapability: Record<string, any> = summary.data?.by_capability ?? {};
  const total = summary.data?.total ?? 0;

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
          <div className="text-[11px] text-neutral-400">Total assets</div>
          <div className="text-xl font-semibold text-black dark:text-white">
            {total}
          </div>
        </div>
        {Object.entries(byCapability)
          .slice(0, 3)
          .map(([cap, s]: [string, any]) => (
            <div
              key={cap}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
            >
              <div className="text-[11px] text-neutral-400">
                {CAP_LABELS[cap] ?? cap}
              </div>
              <div className="text-xl font-semibold text-black dark:text-white">
                {s.total}
              </div>
              <div className="text-[10px] text-neutral-400">
                {s.monetizable} monetizable
              </div>
            </div>
          ))}
      </div>

      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-xs rounded-md border ${filter === "all" ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
        >
          All sources
        </button>
        {Object.keys(byCapability).map((cap) => (
          <button
            key={cap}
            onClick={() => setFilter(cap)}
            className={`px-3 py-1.5 text-xs rounded-md border ${filter === cap ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
          >
            {CAP_LABELS[cap] ?? cap}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {assets.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No assets registered yet. As capabilities register assets, they
            appear here.
          </div>
        ) : (
          list.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {a.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {a.asset_kind}
                  </span>
                  {a.monetizable && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                      monetizable
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {CAP_LABELS[a.source_capability] ?? a.source_capability}
                  {" · "}
                  {toMajor(a.value)} {a.currency}
                  {a.value_unit ? `/${a.value_unit}` : ""}
                  {a.quantity !== null ? ` · qty ${a.quantity}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

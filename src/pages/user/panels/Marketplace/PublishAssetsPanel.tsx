import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi as api, toMajor } from "./marketplace-api";

type Asset = {
  id: string;
  name: string;
  summary: string | null;
  asset_kind: string;
  source_capability: string;
  value: number;
  currency: string;
  value_unit: string | null;
  is_listed: boolean;
};

// Friendly section headers per capability. New capabilities appear automatically
// under their feature code if not mapped here.
const CAP_SECTIONS: Record<string, { label: string; icon: string }> = {
  "maicore.inventory": { label: "Products & Services", icon: "📦" },
  "maicore.templates": { label: "Templates", icon: "📄" },
  "maicore.hr": { label: "Workforce Capacity", icon: "👥" },
  "maicore.logistics": { label: "Logistics Capacity", icon: "🚚" },
};

/**
 * Publish panel — every monetizable asset in the container, grouped into a
 * dedicated SECTION per source capability. This is the federated marketplace's
 * publish surface: any capability that registers assets gets its own section
 * here automatically, with no marketplace code specific to it.
 */
export default function PublishAssetsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canPublish = can("system.marketplace.listing.publish");

  const assets = useQuery({
    queryKey: ["marketplace", "publishable", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/publishable-assets`),
  });

  const publish = useMutation({
    mutationFn: ({
      assetId,
      visibility,
    }: {
      assetId: string;
      visibility: string;
    }) =>
      api("POST", `/containers/${containerId}/listings/asset`, {
        asset_id: assetId,
        visibility,
      }),
    onSuccess: () => {
      setMsg("Published to marketplace.");
      qc.invalidateQueries({
        queryKey: ["marketplace", "publishable", containerId],
      });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const grouped: Record<string, Asset[]> = assets.data ?? {};
  const capabilities = Object.keys(grouped);

  if (!canPublish) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        You don't have permission to publish to the marketplace.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {assets.isLoading ? (
        <div className="text-sm text-neutral-500">Loading assets…</div>
      ) : capabilities.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No publishable assets yet. Create offerings, upload templates, or add
          any capability's monetizable assets — they'll appear here to publish.
        </div>
      ) : (
        capabilities.map((cap) => {
          const section = CAP_SECTIONS[cap] ?? { label: cap, icon: "🔹" };
          const items = grouped[cap] ?? [];
          return (
            <div key={cap}>
              <div className="text-sm font-semibold text-black dark:text-white mb-2 flex items-center gap-2">
                <span>{section.icon}</span>
                {section.label}
                <span className="text-[10px] text-neutral-400 font-normal">
                  ({items.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col"
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium text-black dark:text-white">
                        {a.name}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {a.asset_kind}
                      </span>
                    </div>
                    {a.summary && (
                      <div className="text-[11px] text-neutral-400 mt-1 flex-1">
                        {a.summary}
                      </div>
                    )}
                    <div className="text-[11px] text-neutral-400 mt-2">
                      {a.value > 0
                        ? `${toMajor(a.value)} ${a.currency}${a.value_unit ? `/${a.value_unit}` : ""}`
                        : "Free"}
                    </div>
                    <div className="mt-3">
                      {a.is_listed ? (
                        <span className="text-[11px] text-green-600">
                          ✓ Listed
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              publish.mutate({
                                assetId: a.id,
                                visibility: "private",
                              })
                            }
                            className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700"
                          >
                            Publish (private)
                          </button>
                          <button
                            onClick={() =>
                              publish.mutate({
                                assetId: a.id,
                                visibility: "public",
                              })
                            }
                            className="px-2 py-1 text-[11px] rounded bg-black text-white dark:bg-white dark:text-black"
                          >
                            Public
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

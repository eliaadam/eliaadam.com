import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi as api, toMajor } from "./marketplace-api";
import BuyButton from "./BuyButton";

type Listing = {
  id: string;
  title: string;
  summary: string | null;
  price: number;
  currency: string;
  offering_type: string;
  seller_name: string | null;
  visibility: string;
  container_id: string;
};

/**
 * Discover — browse marketplace listings and buy. The Buy action is uniform; the
 * differing post-purchase interaction lives in My Orders (driven by fulfillment
 * type). Listings from every capability appear here (products, templates, apps…).
 */
export default function DiscoverPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const [q, setQ] = useState("");

  const listings = useQuery({
    queryKey: ["marketplace", "discover", containerId, q],
    queryFn: () => api("GET", `/containers/${containerId}/discover${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  });

  const list: Listing[] = Array.isArray(listings.data) ? listings.data : [];

  return (
    <div className="p-4 space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the marketplace…"
        className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-full max-w-sm"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {listings.isLoading ? (
          <div className="text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="text-sm text-neutral-500">Nothing here yet. Listings from any capability will appear as they're published.</div>
        ) : (
          list.map((l) => (
            <div key={l.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="text-sm font-medium text-black dark:text-white">{l.title}</div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{l.offering_type}</span>
              </div>
              {l.summary && <div className="text-[11px] text-neutral-400 mt-1 flex-1">{l.summary}</div>}
              {l.seller_name && <div className="text-[10px] text-neutral-400 mt-1">by {l.seller_name}</div>}
              <div className="mt-3">
                {l.container_id === containerId ? (
                  <span className="text-[11px] text-neutral-400">Your listing</span>
                ) : (
                  <BuyButton containerId={containerId} listing={l} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

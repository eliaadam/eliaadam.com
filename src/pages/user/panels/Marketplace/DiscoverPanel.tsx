import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi as api } from "./marketplace-api";
import MarketplaceCheckout from "./Marketplacecheckout";
 

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
 * Discover — browse marketplace listings and buy. Buying opens the dual-rail
 * checkout (pay from wallet balance, or via a USSD prompt) in a modal; the
 * differing post-purchase interaction still lives in My Orders (driven by
 * fulfillment type).
 */
export default function DiscoverPanel({
  containerId,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [checkout, setCheckout] = useState<Listing | null>(null);

  const listings = useQuery({
    queryKey: ["marketplace", "discover", containerId, q],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/discover${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      ),
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
          <div className="text-sm text-neutral-500">
            Nothing here yet. Listings from any capability will appear as
            they're published.
          </div>
        ) : (
          list.map((l) => (
            <div
              key={l.id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col"
            >
              <div className="flex items-start justify-between">
                <div className="text-sm font-medium text-black dark:text-white">
                  {l.title}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                  {l.offering_type}
                </span>
              </div>
              {l.summary && (
                <div className="text-[11px] text-neutral-400 mt-1 flex-1">
                  {l.summary}
                </div>
              )}
              {l.seller_name && (
                <div className="text-[10px] text-neutral-400 mt-1">
                  by {l.seller_name}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-black dark:text-white tabular-nums">
                  {(l.price / 100).toLocaleString()} {l.currency}
                </span>
                {l.container_id === containerId ? (
                  <span className="text-[11px] text-neutral-400">
                    Your listing
                  </span>
                ) : (
                  <button
                    onClick={() => setCheckout(l)}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout modal — dual-rail (wallet / USSD) for the selected listing. */}
      {checkout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCheckout(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-black dark:text-white m-0">
                  {checkout.title}
                </p>
                {checkout.seller_name && (
                  <p className="text-[11px] text-neutral-400 m-0">
                    by {checkout.seller_name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setCheckout(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <MarketplaceCheckout
              listingId={checkout.id}
              buyerContainerId={containerId}
              price={checkout.price}
              currency={checkout.currency}
              onPaid={() => {
                // Refresh orders so My Orders reflects the new purchase, then
                // close shortly after the success state shows.
                qc.invalidateQueries({ queryKey: ["marketplace", "orders"] });
                setTimeout(() => setCheckout(null), 1500);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

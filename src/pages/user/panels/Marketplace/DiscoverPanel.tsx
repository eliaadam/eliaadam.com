import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi as api, toMajor } from "./marketplace-api";

type Listing = {
  id: string;
  container_id: string;
  title: string;
  summary: string | null;
  price: number;
  currency: string;
  price_unit: string | null;
  offering_type: string;
  tangibility: string;
  visibility: string;
  seller_name: string | null;
  thumbnail_url: string | null;
};

/**
 * Discover — federated marketplace browse. Shows this container's own + its
 * ancestors' private listings, plus all public listings from any container.
 */
export default function DiscoverPanel({
  containerId,
}: {
  containerId: string;
  permissions: string[];
}) {
  const [scope, setScope] = useState<"all" | "public">("all");
  const [type, setType] = useState<string>("all");
  const [query, setQuery] = useState("");

  const listings = useQuery({
    queryKey: ["mkt", "discover", containerId, scope, type, query],
    queryFn: () => {
      const params = new URLSearchParams();
      if (scope === "public") params.set("scope", "public");
      if (type !== "all") params.set("offering_type", type);
      if (query.trim()) params.set("q", query.trim());
      const qs = params.toString();
      return api(
        "GET",
        `/containers/${containerId}/discover${qs ? `?${qs}` : ""}`,
      );
    },
  });

  const list: Listing[] = Array.isArray(listings.data) ? listings.data : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white flex-1 min-w-[160px]"
        />
        <div className="flex gap-1">
          {["all", "product", "service"].map((f) => (
            <button
              key={f}
              onClick={() => setType(f)}
              className={`px-3 py-1.5 text-xs rounded-md border ${type === f ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
            >
              {f === "all" ? "All" : f === "product" ? "Products" : "Services"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setScope(scope === "all" ? "public" : "all")}
          className={`px-3 py-1.5 text-xs rounded-md border ${scope === "public" ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
        >
          {scope === "public" ? "Public only" : "All I can see"}
        </button>
      </div>

      {listings.isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing here yet. Public listings from other containers and private
          listings shared with you will appear here.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((l) => (
            <div
              key={l.id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            >
              {l.thumbnail_url ? (
                <img
                  src={l.thumbnail_url}
                  alt={l.title}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-3xl">
                  {l.offering_type === "service" ? "🛎️" : "📦"}
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-black dark:text-white">
                    {l.title}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 whitespace-nowrap">
                    {l.visibility}
                  </span>
                </div>
                {l.summary && (
                  <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">
                    {l.summary}
                  </div>
                )}
                <div className="text-sm text-black dark:text-white mt-2">
                  {toMajor(l.price)} {l.currency}
                  {l.price_unit ? `/${l.price_unit}` : ""}
                </div>
                {l.seller_name && (
                  <div className="text-[11px] text-neutral-400 mt-1">
                    by {l.seller_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

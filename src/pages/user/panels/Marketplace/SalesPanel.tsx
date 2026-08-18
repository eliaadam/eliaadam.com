import { useQuery } from "@tanstack/react-query";
import { marketplaceApi as api, toMajor } from "./marketplace-api";

type Sale = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  fulfillment_type: string;
  buyer_container_id: string;
  created_at: string;
  metadata: any;
};

/**
 * Sales — orders a seller container has received. Shows the sale, its status, and
 * (once paid) the net proceeds after the platform fee, read from order metadata.
 */
export default function SalesPanel({
  containerId,
}: {
  containerId: string;
  permissions: string[];
}) {
  const sales = useQuery({
    queryKey: ["marketplace", "sales", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/sales`),
    refetchInterval: 5000,
  });

  const list: Sale[] = Array.isArray(sales.data) ? sales.data : [];

  function net(o: Sale): number | null {
    const m =
      typeof o.metadata === "string"
        ? (() => {
            try {
              return JSON.parse(o.metadata);
            } catch {
              return {};
            }
          })()
        : (o.metadata ?? {});
    return typeof m.net_to_seller === "number" ? m.net_to_seller : null;
  }

  return (
    <div className="p-4 space-y-3">
      {sales.isLoading ? (
        <div className="text-sm text-neutral-500">Loading sales…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No sales yet. Publish listings to start selling.
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {list.map((o) => {
            const n = net(o);
            return (
              <div
                key={o.id}
                className="flex items-center justify-between px-3 py-2.5"
              >
                <div>
                  <div className="text-sm text-black dark:text-white flex items-center gap-2">
                    {o.title}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      {o.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    buyer {o.buyer_container_id.slice(0, 8)} ·{" "}
                    {o.fulfillment_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-black dark:text-white">
                    {toMajor(o.amount)} {o.currency}
                  </div>
                  {n !== null && (
                    <div className="text-[10px] text-green-600">
                      net {toMajor(n)} {o.currency}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

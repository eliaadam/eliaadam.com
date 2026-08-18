import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi as api, marketplaceDownload, toMajor } from "./marketplace-api";

type Order = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: string;              // pending_payment | paid | fulfilling | fulfilled | payment_failed
  fulfillment_type: string;    // downloadable | installable | shippable | bookable | none
  fulfillment_status: string;  // pending | done | failed | not_required
  source_capability: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  fulfilled: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  paid: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  fulfilling: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  pending_payment: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  payment_failed: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

/**
 * My Orders — a buyer's purchases. The KEY behaviour: the post-purchase action
 * is driven by the order's fulfillment_type. A fulfilled downloadable order gets
 * a Download button; installable → Install; shippable → Track; etc. This is where
 * "different asset types interact differently" is visible to the user.
 */
export default function OrdersPanel({ containerId }: { containerId: string; permissions: string[] }) {
  const [msg, setMsg] = useState<string | null>(null);

  const orders = useQuery({
    queryKey: ["marketplace", "orders", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/orders`),
    refetchInterval: 5000,   // reflect settlement/fulfillment as it happens
  });

  const list: Order[] = Array.isArray(orders.data) ? orders.data : [];

  return (
    <div className="p-4 space-y-3">
      {msg && <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">{msg}</div>}

      {orders.isLoading ? (
        <div className="text-sm text-neutral-500">Loading orders…</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-neutral-500">No orders yet. Browse the marketplace to buy something.</div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {list.map((o) => (
            <div key={o.id} className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {o.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[o.status] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>
                    {o.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {o.amount > 0 ? `${toMajor(o.amount)} ${o.currency}` : "Free"}
                  {" · "}{o.fulfillment_type}
                </div>
              </div>
              <FulfillmentAction containerId={containerId} order={o} onMsg={setMsg} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The per-type action. This switch is the UI mirror of the server dispatcher. */
function FulfillmentAction({ containerId, order, onMsg }: { containerId: string; order: Order; onMsg: (m: string) => void }) {
  const ready = order.status === "fulfilled" || order.fulfillment_status === "done";

  if (order.status === "pending_payment") {
    return <span className="text-[11px] text-amber-600">Awaiting payment</span>;
  }
  if (order.status === "payment_failed") {
    return <span className="text-[11px] text-red-600">Payment failed</span>;
  }
  if (!ready) {
    return <span className="text-[11px] text-neutral-400">Processing…</span>;
  }

  switch (order.fulfillment_type) {
    case "downloadable":
      return (
        <button
          onClick={async () => {
            try { await marketplaceDownload(`/containers/${containerId}/orders/${order.id}/download`, order.title); }
            catch (e: any) { onMsg(e.message ?? "Download failed."); }
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
        >
          Download
        </button>
      );
    case "installable":
      return <span className="text-[11px] text-green-600">Ready to install (coming soon)</span>;
    case "shippable":
      return <span className="text-[11px] text-blue-600">Track delivery (coming soon)</span>;
    case "bookable":
      return <span className="text-[11px] text-blue-600">Schedule (coming soon)</span>;
    default:
      return <span className="text-[11px] text-green-600">✓ Complete</span>;
  }
}

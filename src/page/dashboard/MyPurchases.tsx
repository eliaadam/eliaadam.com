import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { sdk, type Purchase, type PurchaseStatus } from "../../lib/sdk";

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  completed: "bg-black text-white dark:bg-white dark:text-black",
  payment_failed:
    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  fulfillment_failed:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  completed: "completed",
  payment_failed: "payment failed",
  fulfillment_failed: "needs attention",
};

export function MyPurchases() {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ["surfacing", "my-purchases"],
    queryFn: () => sdk.surfacing.listMyPurchases(),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">My purchases</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Everything you've bought from the marketplace.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {purchases && purchases.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <ShoppingBag
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No purchases yet</p>
        </div>
      )}

      {purchases && purchases.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {purchases.map((p) => (
            <PurchaseRow key={p.id} purchase={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {(purchase.price_paid / 100).toFixed(2)} {purchase.currency}
        </p>
        {purchase.created_at && (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
            {new Date(purchase.created_at).toLocaleDateString()}
          </p>
        )}
        {purchase.status === "fulfillment_failed" && (
          <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
            Payment went through, but access wasn't granted. Contact the seller.
          </p>
        )}
      </div>
      <span
        className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[purchase.status]}`}
      >
        {STATUS_LABELS[purchase.status]}
      </span>
    </li>
  );
}

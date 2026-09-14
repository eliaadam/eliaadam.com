import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { sdk } from "../../../lib/sdk";
import type { PayoutStatus } from "../../../lib/sdk/domains/payment";
import { useContainer } from "../../../components/context/ContainerContext";
import { PayoutStatusPanel } from "../../../components/payment/PayoutStatusPanel";

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  partially_succeeded:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/**
 * FIX (by construction): the old Payment.tsx navigated a payout row
 * to `/dashboard/payment/payouts/:id` — a route that never existed in
 * App.tsx at all, confirmed directly. Selecting here just sets
 * `?payout=<id>` instead, rendering PayoutStatusPanel inline; there's
 * no separate route left to be missing.
 */
export function PayoutsTab() {
  const { currentContainerId } = useContainer();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPayoutId = searchParams.get("payout");

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["payment", "payouts", currentContainerId],
    queryFn: () => sdk.payment.listPayouts(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const selectPayout = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("payout", id);
    setSearchParams(next);
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("payout");
    setSearchParams(next);
  };

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  if (selectedPayoutId) {
    return (
      <PayoutStatusPanel payoutId={selectedPayoutId} onClose={clearSelection} />
    );
  }

  return (
    <div>
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}
      {payouts && payouts.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
          No payouts yet.
        </p>
      )}
      {payouts && payouts.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {payouts.map((payout) => (
            <li key={payout.id}>
              <button
                type="button"
                onClick={() => selectPayout(payout.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {payout.narration}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {formatAmount(payout.amount, payout.currency)} ·{" "}
                    {payout.destination_type === "bank"
                      ? "Bank"
                      : "Mobile money"}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${PAYOUT_STATUS_STYLES[payout.status]}`}
                >
                  {payout.status.replace("_", " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

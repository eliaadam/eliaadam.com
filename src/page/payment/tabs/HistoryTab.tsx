import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { sdk, type PaymentIntentStatus } from "../../../lib/sdk";
import { useContainer } from "../../../components/context/ContainerContext";
import { IntentStatusPanel } from "../../../components/payment/IntentStatusPanel";

const STATUS_STYLES: Record<PaymentIntentStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  refunded:
    "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400",
};

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/**
 * The old separate `/dashboard/payment/:intentId` route, folded in
 * here — selecting a row sets `?intent=<id>` (alongside this page's
 * own `?tab=history`) instead of navigating away, so the detail view
 * (IntentStatusPanel, same component now shared with PayTab) renders
 * inline, in place of the list, without leaving this tab. Still
 * bookmarkable/shareable via that query param, same as any other
 * URL-driven tab state in this app.
 */
export function HistoryTab() {
  const { currentContainerId } = useContainer();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIntentId = searchParams.get("intent");

  const { data: intents, isLoading } = useQuery({
    queryKey: ["payment", "intents", currentContainerId],
    queryFn: () => sdk.payment.listIntents(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const selectIntent = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("intent", id);
    setSearchParams(next);
  };

  const clearSelection = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("intent");
    setSearchParams(next);
  };

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  if (selectedIntentId) {
    return (
      <IntentStatusPanel intentId={selectedIntentId} onClose={clearSelection} />
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
      {intents && intents.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
          No payments yet.
        </p>
      )}
      {intents && intents.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {intents.map((intent) => (
            <li key={intent.id}>
              <button
                type="button"
                onClick={() => selectIntent(intent.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {intent.description}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {formatAmount(intent.amount, intent.currency)} ·{" "}
                    {intent.gateway}
                  </p>
                </div>
                <span
                  className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[intent.status]}`}
                >
                  {intent.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

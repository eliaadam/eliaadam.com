import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { sdk, type Subscription, type SubscriptionStatus } from "../../lib/sdk";

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  trialing:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  active: "bg-black text-white dark:bg-white dark:text-black",
  past_due:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  canceled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export function MySubscriptions() {
  const queryClient = useQueryClient();

  const { data: subs, isLoading } = useQuery({
    queryKey: ["subscription", "my-subscriptions"],
    queryFn: () => sdk.subscription.listMySubscriptions(),
  });

  const { data: plans } = useQuery({
    queryKey: [
      "subscription",
      "plans-for-my-subscriptions",
      subs?.map((s) => s.plan_id),
    ],
    queryFn: async () => {
      const ids = Array.from(new Set(subs!.map((s) => s.plan_id)));
      const results = await Promise.all(
        ids.map((id) => sdk.subscription.getPlan(id)),
      );
      return Object.fromEntries(results.map((p) => [p.id, p]));
    },
    enabled: Boolean(subs && subs.length > 0),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => sdk.subscription.cancelSubscription(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["subscription", "my-subscriptions"],
      }),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-semibold tracking-tight">My subscriptions</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Every plan you've subscribed to, and its current status.
      </p>

      {isLoading && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {subs && subs.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Star
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No subscriptions yet</p>
        </div>
      )}

      {subs && subs.length > 0 && (
        <ul className="mt-4 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {subs.map((sub) => (
            <SubscriptionRow
              key={sub.id}
              sub={sub}
              planName={plans?.[sub.plan_id]?.name}
              onCancel={() => cancelMutation.mutate(sub.id)}
              isCanceling={
                cancelMutation.isPending && cancelMutation.variables === sub.id
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubscriptionRow({
  sub,
  planName,
  onCancel,
  isCanceling,
}: {
  sub: Subscription;
  planName: string | undefined;
  onCancel: () => void;
  isCanceling: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {planName ?? sub.plan_id}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
          {sub.status === "past_due" &&
            `Payment failed ${sub.failed_charge_count}x — `}
          {sub.next_billing_at &&
            sub.status !== "canceled" &&
            `Next billing ${new Date(sub.next_billing_at).toLocaleDateString()}`}
          {sub.status === "canceled" &&
            sub.canceled_at &&
            `Canceled ${new Date(sub.canceled_at).toLocaleDateString()}`}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[sub.status]}`}
        >
          {sub.status.replace("_", " ")}
        </span>
        {sub.status !== "canceled" && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCanceling}
            className="text-xs font-medium text-neutral-500 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
          >
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}

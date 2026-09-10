import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { sdk, type PayoutLegStatus, type PayoutStatus } from "../../lib/sdk";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

const STATUS_STYLES: Record<PayoutStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  partially_succeeded:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const LEG_STATUS_STYLES: Record<PayoutLegStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

function destinationSummary(destination: {
  bank?: { code: string; number: string };
  mobile_money?: { country: string; network: string; msisdn: string };
  account_name?: string;
}): string {
  if (destination.bank) {
    return `Bank ${destination.bank.code} · ${destination.bank.number}`;
  }
  if (destination.mobile_money) {
    const mm = destination.mobile_money;
    return `${mm.network} (${mm.country}) · ${mm.msisdn}`;
  }
  return "—";
}

/**
 * `"partially_succeeded"` isn't necessarily final — some legs may
 * still be `"processing"`. "Submit" (covering whatever's left) and
 * "Check status" (re-querying in-flight legs) are both always shown
 * whenever there's a reason to — see the two `useMutation`s below and
 * the button visibility rules next to them for exactly when each
 * applies.
 */
export function PayoutDetail() {
  const { payoutId } = useParams<{ payoutId: string }>();
  const queryClient = useQueryClient();

  const { data: payout, isLoading } = useQuery({
    queryKey: ["payment", "payout", payoutId],
    queryFn: () => sdk.payment.getPayout(payoutId!),
    enabled: Boolean(payoutId),
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ||
      query.state.data?.status === "partially_succeeded"
        ? 4000
        : false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payment", "payout", payoutId] });

  const submitMutation = useMutation({
    mutationFn: () => sdk.payment.submitPayout(payoutId!),
    onSuccess: invalidate,
  });

  const reconcileMutation = useMutation({
    mutationFn: () => sdk.payment.reconcilePayout(payoutId!),
    onSuccess: invalidate,
  });

  if (isLoading || !payout) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  const succeededAmount = payout.legs
    .filter((l) => l.status === "succeeded")
    .reduce((sum, l) => sum + l.amount, 0);
  const hasShortfall = succeededAmount < payout.amount && payout.status !== "succeeded";
  const hasProcessingLeg = payout.legs.some((l) => l.status === "processing");

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/payment"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to payments
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">{payout.narration}</h1>
      <p className="mt-1 text-2xl font-semibold">
        {formatAmount(payout.amount, payout.currency)}
      </p>
      {payout.status === "partially_succeeded" && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {formatAmount(succeededAmount, payout.currency)} has gone out so far.
        </p>
      )}

      <dl className="mt-4 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Status</dt>
          <dd>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[payout.status]}`}
            >
              {payout.status.replace("_", " ")}
            </span>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Destination</dt>
          <dd className="font-medium">{destinationSummary(payout.destination)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        {hasShortfall && (
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {submitMutation.isPending
              ? "Submitting…"
              : payout.legs.length === 0
                ? "Submit payout"
                : "Cover remaining amount"}
          </button>
        )}
        {hasProcessingLeg && (
          <button
            type="button"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            {reconcileMutation.isPending ? "Checking…" : "Check status now"}
          </button>
        )}
      </div>

      {submitMutation.isError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Couldn't cover this right now — no configured gateway currently has
          enough float. Try again shortly.
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold tracking-tight">
        Breakdown by gateway
      </h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
        A cashout may be split across more than one gateway if a single rail
        doesn't currently hold enough float to cover it — each row below is
        one such attempt.
      </p>

      {payout.legs.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          Not submitted yet.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {payout.legs.map((leg) => (
            <li key={leg.id} className="flex flex-col gap-1 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">
                  {leg.gateway}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatAmount(leg.amount, payout.currency)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEG_STATUS_STYLES[leg.status]}`}
                  >
                    {leg.status}
                  </span>
                </div>
              </div>
              {leg.gateway_reference && (
                <p className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
                  {leg.gateway_reference}
                </p>
              )}
              {leg.failure_reason && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {leg.failure_reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

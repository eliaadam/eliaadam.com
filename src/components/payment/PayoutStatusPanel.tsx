import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type {
  PayoutStatus,
  PayoutLegStatus,
} from "../../lib/sdk/domains/payment";

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

const RECONCILE_INTERVAL_MS = 4000;
const RECONCILE_MAX_ATTEMPTS = 30;

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
 * Extracted from the old standalone PayoutDetail PAGE — same
 * reconcile-driven auto-poll fix (keyed off `hasProcessingLeg`, not
 * the looser parent-status check the original refetchInterval used —
 * see that fix's own history for why that distinction matters), now
 * embedded inline in PayoutsTab instead of routed to a URL that, in
 * this app, never actually existed (Payment.tsx linked to
 * `/dashboard/payment/payouts/:id`, but App.tsx had no matching
 * route — this component fixes that by construction, since it's
 * never reached via navigation at all anymore).
 */
export function PayoutStatusPanel({
  payoutId,
  onClose,
}: {
  payoutId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [autoReconcileGaveUp, setAutoReconcileGaveUp] = useState(false);
  const reconcileAttempts = useRef(0);

  const { data: payout, isLoading } = useQuery({
    queryKey: ["payment", "payout", payoutId],
    queryFn: () => sdk.payment.getPayout(payoutId),
    enabled: Boolean(payoutId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "payout", payoutId],
    });
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["payment", "payouts"] });

  const submitMutation = useMutation({
    mutationFn: () => sdk.payment.submitPayout(payoutId),
    onSuccess: () => {
      invalidate();
      invalidateList();
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () => sdk.payment.reconcilePayout(payoutId),
    onSuccess: () => {
      invalidate();
      invalidateList();
    },
  });

  const hasProcessingLeg = Boolean(
    payout?.legs.some((l) => l.status === "processing"),
  );

  useEffect(() => {
    reconcileAttempts.current = 0;
    setAutoReconcileGaveUp(false);
  }, [payoutId, hasProcessingLeg]);

  useEffect(() => {
    if (!payoutId || !hasProcessingLeg) return;
    if (reconcileAttempts.current >= RECONCILE_MAX_ATTEMPTS) return;

    const timer = setInterval(() => {
      reconcileAttempts.current += 1;
      sdk.payment
        .reconcilePayout(payoutId)
        .then(() => {
          invalidate();
          invalidateList();
        })
        .catch(() => {})
        .finally(() => {
          if (reconcileAttempts.current >= RECONCILE_MAX_ATTEMPTS) {
            setAutoReconcileGaveUp(true);
          }
        });
    }, RECONCILE_INTERVAL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutId, hasProcessingLeg]);

  if (isLoading || !payout) {
    return (
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      </div>
    );
  }

  const succeededAmount = payout.legs
    .filter((l) => l.status === "succeeded")
    .reduce((sum, l) => sum + l.amount, 0);
  const hasShortfall =
    succeededAmount < payout.amount && payout.status !== "succeeded";

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            {payout.narration}
          </h3>
          <p className="mt-0.5 text-xl font-semibold">
            {formatAmount(payout.amount, payout.currency)}
          </p>
          {payout.status === "partially_succeeded" && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {formatAmount(succeededAmount, payout.currency)} has gone out so
              far.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex-none text-neutral-400 hover:text-black dark:hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
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
          <dt className="text-neutral-500 dark:text-neutral-500">
            Destination
          </dt>
          <dd className="font-medium">
            {destinationSummary(payout.destination)}
          </dd>
        </div>
      </dl>

      {hasProcessingLeg && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-500">
          {autoReconcileGaveUp
            ? "Still processing — check again if you know the transfer went through."
            : "Waiting on a gateway to confirm — this checks automatically."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
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

      <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-500">
        Breakdown by gateway
      </h4>

      {payout.legs.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
          Not submitted yet.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {payout.legs.map((leg) => (
            <li key={leg.id} className="flex flex-col gap-1 px-4 py-3">
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

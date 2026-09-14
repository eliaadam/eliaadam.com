import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { CollectPaymentPanel } from "../../components/payment/CollectPaymentPanel";
import { NextActionPanel } from "../../components/payment/NextActionPanel";
import type { NextAction } from "../../lib/sdk/domains/payment";
import { sdk } from "../../lib/sdk";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

// Auto-reconcile cadence + give-up point. 4s to match the interval
// this file already used for its own (previously ineffective)
// refetchInterval. Gives up after 2 minutes of real attempts — a
// USSD/PIN prompt that hasn't resolved by then almost certainly needs
// the buyer to actually act on their phone, not more polling; "Check
// status now" stays available as a manual fallback forever after
// that, it just stops firing automatically.
const RECONCILE_INTERVAL_MS = 4000;
const RECONCILE_MAX_ATTEMPTS = 30;

/**
 * `nextAction` lives in local state, not in the fetched `intent` —
 * it's ephemeral (see `lib/sdk/payment.ts`'s own note on `NextAction`)
 * and only ever comes from the response of `initiateIntent()` or
 * `continueAuthorization()`, both wired up below via `CollectPaymentPanel`
 * and `NextActionPanel`. A page reload mid-flow loses it; "Check
 * status now" still resolves the underlying charge, just without
 * re-showing the specific prompt.
 */
export function PaymentIntentDetail() {
  const { intentId } = useParams<{ intentId: string }>();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [autoReconcileGaveUp, setAutoReconcileGaveUp] = useState(false);
  const reconcileAttempts = useRef(0);

  const { data: intent, isLoading } = useQuery({
    queryKey: ["payment", "intent", intentId],
    // FIX: this used to also carry `refetchInterval` re-running THIS
    // SAME plain read every 4s while "processing" — a passive
    // re-fetch of whatever the database already says, which never
    // changes on its own since the webhook path doesn't work in this
    // deployment (confirmed separately). Nothing here ever moved the
    // status forward automatically; only a manual "Check status now"
    // click (which calls reconcileIntent(), the ACTIVE "ask Selcom"
    // call) ever did. Replaced by the reconcile-driven effect below,
    // which is the thing that actually needs to run on an interval.
    queryFn: () => sdk.payment.getIntent(intentId!),
    enabled: Boolean(intentId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "intent", intentId],
    });

  const refundMutation = useMutation({
    mutationFn: () => sdk.payment.refundIntent(intentId!, refundReason),
    onSuccess: () => {
      setShowRefund(false);
      invalidate();
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () => sdk.payment.reconcileIntent(intentId!),
    onSuccess: invalidate,
  });

  // Auto-reconcile — actually asks Selcom (via reconcileIntent(), not
  // a passive re-read) every RECONCILE_INTERVAL_MS while the intent
  // is "processing", so the buyer's own payment resolves in front of
  // them without needing to click anything. Resets its own attempt
  // counter and give-up state whenever the intent id or its status
  // changes (e.g. navigating between two different intents, or a
  // status genuinely moving out of "processing").
  useEffect(() => {
    reconcileAttempts.current = 0;
    setAutoReconcileGaveUp(false);
  }, [intentId, intent?.status]);

  useEffect(() => {
    if (!intentId || intent?.status !== "processing") return;
    if (reconcileAttempts.current >= RECONCILE_MAX_ATTEMPTS) return;

    const timer = setInterval(() => {
      reconcileAttempts.current += 1;
      sdk.payment
        .reconcileIntent(intentId)
        .then(invalidate)
        .catch(() => {
          // A transient network/API error on ONE poll shouldn't kill
          // the whole loop — just let the next tick try again. The
          // attempt counter still advances either way, so a
          // genuinely broken connection still eventually gives up
          // rather than polling forever.
        })
        .finally(() => {
          if (reconcileAttempts.current >= RECONCILE_MAX_ATTEMPTS) {
            setAutoReconcileGaveUp(true);
          }
        });
    }, RECONCILE_INTERVAL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentId, intent?.status]);

  if (isLoading || !intent) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/payment"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to payments
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        {intent.description}
      </h1>
      <p className="mt-1 text-2xl font-semibold">
        {formatAmount(intent.amount, intent.currency)}
      </p>

      <dl className="mt-4 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Status</dt>
          <dd className="font-medium">{intent.status}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Gateway</dt>
          <dd className="font-medium">{intent.gateway}</dd>
        </div>
        {intent.gateway_reference && (
          <div className="flex justify-between">
            <dt className="text-neutral-500 dark:text-neutral-500">
              Reference
            </dt>
            <dd className="font-mono text-xs">{intent.gateway_reference}</dd>
          </div>
        )}
        {intent.failure_reason && (
          <div className="flex justify-between">
            <dt className="text-neutral-500 dark:text-neutral-500">Reason</dt>
            <dd className="font-medium text-red-600 dark:text-red-400">
              {intent.failure_reason}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        {intent.status === "pending" && (
          <CollectPaymentPanel
            intent={intent}
            onResult={(result) => {
              setNextAction(result.next_action);
              invalidate();
            }}
          />
        )}

        {intent.status === "processing" && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-500 dark:text-neutral-500">
              {autoReconcileGaveUp
                ? "Still processing — check again if you know the payment went through."
                : "Waiting for the payment to complete — this checks automatically."}
            </p>
            <button
              type="button"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
              className="self-start rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              {reconcileMutation.isPending ? "Checking…" : "Check status now"}
            </button>
          </div>
        )}

        {intent.status === "succeeded" && (
          <button
            type="button"
            onClick={() => setShowRefund((v) => !v)}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Refund
          </button>
        )}
      </div>

      <NextActionPanel
        intentId={intent.id}
        nextAction={nextAction}
        onResolved={(result) => {
          setNextAction(result.next_action);
          invalidate();
        }}
      />

      {showRefund && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            refundMutation.mutate();
          }}
          className="mt-4 flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <input
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Reason for refund"
            required
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <button
            type="submit"
            disabled={refundMutation.isPending}
            className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {refundMutation.isPending ? "Refunding…" : "Confirm refund"}
          </button>
        </form>
      )}
    </div>
  );
}

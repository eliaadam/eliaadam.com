import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { CollectPaymentPanel } from "./CollectPaymentPanel";
import { NextActionPanel } from "./NextActionPanel";
import type { NextAction } from "../../lib/sdk/domains/payment";
import { sdk } from "../../lib/sdk";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

// Same cadence/give-up point as the original PaymentIntentDetail fix
// this was extracted from — see that history for the full reasoning.
const RECONCILE_INTERVAL_MS = 4000;
const RECONCILE_MAX_ATTEMPTS = 30;

/**
 * The single, shared "watch an intent resolve" view — extracted from
 * the old standalone PaymentIntentDetail PAGE so it can be embedded
 * inline in two places without duplicating the reconcile-polling
 * logic: right after PayTab creates+initiates a new intent, and when
 * HistoryTab's list is used to revisit an older one. Takes an
 * `onClose` instead of routing back — this never owns its own URL,
 * the parent tab does.
 *
 * `status === "pending"` is handled here as a genuine fallback, not
 * the expected path — under the new combined flow, PayTab always
 * chains create+initiate together, so a freshly-created intent should
 * never actually reach this component still "pending". An intent CAN
 * still land here pending, though: one created before this change
 * shipped, or one where initiateIntent() itself failed right after
 * createIntent() succeeded. CollectPaymentPanel stays wired up for
 * exactly that case, unchanged from the old page.
 */
export function IntentStatusPanel({
  intentId,
  onClose,
  initialNextAction = null,
}: {
  intentId: string;
  onClose: () => void;
  initialNextAction?: NextAction | null;
}) {
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [nextAction, setNextAction] = useState<NextAction | null>(
    initialNextAction,
  );
  const [autoReconcileGaveUp, setAutoReconcileGaveUp] = useState(false);
  const reconcileAttempts = useRef(0);

  const { data: intent, isLoading } = useQuery({
    queryKey: ["payment", "intent", intentId],
    queryFn: () => sdk.payment.getIntent(intentId),
    enabled: Boolean(intentId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "intent", intentId],
    });

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ["payment", "intents"] });
    queryClient.invalidateQueries({ queryKey: ["payment", "wallets"] });
  };

  const refundMutation = useMutation({
    mutationFn: () => sdk.payment.refundIntent(intentId, refundReason),
    onSuccess: () => {
      setShowRefund(false);
      invalidate();
      invalidateLists();
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () => sdk.payment.reconcileIntent(intentId),
    onSuccess: () => {
      invalidate();
      invalidateLists();
    },
  });

  useEffect(() => {
    reconcileAttempts.current = 0;
    setAutoReconcileGaveUp(false);
  }, [intentId, intent?.status]);

  useEffect(() => {
    if (intent?.status !== "processing") return;
    if (reconcileAttempts.current >= RECONCILE_MAX_ATTEMPTS) return;

    const timer = setInterval(() => {
      reconcileAttempts.current += 1;
      sdk.payment
        .reconcileIntent(intentId)
        .then(() => {
          invalidate();
          invalidateLists();
        })
        .catch(() => {
          // A transient error on one poll shouldn't kill the loop.
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
      <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            {intent.description}
          </h3>
          <p className="mt-0.5 text-xl font-semibold">
            {formatAmount(intent.amount, intent.currency)}
          </p>
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

      <div className="mt-4">
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

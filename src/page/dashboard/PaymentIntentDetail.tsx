import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { sdk } from "../../lib/sdk";

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/**
 * `checkout_url` is only meaningful for redirect-based gateways
 * (Flutterwave). Selcom's `initiate()` deliberately returns
 * `checkout_url: null` — it pushes a USSD prompt straight to the
 * buyer's phone instead, so the right UI there is "check your phone,"
 * not a link.
 */
export function PaymentIntentDetail() {
  const { intentId } = useParams<{ intentId: string }>();
  const queryClient = useQueryClient();
  const [refundReason, setRefundReason] = useState("");
  const [showRefund, setShowRefund] = useState(false);

  const { data: intent, isLoading } = useQuery({
    queryKey: ["payment", "intent", intentId],
    queryFn: () => sdk.payment.getIntent(intentId!),
    enabled: Boolean(intentId),
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 4000 : false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["payment", "intent", intentId],
    });

  const initiateMutation = useMutation({
    mutationFn: () => sdk.payment.initiateIntent(intentId!),
    onSuccess: invalidate,
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

      <div className="mt-6 flex flex-wrap gap-2">
        {intent.status === "pending" && (
          <button
            type="button"
            onClick={() => initiateMutation.mutate()}
            disabled={initiateMutation.isPending}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {initiateMutation.isPending ? "Starting…" : "Collect payment"}
          </button>
        )}
        {intent.status === "processing" && (
          <button
            type="button"
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            {reconcileMutation.isPending ? "Checking…" : "Check status now"}
          </button>
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

      {initiateMutation.data?.checkout_url && (
        <a
          href={initiateMutation.data.checkout_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          <ExternalLink size={14} />
          Continue to payment
        </a>
      )}
      {intent.status === "processing" &&
        intent.gateway === "selcom" &&
        !initiateMutation.data?.checkout_url && (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            A prompt was sent to {intent.buyer_phone || "the buyer's phone"} —
            waiting for them to approve it.
          </p>
        )}

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

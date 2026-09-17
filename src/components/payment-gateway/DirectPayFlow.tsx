import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { sdk } from "../../lib/sdk";
import type { DirectPaymentRequest } from "../../lib/sdk/domains/paymentGateway";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

/**
 * Shared "pay direct, no wallet" flow — submit a phone number, create
 * the direct-pay request, then poll until it resolves. Used by both
 * Marketplace's BuyForm and Subscription's SubscribeForm, since the
 * underlying async shape (submit -> processing -> resolved, with a
 * separate follow-up "did purchase()/subscribe() actually succeed"
 * outcome once payment clears) is identical for both — only WHAT
 * gets called to start it differs, passed in as `onSubmit`.
 */
export function DirectPayFlow({
  onSubmit,
  successLabel,
  invalidateKeys,
}: {
  onSubmit: (buyerPhone: string) => Promise<DirectPaymentRequest>;
  successLabel: string;
  invalidateKeys: string[][];
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () => onSubmit(phone),
    onSuccess: (result) => setRequestId(result.id),
  });

  const { data: tracked } = useQuery({
    queryKey: ["payment-gateway", "direct-payment-request", requestId],
    queryFn: () => sdk.paymentGateway.getDirectPaymentRequest(requestId!),
    enabled: Boolean(requestId),
    refetchInterval: (query) => (query.state.data?.completed ? false : 3000),
  });

  // Fires exactly once, only on the real transition to completed=true
  // — never on every render, and never as a render-body side effect.
  useEffect(() => {
    if (tracked?.completed) {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracked?.completed]);

  if (tracked?.completed) {
    const result = tracked.result as
      | { error: string }
      | { purchase_id?: string; subscription_id?: string; status: string }
      | null;

    if (result && "error" in result) {
      return (
        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          <span>
            Payment succeeded, but something went wrong finishing it up. Contact
            support with request id {tracked.id}.
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-1.5 text-xs text-black dark:text-white">
        <CheckCircle2 size={14} className="mt-0.5 flex-none" />
        <span>{successLabel}</span>
      </div>
    );
  }

  if (tracked && !tracked.completed && tracked.status === "failed") {
    return (
      <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
        <AlertTriangle size={14} className="mt-0.5 flex-none" />
        <span>The payment didn't go through. Nothing was charged.</span>
      </div>
    );
  }

  if (requestId) {
    return (
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Waiting for payment confirmation
        {tracked?.status === "processing" ? " — check your phone" : "…"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        className={inputClass}
        type="tel"
        placeholder="Phone number (e.g. 0767104594)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        type="button"
        onClick={() => submitMutation.mutate()}
        disabled={!phone || submitMutation.isPending}
        className={`self-start ${primaryButtonClass}`}
      >
        {submitMutation.isPending ? "Starting…" : "Pay with mobile money"}
      </button>
      {submitMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't start the payment. Try again.
        </p>
      )}
    </div>
  );
}

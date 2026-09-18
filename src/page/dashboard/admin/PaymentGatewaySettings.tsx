import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  GatewayRoutingPolicy,
  PayoutFeePolicy,
} from "../../../lib/sdk/domains/paymentGateway";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const METHOD_TYPE_OPTIONS = [
  { value: "", label: "Any method" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card" },
];

const DESTINATION_TYPE_OPTIONS = [
  { value: "", label: "Any destination" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank", label: "Bank" },
];

/**
 * Platform-admin only (core.payment_gateway.policy.manage) —
 * extracted from PaymentGateway.tsx's own former "Settings" tab into
 * its own AdminHub-linked page, same reasoning as
 * PaymentGatewayApprovals.tsx's own docstring: this is a platform-
 * wide concern, not something scoped to whichever container a normal
 * user happens to have selected.
 */
export function PaymentGatewaySettings() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">
        Payment gateway settings
      </h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Platform-wide gateway routing and payout fee rules.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <GatewayRoutingSettings />
        <PayoutFeeSettings />
      </div>
    </div>
  );
}

function GatewayRoutingSettings() {
  const queryClient = useQueryClient();
  const [methodType, setMethodType] = useState("");
  const [currency, setCurrency] = useState("");
  const [gateway, setGateway] = useState<"selcom" | "flutterwave">("selcom");

  const {
    data: policies,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-gateway", "gateway-routing-policies"],
    queryFn: () => sdk.paymentGateway.listGatewayRoutingPolicies(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.paymentGateway.setGatewayRoutingPolicy({
        method_type: methodType || undefined,
        currency: currency ? currency.toUpperCase() : undefined,
        gateway,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment-gateway", "gateway-routing-policies"],
      });
      setCurrency("");
    },
  });

  if (isError) {
    return (
      <section>
        <h2 className="text-sm font-semibold tracking-tight">
          Gateway routing
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          You don't have permission to view or change gateway routing.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">Gateway routing</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Which gateway auto-resolves for a payment method and currency, when the
        caller doesn't specify one explicitly. A rule with "Any" for either
        field applies to everything not covered by a more specific one below it.
      </p>

      {isLoading && (
        <div className="mt-3 h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      )}

      {policies && policies.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {policies.map((p: GatewayRoutingPolicy) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <span>
                {p.method_type ?? "Any method"} · {p.currency ?? "Any currency"}
              </span>
              <span className="font-medium capitalize">{p.gateway}</span>
            </li>
          ))}
        </ul>
      )}

      {policies && policies.length === 0 && !isLoading && (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          No rules configured — routing falls back to the platform's own default
          for everything.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Method
          </label>
          <select
            className={inputClass}
            value={methodType}
            onChange={(e) => setMethodType(e.target.value)}
          >
            {METHOD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={`${inputClass} w-28`}
            placeholder="Any (TZS…)"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Gateway
          </label>
          <select
            className={inputClass}
            value={gateway}
            onChange={(e) =>
              setGateway(e.target.value as "selcom" | "flutterwave")
            }
          >
            <option value="selcom">Selcom</option>
            <option value="flutterwave">Flutterwave</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save rule"}
        </button>
      </form>
    </section>
  );
}

function PayoutFeeSettings() {
  const queryClient = useQueryClient();
  const [destinationType, setDestinationType] = useState("");
  const [currency, setCurrency] = useState("");
  const [flatFee, setFlatFee] = useState("0");
  const [percentage, setPercentage] = useState("0");

  const {
    data: policies,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-gateway", "payout-fee-policies"],
    queryFn: () => sdk.paymentGateway.listPayoutFeePolicies(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.paymentGateway.setPayoutFeePolicy({
        destination_type: destinationType || undefined,
        currency: currency ? currency.toUpperCase() : undefined,
        flat_fee: Math.round(Number(flatFee) * 100) || 0,
        percentage_bps: Math.round(Number(percentage) * 100) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment-gateway", "payout-fee-policies"],
      });
      setCurrency("");
      setFlatFee("0");
      setPercentage("0");
    },
  });

  if (isError) {
    return (
      <section>
        <h2 className="text-sm font-semibold tracking-tight">Payout fees</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          You don't have permission to view or change payout fees.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight">Payout fees</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Deducted from a payout's own requested amount before it's submitted —
        the requester always sees exactly what they'll receive. The fee only
        moves to the platform once a payout is confirmed fully succeeded, never
        on a partial or failed one.
      </p>

      {isLoading && (
        <div className="mt-3 h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      )}

      {policies && policies.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {policies.map((p: PayoutFeePolicy) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <span>
                {p.destination_type ?? "Any destination"} ·{" "}
                {p.currency ?? "Any currency"}
              </span>
              <span className="font-medium">
                {(p.flat_fee / 100).toFixed(2)} flat +{" "}
                {(p.percentage_bps / 100).toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {policies && policies.length === 0 && !isLoading && (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          No fee rules configured — payouts are settled with no fee deducted.
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Destination
          </label>
          <select
            className={inputClass}
            value={destinationType}
            onChange={(e) => setDestinationType(e.target.value)}
          >
            {DESTINATION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={`${inputClass} w-28`}
            placeholder="Any (TZS…)"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Flat fee
          </label>
          <input
            className={`${inputClass} w-24`}
            type="number"
            min="0"
            step="0.01"
            value={flatFee}
            onChange={(e) => setFlatFee(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Percentage
          </label>
          <input
            className={`${inputClass} w-24`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save rule"}
        </button>
      </form>
    </section>
  );
}

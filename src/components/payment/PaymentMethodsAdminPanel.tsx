import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import { ApiError } from "../../lib/query/Api";

const cardClass = "rounded-lg border border-neutral-200 dark:border-neutral-800";
const badgeClass =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium";
const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

/**
 * The informed-configuration surface: shows each method the currently-
 * configured gateway DECLARES, with an "implemented" badge so an admin
 * doesn't accidentally enable something with nothing working behind
 * it yet — but doesn't stop them either, since enabling ahead of a
 * launch is a legitimate choice.
 */
export function PaymentMethodsAdminPanel({ containerId, purpose }: { containerId: string; purpose: string }) {
  const queryClient = useQueryClient();
  const { data: options, isLoading, isError, error } = useQuery({
    queryKey: ["payment-admin-options", containerId, purpose],
    queryFn: () => sdk.paymentMethods.listAdminOptions(containerId, purpose),
  });
  const [pending, setPending] = useState<Set<string> | null>(null);

  const save = useMutation({
    mutationFn: (methodCodes: string[]) => sdk.paymentMethods.setEnabledMethods(containerId, purpose, methodCodes),
    onSuccess: () => { setPending(null); queryClient.invalidateQueries({ queryKey: ["payment-admin-options", containerId, purpose] }); },
  });

  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {error instanceof ApiError ? error.message : "Couldn't load payment method configuration."}
        {error instanceof ApiError && error.message.toLowerCase().includes("no payment gateway") && " Set a gateway for this purpose first."}
      </p>
    );
  }
  if (!options || options.length === 0) return <p className="text-sm text-neutral-500">The configured gateway doesn't declare any payment methods.</p>;

  const current = pending ?? new Set(options.filter((o) => o.enabled).map((o) => o.method_code));
  const toggle = (code: string) => {
    const next = new Set(current);
    next.has(code) ? next.delete(code) : next.add(code);
    setPending(next);
  };

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Offer</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={o.method_code} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
              <td className="px-3 py-2">
                <input type="checkbox" checked={current.has(o.method_code)} onChange={() => toggle(o.method_code)} />
              </td>
              <td className="px-3 py-2 font-medium">{o.label}</td>
              <td className="px-3 py-2">
                {o.implemented ? (
                  <span className={`${badgeClass} bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400`}>Implemented</span>
                ) : (
                  <span className={`${badgeClass} bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400`}>Not yet implemented</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-neutral-200 p-3 dark:border-neutral-800">
        <p className="text-xs text-neutral-400">
          "Not yet implemented" methods can still be enabled — customers will just be asked to try another method if they pick one.
        </p>
        <button type="button" className={primaryButtonClass} disabled={!pending || save.isPending} onClick={() => save.mutate(Array.from(current))}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      {save.isError && (
        <p className="px-3 pb-3 text-xs text-red-600 dark:text-red-400">
          {save.error instanceof ApiError ? save.error.message : "Couldn't save."}
        </p>
      )}
    </div>
  );
}

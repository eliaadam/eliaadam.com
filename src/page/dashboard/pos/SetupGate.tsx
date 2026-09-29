import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import {
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "./ui";

const COMMON_CURRENCIES = ["TZS", "USD", "KES", "UGX", "EUR", "GBP"];

/**
 * Shows the "Set up your shop" prompt instead of `children` whenever the
 * container can't actually ring up a sale yet (books not open, or a role
 * POS/Customer Credit need isn't mapped) — so nobody sees a raw
 * `missing_mappings` error. One button; nothing else to configure.
 */
export function SetupGate({
  containerId,
  children,
}: {
  containerId: string;
  children: React.ReactNode;
}) {
  const { data: status, isLoading } = useQuery({
    queryKey: ["retail-finance-setup", "status", containerId],
    queryFn: () => sdk.retailFinanceSetup.getStatus(containerId),
  });

  if (isLoading)
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  if (status?.ready) return <>{children}</>;
  return <SetupPrompt containerId={containerId} status={status ?? null} />;
}

function SetupPrompt({
  containerId,
  status,
}: {
  containerId: string;
  status:
    | import("../../../lib/sdk/domains/retailFinanceSetup").SetupStatus
    | null;
}) {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState(status?.base_currency ?? "TZS");

  const setup = useMutation({
    mutationFn: () =>
      sdk.retailFinanceSetup.quickSetup(
        containerId,
        currency.trim().toUpperCase(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["retail-finance-setup", "status", containerId],
      });
      queryClient.invalidateQueries({ queryKey: ["pos"] });
    },
  });

  const alreadyOpen = !!status?.books_open;

  return (
    <div className="mx-auto max-w-md rounded-lg border border-neutral-200 p-5 text-center dark:border-neutral-800">
      <h2 className="text-sm font-semibold">Set up your shop</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {alreadyOpen
          ? "A few things still need to be set up before you can take a sale — this finishes them for you."
          : "One quick step before you can ring up a sale: choose your currency. Everything else — accounts, how sales and payments record — is set up automatically, and you won't need to touch it again."}
      </p>
      {!alreadyOpen && (
        <div className="mx-auto mt-3 max-w-[12rem]">
          <label className={`mb-1 block text-left ${labelClass}`}>
            Currency
          </label>
          <input
            className={inputClass}
            value={currency}
            maxLength={3}
            list="retail-setup-currencies"
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          />
          <datalist id="retail-setup-currencies">
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      )}
      <button
        type="button"
        onClick={() => setup.mutate()}
        disabled={!/^[A-Z]{3}$/.test(currency.trim()) || setup.isPending}
        className={`mt-4 ${primaryButtonClass}`}
      >
        {setup.isPending ? "Setting up…" : "Set up my shop"}
      </button>
      {setup.isError && (
        <p className={`mt-2 ${errorTextClass}`}>
          {errorMessage(setup.error, "Couldn't finish setup.")}
        </p>
      )}
    </div>
  );
}

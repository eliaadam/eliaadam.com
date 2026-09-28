import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { errorMessage, errorTextClass, formatDateTime, inputClass, primaryButtonClass } from "./ui";

const COMMON_CURRENCIES = ["TZS", "USD", "KES", "UGX", "EUR", "GBP"];

export function SettingsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["finance", "settings", containerId],
    queryFn: () => sdk.finance.getSettings(containerId),
  });
  const [currency, setCurrency] = useState("TZS");

  const openBooks = useMutation({
    mutationFn: () => sdk.finance.openBooks(containerId, currency.trim().toUpperCase()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance"] }),
  });

  if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>;
  if (error) return <p className={errorTextClass}>{errorMessage(error, "Couldn't load the books' settings.")}</p>;
  if (!settings) return null;

  if (!settings.books_open) {
    return (
      <div className="max-w-md rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Open the books</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Choose a base currency for this container. Every amount posted here will be in it — this can't be changed
          afterwards.
        </p>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-500">Base currency</label>
            <input
              className={inputClass}
              value={currency}
              maxLength={3}
              placeholder="TZS"
              list="finance-currencies"
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
            <datalist id="finance-currencies">
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={() => openBooks.mutate()}
            disabled={!/^[A-Z]{3}$/.test(currency.trim()) || openBooks.isPending}
            className={primaryButtonClass}
          >
            {openBooks.isPending ? "Opening…" : "Open books"}
          </button>
        </div>
        {openBooks.isError && <p className={`mt-2 ${errorTextClass}`}>{errorMessage(openBooks.error, "Couldn't open the books.")}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      <h2 className="text-sm font-semibold">Books</h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Base currency</dt>
          <dd className="font-medium">{settings.base_currency}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-neutral-500 dark:text-neutral-500">Opened</dt>
          <dd>{formatDateTime(settings.opened_at)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
        The base currency can't be changed once the books are open.
      </p>
    </div>
  );
}

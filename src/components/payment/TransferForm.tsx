import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk, type Container, type Wallet } from "../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

function toMinorUnits(majorAmount: string): number {
  return Math.round(Number.parseFloat(majorAmount) * 100);
}

/**
 * Sends FROM a specific, already-chosen wallet — currency is locked
 * to that wallet's own. The destination is picked by searching
 * containers (matching the discovery pattern used elsewhere in this
 * app), then transparently resolved to that container's wallet in the
 * SAME currency via get-or-create — the person picks a container, not
 * a wallet id, for the common case.
 */
export function TransferForm({
  fromWallet,
  onCompleted,
}: {
  fromWallet: Wallet;
  onCompleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState<Container | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: candidates } = useQuery({
    queryKey: ["containers", "search", search],
    queryFn: () =>
      sdk.container.searchContainers({ q: search || undefined, limit: 10 }),
    enabled: search.trim().length > 1,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const toWallet = await sdk.payment.getOrCreateContainerWallet(
        destination!.id,
        fromWallet.currency,
      );
      return sdk.payment.createTransfer({
        from_wallet_id: fromWallet.id,
        to_wallet_id: toWallet.id,
        amount: toMinorUnits(amount),
        currency: fromWallet.currency,
        description: description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payment", "wallet", fromWallet.id],
      });
      onCompleted();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (destination) mutation.mutate();
      }}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div>
        <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Send to (container's {fromWallet.currency} wallet)
        </p>
        {destination ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700">
            <span>{destination.display_name}</span>
            <button
              type="button"
              onClick={() => setDestination(null)}
              className="text-xs text-neutral-500 hover:underline dark:text-neutral-500"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              className={inputClass}
              placeholder="Search containers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {candidates && candidates.length > 0 && (
              <ul className="mt-1 flex flex-col divide-y divide-neutral-100 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDestination(c);
                        setSearch("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    >
                      {c.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Amount"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="flex-none rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
          {fromWallet.currency}
        </span>
      </div>

      <input
        className={inputClass}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Transfer failed."}
        </p>
      )}

      <button
        type="submit"
        disabled={!destination || mutation.isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Sending…" : "Send transfer"}
      </button>
    </form>
  );
}

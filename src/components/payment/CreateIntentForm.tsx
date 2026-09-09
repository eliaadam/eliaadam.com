import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sdk, type Gateway, type Wallet } from "../../lib/sdk";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/** Amount is entered in major units and converted to minor units
 * before hitting the API — the ledger only ever deals in integers,
 * never floats, on purpose. */
function toMinorUnits(majorAmount: string): number {
  return Math.round(Number.parseFloat(majorAmount) * 100);
}

/**
 * Collects money INTO a specific, already-chosen wallet — currency is
 * locked to that wallet's own currency (a wallet only ever holds one
 * currency; there's no picker for it here).
 */
export function CreateIntentForm({
  wallet,
  onCreated,
}: {
  wallet: Wallet;
  onCreated: (intentId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [gateway, setGateway] = useState<Gateway>("manual");
  const [description, setDescription] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const requiresBuyerInfo = gateway !== "manual";

  const mutation = useMutation({
    mutationFn: () =>
      sdk.payment.createIntent({
        destination_wallet_id: wallet.id,
        amount: toMinorUnits(amount),
        currency: wallet.currency,
        gateway,
        description: description || undefined,
        buyer_name: requiresBuyerInfo ? buyerName : undefined,
        buyer_email: requiresBuyerInfo ? buyerEmail : undefined,
        buyer_phone: requiresBuyerInfo ? buyerPhone : undefined,
      }),
    onSuccess: (intent) => {
      queryClient.invalidateQueries({ queryKey: ["payment", "intents"] });
      queryClient.invalidateQueries({
        queryKey: ["payment", "wallet", wallet.id],
      });
      onCreated(intent.id);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
    >
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
          {wallet.currency}
        </span>
      </div>

      <select
        className={inputClass}
        value={gateway}
        onChange={(e) => setGateway(e.target.value as Gateway)}
      >
        <option value="manual">
          Manual (cash / bank transfer, recorded by hand)
        </option>
        <option value="selcom">Selcom (mobile money, Tanzania)</option>
        <option value="flutterwave">
          Flutterwave (card / bank, unverified integration)
        </option>
      </select>

      <input
        className={inputClass}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {requiresBuyerInfo && (
        <div className="flex flex-col gap-2 rounded-md bg-neutral-50 p-3 dark:bg-neutral-900">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Buyer details — required to collect via {gateway}
          </p>
          <input
            className={inputClass}
            placeholder="Buyer name"
            required
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Buyer email"
            required
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Buyer phone (required for Selcom's USSD prompt)"
            required={gateway === "selcom"}
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
          />
        </div>
      )}

      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Something went wrong."}
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create payment"}
      </button>
    </form>
  );
}

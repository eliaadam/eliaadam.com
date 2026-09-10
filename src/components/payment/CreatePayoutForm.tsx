import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Wallet, sdk } from "../../lib/sdk";
import type { PayoutDestinationType } from "../../lib/sdk/domains/payment";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

function toMinorUnits(majorAmount: string): number {
  return Math.round(Number.parseFloat(majorAmount) * 100);
}

export function CreatePayoutForm({
  wallet,
  onCreated,
}: {
  wallet: Wallet;
  onCreated: (payoutId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [destinationType, setDestinationType] =
    useState<PayoutDestinationType>("mobile_money");
  const [narration, setNarration] = useState("");
  const [accountName, setAccountName] = useState("");

  const [bankCode, setBankCode] = useState("");
  const [bankNumber, setBankNumber] = useState("");

  const [country, setCountry] = useState("");
  const [network, setNetwork] = useState("");
  const [msisdn, setMsisdn] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.payment.createPayout({
        source_wallet_id: wallet.id,
        amount: toMinorUnits(amount),
        currency: wallet.currency,
        destination_type: destinationType,
        destination:
          destinationType === "bank"
            ? {
                bank: { code: bankCode, number: bankNumber },
                account_name: accountName || undefined,
              }
            : {
                mobile_money: { country, network, msisdn },
                account_name: accountName || undefined,
              },
        narration: narration || undefined,
      }),
    onSuccess: (payout) => {
      queryClient.invalidateQueries({ queryKey: ["payment", "payouts"] });
      queryClient.invalidateQueries({
        queryKey: ["payment", "wallet", wallet.id],
      });
      onCreated(payout.id);
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

      <div className="flex gap-1.5">
        <TabButton
          label="Mobile money"
          active={destinationType === "mobile_money"}
          onClick={() => setDestinationType("mobile_money")}
        />
        <TabButton
          label="Bank"
          active={destinationType === "bank"}
          onClick={() => setDestinationType("bank")}
        />
      </div>

      {destinationType === "mobile_money" ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className={`${inputClass} w-28`}
              placeholder="Country (e.g. TZ)"
              required
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
            />
            <input
              className={inputClass}
              placeholder="Network (e.g. VODACOM)"
              required
              value={network}
              onChange={(e) => setNetwork(e.target.value.toUpperCase())}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Recipient phone number"
            required
            value={msisdn}
            onChange={(e) => setMsisdn(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            className={inputClass}
            placeholder="Bank code"
            required
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Account number"
            required
            value={bankNumber}
            onChange={(e) => setBankNumber(e.target.value)}
          />
        </div>
      )}

      <input
        className={inputClass}
        placeholder="Recipient name (optional)"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Narration (optional)"
        value={narration}
        onChange={(e) => setNarration(e.target.value)}
      />

      {mutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn't create the payout — check the details and try again.
        </p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create cashout"}
      </button>
    </form>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white dark:bg-white dark:text-black"
          : "rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
      }
    >
      {label}
    </button>
  );
}

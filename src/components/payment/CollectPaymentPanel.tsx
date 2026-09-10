import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  sdk,
  type InitiateResult,
  type PaymentIntent,
 
} from "../../lib/sdk";
import type { PaymentMethodInput, SavedPaymentMethod } from "../../lib/sdk/domains/payment";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

/**
 * Renders the right "collect payment" UI for `intent.gateway`:
 *
 *  - "manual" / "selcom": a single button. Selcom already has
 *    everything it needs from the intent itself (buyer_phone, for the
 *    USSD push); manual just settles.
 *  - "flutterwave": a method picker (saved reference / card / mobile
 *    money) — REQUIRED, since v4 Flutterwave collects directly rather
 *    than via a hosted redirect. Card fields are raw/plaintext; see
 *    `lib/sdk/payment.ts`'s own top-of-file note on why, and treat
 *    this form's inputs with that in mind (no autocomplete quirks, no
 *    incidental logging, nothing persisted client-side beyond the
 *    single submit).
 *
 * `onResult` is called with whatever `initiateIntent()` returns —
 * including a possible `next_action` the parent is responsible for
 * rendering (via `NextActionPanel`); this component only gets the
 * FIRST step off the ground.
 */
export function CollectPaymentPanel({
  intent,
  onResult,
}: {
  intent: PaymentIntent;
  onResult: (result: InitiateResult) => void;
}) {
  const mutation = useMutation({
    mutationFn: (paymentMethod?: PaymentMethodInput) =>
      sdk.payment.initiateIntent(intent.id, paymentMethod),
    onSuccess: onResult,
  });

  if (intent.gateway !== "flutterwave") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate(undefined)}
          disabled={mutation.isPending}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Starting…" : "Collect payment"}
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't start collection.
          </p>
        )}
      </div>
    );
  }

  return (
    <FlutterwaveMethodForm
      onSubmit={(paymentMethod) => mutation.mutate(paymentMethod)}
      isPending={mutation.isPending}
      isError={mutation.isError}
    />
  );
}

type MethodTab = "saved" | "card" | "mobile_money";

function FlutterwaveMethodForm({
  onSubmit,
  isPending,
  isError,
}: {
  onSubmit: (paymentMethod: PaymentMethodInput) => void;
  isPending: boolean;
  isError: boolean;
}) {
  const { data: saved } = useQuery({
    queryKey: ["payment", "saved-payment-methods", "flutterwave"],
    queryFn: () => sdk.payment.listSavedPaymentMethods("flutterwave"),
  });

  const [tab, setTab] = useState<MethodTab>("card");
  const [savedId, setSavedId] = useState("");
  const [saveForFuture, setSaveForFuture] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");

  const [countryCode, setCountryCode] = useState("");
  const [network, setNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const hasSaved = Boolean(saved && saved.length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "saved") {
      if (!savedId) return;
      onSubmit({ saved_payment_method_id: savedId });
    } else if (tab === "card") {
      onSubmit({
        type: "card",
        card: {
          number: cardNumber,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
        },
        save_for_future: saveForFuture,
      });
    } else {
      onSubmit({
        type: "mobile_money",
        mobile_money: {
          country_code: countryCode,
          network,
          phone_number: phoneNumber,
        },
        save_for_future: saveForFuture,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {hasSaved && <TabButton label="Saved" active={tab === "saved"} onClick={() => setTab("saved")} />}
        <TabButton label="Card" active={tab === "card"} onClick={() => setTab("card")} />
        <TabButton
          label="Mobile money"
          active={tab === "mobile_money"}
          onClick={() => setTab("mobile_money")}
        />
      </div>

      {tab === "saved" && (
        <select
          className={inputClass}
          required
          value={savedId}
          onChange={(e) => setSavedId(e.target.value)}
        >
          <option value="">Choose a saved payment method…</option>
          {saved?.map((m: SavedPaymentMethod) => (
            <option key={m.id} value={m.id}>
              {m.display_label ?? m.method_type}
            </option>
          ))}
        </select>
      )}

      {tab === "card" && (
        <div className="flex flex-col gap-2">
          <input
            className={inputClass}
            placeholder="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            required
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="MM"
              inputMode="numeric"
              maxLength={2}
              autoComplete="cc-exp-month"
              required
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="YYYY"
              inputMode="numeric"
              maxLength={4}
              autoComplete="cc-exp-year"
              required
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="CVV"
              inputMode="numeric"
              maxLength={4}
              autoComplete="cc-csc"
              required
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
            />
          </div>
          <SaveForFutureCheckbox checked={saveForFuture} onChange={setSaveForFuture} />
        </div>
      )}

      {tab === "mobile_money" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className={`${inputClass} w-24`}
              placeholder="Country (e.g. 233)"
              required
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Network (e.g. MTN)"
              required
              value={network}
              onChange={(e) => setNetwork(e.target.value.toUpperCase())}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Phone number"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <SaveForFutureCheckbox checked={saveForFuture} onChange={setSaveForFuture} />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn't start collection — check the details and try again.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {isPending ? "Starting…" : "Collect payment"}
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

function SaveForFutureCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      Save this for future payments
    </label>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk, type Gateway } from "../../../lib/sdk";
import type {
  PaymentMethodInput,
  SavedPaymentMethod,
} from "../../../lib/sdk/domains/payment";
import { useContainer } from "../../../components/context/ContainerContext";
import { IntentStatusPanel } from "../../../components/payment/IntentStatusPanel";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

type MethodTab = "saved" | "card" | "mobile_money";

/**
 * The consolidated create+collect flow — one form, one submit, no
 * intermediate page. Replaces the old three-step path (Payment ->
 * PaymentWalletDetail's CreateIntentForm -> PaymentIntentDetail's
 * CollectPaymentPanel): createIntent() and initiateIntent() are
 * chained as ONE mutation here, and the result renders inline via
 * IntentStatusPanel — the buyer just watches it resolve, no second
 * click for "manual"/"selcom" (nothing more to collect) and no
 * separate page for "flutterwave" (its method picker is inline below,
 * collected up front as part of the same submit rather than after a
 * round trip).
 *
 * The Flutterwave method-picker UI here is a deliberate, small
 * duplication of CollectPaymentPanel's own FlutterwaveMethodForm —
 * that component isn't exported (it's a private, file-local piece of
 * CollectPaymentPanel.tsx), and the two contexts genuinely differ:
 * this one collects a method BEFORE any intent exists, that one
 * collects it for an ALREADY-CREATED one. CollectPaymentPanel itself
 * stays wired into IntentStatusPanel unchanged, for the fallback case
 * of an intent that's still "pending" for some other reason (created
 * before this flow shipped, or initiateIntent() failing immediately
 * after createIntent() succeeded).
 */
export function PayTab() {
  const { currentContainerId } = useContainer();
  const queryClient = useQueryClient();

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [gateway, setGateway] = useState<Gateway>("manual");
  const [description, setDescription] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [methodTab, setMethodTab] = useState<MethodTab>("card");
  const [savedId, setSavedId] = useState("");
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [network, setNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [resultIntentId, setResultIntentId] = useState<string | null>(null);

  const requiresBuyerInfo = gateway !== "manual";
  const isFlutterwave = gateway === "flutterwave";

  const { data: saved } = useQuery({
    queryKey: ["payment", "saved-payment-methods", "flutterwave"],
    queryFn: () => sdk.payment.listSavedPaymentMethods("flutterwave"),
    enabled: isFlutterwave,
  });
  const hasSaved = Boolean(saved && saved.length > 0);

  function toMinorUnits(majorAmount: string): number {
    return Math.round(Number.parseFloat(majorAmount) * 100);
  }

  function buildPaymentMethod(): PaymentMethodInput | undefined {
    if (!isFlutterwave) return undefined;
    if (methodTab === "saved") {
      return savedId ? { saved_payment_method_id: savedId } : undefined;
    }
    if (methodTab === "card") {
      return {
        type: "card",
        card: {
          number: cardNumber,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv,
        },
        save_for_future: saveForFuture,
      };
    }
    return {
      type: "mobile_money",
      mobile_money: {
        country_code: countryCode,
        network,
        phone_number: phoneNumber,
      },
      save_for_future: saveForFuture,
    };
  }

  const wallet = wallets?.find((w) => w.id === walletId);

  const payMutation = useMutation({
    mutationFn: async () => {
      const intent = await sdk.payment.createIntent({
        destination_wallet_id: walletId,
        amount: toMinorUnits(amount),
        currency: wallet!.currency,
        gateway,
        description: description || undefined,
        buyer_name: requiresBuyerInfo ? buyerName : undefined,
        buyer_email: requiresBuyerInfo ? buyerEmail : undefined,
        buyer_phone: requiresBuyerInfo ? buyerPhone : undefined,
      });
      // Chained immediately — no intermediate screen between "create"
      // and "collect". "manual"/"selcom" need nothing further here;
      // "flutterwave" carries whatever method was collected above.
      await sdk.payment.initiateIntent(intent.id, buildPaymentMethod());
      return intent.id;
    },
    onSuccess: (intentId) => {
      queryClient.invalidateQueries({ queryKey: ["payment", "intents"] });
      queryClient.invalidateQueries({ queryKey: ["payment", "wallets"] });
      setResultIntentId(intentId);
    },
  });

  const resetForm = () => {
    setResultIntentId(null);
    setAmount("");
    setDescription("");
    setBuyerName("");
    setBuyerEmail("");
    setBuyerPhone("");
    setCardNumber("");
    setExpiryMonth("");
    setExpiryYear("");
    setCvv("");
    setCountryCode("");
    setNetwork("");
    setPhoneNumber("");
    setSavedId("");
  };

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  if (resultIntentId) {
    return (
      <div className="flex flex-col gap-3">
        <IntentStatusPanel intentId={resultIntentId} onClose={resetForm} />
        <button
          type="button"
          onClick={resetForm}
          className="self-start text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Start a new payment
        </button>
      </div>
    );
  }

  const canSubmit =
    Boolean(walletId) &&
    Boolean(amount) &&
    Number.parseFloat(amount) > 0 &&
    (!requiresBuyerInfo ||
      (Boolean(buyerName) &&
        Boolean(buyerEmail) &&
        (gateway !== "selcom" || Boolean(buyerPhone))));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) payMutation.mutate();
      }}
      className="flex max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Wallet
        </label>
        <select
          className={inputClass}
          required
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
        >
          <option value="">Choose a wallet…</option>
          {wallets?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label ?? "Wallet"} ({w.currency})
            </option>
          ))}
        </select>
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
          {wallet?.currency ?? "—"}
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

      {isFlutterwave && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Payment method
          </p>
          <div className="flex gap-1.5">
            {hasSaved && (
              <MethodTabButton
                label="Saved"
                active={methodTab === "saved"}
                onClick={() => setMethodTab("saved")}
              />
            )}
            <MethodTabButton
              label="Card"
              active={methodTab === "card"}
              onClick={() => setMethodTab("card")}
            />
            <MethodTabButton
              label="Mobile money"
              active={methodTab === "mobile_money"}
              onClick={() => setMethodTab("mobile_money")}
            />
          </div>

          {methodTab === "saved" && (
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

          {methodTab === "card" && (
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
              <SaveForFutureCheckbox
                checked={saveForFuture}
                onChange={setSaveForFuture}
              />
            </div>
          )}

          {methodTab === "mobile_money" && (
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
              <SaveForFutureCheckbox
                checked={saveForFuture}
                onChange={setSaveForFuture}
              />
            </div>
          )}
        </div>
      )}

      {payMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {payMutation.error instanceof Error
            ? payMutation.error.message
            : "Something went wrong."}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || payMutation.isPending}
        className={primaryButtonClass}
      >
        {payMutation.isPending ? "Processing…" : "Pay now"}
      </button>
    </form>
  );
}

function MethodTabButton({
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

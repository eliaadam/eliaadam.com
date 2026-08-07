import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { marketplaceApi, intentApi, money } from "../payments/payments-api";
import { usePaymentPoll } from "./usePaymentPoll";

/**
 * Buy a listing with a choice of rail: pay from wallet balance (instant) or via
 * USSD prompt. Shows the wallet balance so the buyer knows if the wallet rail is
 * possible; falls back to USSD when balance is short.
 *
 * Checkout is two steps against the real API: create the order, then pay it.
 */
export default function MarketplaceCheckout({
  listingId,
  buyerContainerId,
  price,
  currency = "TZS",
  onPaid,
}: {
  listingId: string;
  buyerContainerId: string;
  price: number; // minor units
  currency?: string;
  onPaid?: () => void;
}) {
  const balanceQ = useQuery({
    queryKey: ["wallet-balance", buyerContainerId, currency],
    queryFn: () => intentApi.balance(buyerContainerId, currency),
  });
  const balance = balanceQ.data?.balance ?? 0;
  const canWallet = balance >= price;

  const [phone, setPhone] = useState("");
  const [intentId, setIntentId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  const pollState = usePaymentPoll(
    intentId ? () => intentApi.status(intentId).then((d) => d) : null,
    {
      onSucceeded: () => {
        setPaid(true);
        setMsg("Payment confirmed.");
        onPaid?.();
      },
    },
  );

  async function place(method: "wallet" | "ussd") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await marketplaceApi.place({
        buyer_container_id: buyerContainerId,
        listing_id: listingId,
        quantity: 1,
        payment_method: method,
        ...(method === "ussd" ? { gateway: "selcom", buyer_phone: phone } : {}),
      });

      if (res.status === "succeeded" || res.status === "not_required") {
        setPaid(true);
        setMsg(
          res.status === "not_required" ? "Order placed." : "Paid from wallet.",
        );
        onPaid?.();
      } else if (res.checkout_url) {
        window.location.href = res.checkout_url;
      } else {
        // USSD rail — poll the collection intent.
        setIntentId(res.intent_id ?? null);
        setMsg(
          `Check your phone (${phone}) and approve the ${money(price, currency)} prompt.`,
        );
      }
    } catch (e: any) {
      if (e.body?.insufficient) {
        setMsg(
          e.body.message ?? "Not enough wallet balance — pay via USSD instead.",
        );
      } else {
        setMsg(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (paid || pollState === "succeeded")
    return (
      <div className="rounded-xl border border-emerald-300 dark:border-emerald-900 p-4 text-center">
        <p className="text-2xl">✓</p>
        <p className="text-sm text-emerald-600 mt-1">
          {msg ?? "Payment confirmed."}
        </p>
      </div>
    );

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 max-w-md space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-black dark:text-white m-0">
          Checkout
        </p>
        <p className="text-sm font-bold text-black dark:text-white m-0 tabular-nums">
          {money(price, currency)}
        </p>
      </div>
      <p className="text-[11px] text-neutral-400 m-0">
        Wallet balance: {money(balance, currency)}
        {canWallet ? " · enough to pay" : " · not enough, use USSD"}
      </p>

      {intentId ? (
        <div className="flex items-center gap-2 text-[12px]">
          {pollState === "polling" && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span className="text-neutral-600 dark:text-neutral-300">
            {pollState === "failed"
              ? "Payment failed or cancelled."
              : pollState === "timeout"
                ? "Still waiting — check again shortly."
                : "Waiting for approval on your phone…"}
          </span>
        </div>
      ) : (
        <>
          <button
            onClick={() => place("wallet")}
            disabled={!canWallet || busy}
            className="w-full px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            Pay from wallet ({money(balance, currency)})
          </button>

          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
              placeholder="Mobile money number for USSD"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
            <button
              onClick={() => place("ussd")}
              disabled={phone.trim().length < 9 || busy}
              className="w-full px-4 py-2 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
            >
              Pay via USSD prompt
            </button>
          </div>
        </>
      )}

      {msg && <p className="text-[11px] text-neutral-500 m-0">{msg}</p>}
    </div>
  );
}

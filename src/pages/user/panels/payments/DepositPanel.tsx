import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { depositApi, intentApi, money } from "./payments-api";
import { usePaymentPoll } from "../Marketplace/usePaymentPoll";

/**
 * Top up a container wallet from mobile money. Amount entered in MAJOR units in
 * the UI and converted to minor units (x100) before sending.
 */
export default function DepositPanel({ containerId }: { containerId: string }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [gateway, setGateway] = useState<"selcom" | "mpesa">("selcom");
  const [intentId, setIntentId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const minor = Math.round(parseFloat(amount || "0") * 100);
  const ready = minor > 0 && phone.trim().length >= 9;

  const pollState = usePaymentPoll(
    intentId ? () => intentApi.status(intentId).then((d) => d) : null,
    {
      onSucceeded: () => {
        setMsg("Deposit confirmed — your wallet has been credited.");
        qc.invalidateQueries({ queryKey: ["wallet-balance", containerId] });
      },
    },
  );

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await depositApi.deposit({
        container_id: containerId,
        amount: minor,
        gateway,
        buyer_phone: phone,
      });
      setIntentId(res.intent_id);
      setMsg(
        `Check your phone (${phone}) and approve the ${money(minor)} prompt.`,
      );
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  const waiting = pollState === "polling";
  const done = pollState === "succeeded";

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 max-w-md space-y-3">
      <p className="text-sm font-semibold text-black dark:text-white m-0">
        Top up wallet
      </p>

      {!intentId && (
        <>
          <div>
            <label className="text-[11px] text-neutral-400">Amount (TZS)</label>
            <input
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="e.g. 20000"
              inputMode="decimal"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-neutral-400">
              Mobile money number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
              placeholder="2557XXXXXXXX"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            {(["selcom", "mpesa"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGateway(g)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md border ${
                  gateway === g
                    ? "bg-black text-white dark:bg-white dark:text-black border-black"
                    : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {g === "selcom" ? "Selcom" : "M-Pesa"}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!ready || busy}
            className="w-full px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
          >
            {busy ? "…" : `Deposit ${minor > 0 ? money(minor) : ""}`}
          </button>
        </>
      )}

      {intentId && (
        <div className="flex items-center gap-2 text-[12px]">
          {waiting && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          {done && <span className="text-emerald-600">✓</span>}
          <span className="text-neutral-600 dark:text-neutral-300">
            {done
              ? "Deposit confirmed."
              : pollState === "timeout"
                ? "Still waiting — it may take a moment. Check your balance shortly."
                : pollState === "failed"
                  ? "The payment failed or was cancelled."
                  : "Waiting for approval on your phone…"}
          </span>
        </div>
      )}

      {msg && <p className="text-[11px] text-neutral-500 m-0">{msg}</p>}
    </div>
  );
}

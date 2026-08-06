import { useState, useEffect } from "react";
import { publicPayApi, money } from "./payments-api";
import { usePaymentPoll } from "../Marketplace/usePaymentPoll";

/**
 * PUBLIC standalone page for paying a link — no login. Mount at /pay/:slug
 * OUTSIDE the authenticated app shell. Reads the slug from the route.
 *
 * Flow: load link → payer enters phone (+ amount for open links) → USSD prompt →
 * poll the charge token → success/failure.
 */
export default function PayLinkPage({ slug }: { slug: string }) {
  const [link, setLink] = useState<any | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [chargeToken, setChargeToken] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    publicPayApi
      .view(slug)
      .then(setLink)
      .catch((e) => setLoadErr(e.message));
  }, [slug]);

  const openAmount = link && link.amount === null;
  const minor = openAmount ? Math.round(parseFloat(amount || "0") * 100) : (link?.amount ?? 0);
  const ready = phone.trim().length >= 9 && minor > 0;

  const pollState = usePaymentPoll(
    chargeToken ? () => publicPayApi.status(chargeToken).then((d) => d) : null,
    { onSucceeded: () => setMsg("Payment received. Thank you!") },
  );

  async function pay() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await publicPayApi.pay(slug, {
        payer_name: name || undefined,
        payer_phone: phone,
        amount: openAmount ? minor : undefined,
      });
      setChargeToken(res.charge_token);
      setMsg(`Check your phone (${phone}) and approve the ${money(minor, link.currency)} prompt.`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loadErr)
    return (
      <Centered>
        <p className="text-sm text-neutral-500">This payment link could not be found.</p>
      </Centered>
    );
  if (!link)
    return (
      <Centered>
        <p className="text-sm text-neutral-400">Loading…</p>
      </Centered>
    );

  const done = pollState === "succeeded";

  return (
    <Centered>
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
        <div>
          <p className="text-lg font-semibold text-black dark:text-white m-0">{link.title}</p>
          {link.description && (
            <p className="text-[12px] text-neutral-400 m-0 mt-1">{link.description}</p>
          )}
          <p className="text-2xl font-bold text-black dark:text-white m-0 mt-3 tabular-nums">
            {link.amount !== null ? money(link.amount, link.currency) : "Enter amount"}
          </p>
        </div>

        {!link.payable ? (
          <p className="text-sm text-amber-600">This link is no longer accepting payments.</p>
        ) : done ? (
          <div className="text-center py-6">
            <p className="text-3xl">✓</p>
            <p className="text-sm text-emerald-600 mt-2">Payment received. Thank you!</p>
          </div>
        ) : chargeToken ? (
          <div className="text-center py-6 space-y-2">
            {pollState === "polling" && (
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            )}
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {pollState === "failed"
                ? "The payment failed or was cancelled."
                : pollState === "timeout"
                  ? "Still waiting — if you approved it, it may take a moment."
                  : "Check your phone and approve the prompt…"}
            </p>
            {pollState === "failed" && (
              <button
                onClick={() => {
                  setChargeToken(null);
                  setMsg(null);
                }}
                className="text-[12px] underline text-neutral-500"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {openAmount && (
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={`Amount (${link.currency})`}
                inputMode="decimal"
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ""))}
              placeholder="Mobile money number (2557XXXXXXXX)"
              className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
            <button
              onClick={pay}
              disabled={!ready || busy}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              {busy ? "…" : `Pay ${minor > 0 ? money(minor, link.currency) : ""}`}
            </button>
          </div>
        )}

        {msg && !done && <p className="text-[11px] text-neutral-500 m-0">{msg}</p>}
        <p className="text-[10px] text-neutral-400 text-center m-0">Secured payment</p>
      </div>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      {children}
    </div>
  );
}

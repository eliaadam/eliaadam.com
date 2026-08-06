import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";

type Link = {
  slug: string;
  title: string;
  description?: string;
  amount: number | null; // minor units; null = buyer chooses
  currency: string;
  mode: string;
};

type State =
  | { s: "loading" }
  | { s: "notfound" }
  | {
      s: "ready";
      link: Link;
      awaitingUssd?: boolean;
      chargeToken?: string;
      succeeded?: boolean;
    }
  | { s: "error"; message: string };

function fromMinorUnits(minor: number): string {
  const whole = Math.floor(minor / 100).toLocaleString();
  const frac = String(minor % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

function toMinorUnits(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const cents = (frac + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(cents, 10);
}

export default function PublicPayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ s: "loading" });

  // buyer form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // resolve the link on mount
  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const res = await fetch(
          `${API}/api/pay/${encodeURIComponent(slug ?? "")}`,
          { headers: { Accept: "application/json" } },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 404) {
          setState({ s: "notfound" });
          return;
        }
        if (!res.ok) {
          setState({
            s: "error",
            message: body.message ?? "Could not load this payment link.",
          });
          return;
        }
        setState({ s: "ready", link: body.data });
      } catch {
        if (!cancelled) setState({ s: "error", message: "Network error." });
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // poll charge status while awaiting a USSD approval
  useEffect(() => {
    if (state.s !== "ready" || !state.awaitingUssd || !state.chargeToken)
      return;

    const token = state.chargeToken;
    const start = Date.now();
    const TIMEOUT_MS = 3 * 60 * 1000;

    const tick = async () => {
      if (Date.now() - start > TIMEOUT_MS) {
        setPayError(
          "We haven't seen the payment yet. If you approved it, check back shortly.",
        );
        setSubmitting(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/pay/charge/${token}/status`, {
          headers: { Accept: "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        const status = body.data?.payment_status;

        if (status === "succeeded") {
          setPayError(null);
          setSubmitting(false);
          setState((s) =>
            s.s === "ready"
              ? { ...s, awaitingUssd: false, succeeded: true }
              : s,
          );
        } else if (status === "failed") {
          setPayError(
            "The payment failed or was cancelled. You can try again.",
          );
          setSubmitting(false);
          setState((s) =>
            s.s === "ready"
              ? { ...s, awaitingUssd: false, chargeToken: undefined }
              : s,
          );
        }
        // else still processing — keep polling
      } catch {
        // transient — keep polling until timeout
      }
    };

    const id = setInterval(tick, 4000);
    tick();
    return () => clearInterval(id);
  }, [state]);

  async function pay(link: Link) {
    setPayError(null);

    const openAmount = link.amount === null;
    const minor = openAmount ? toMinorUnits(amount) : link.amount;

    if (openAmount && (minor === null || minor <= 0)) {
      setPayError("Enter a valid amount.");
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setPayError("Please fill in your name, email and phone.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${API}/api/pay/${encodeURIComponent(link.slug)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: openAmount ? minor : undefined,
            payer_name: name.trim(),
            payer_email: email.trim(),
            payer_phone: phone.trim(),
          }),
        },
      );
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPayError(body.message ?? "Payment could not be started.");
        setSubmitting(false);
        return;
      }

      const { checkout_url, charge_token } = body.data ?? {};

      if (checkout_url) {
        // Hand off to Selcom's hosted checkout.
        window.location.href = checkout_url;
        return;
      }

      if (charge_token) {
        // USSD rail — no checkout page. Buyer approves a prompt on their phone.
        setPayError(null);
        setState((s) =>
          s.s === "ready"
            ? { ...s, awaitingUssd: true, chargeToken: charge_token }
            : s,
        );
        return;
      }

      setPayError("Payment could not be started. Please try again.");
      setSubmitting(false);
    } catch {
      setPayError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        {state.s === "loading" && (
          <div className="text-center text-neutral-400 text-sm">Loading…</div>
        )}

        {state.s === "notfound" && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold text-black dark:text-white m-0 mb-1">
              Link not found
            </p>
            <p className="text-sm text-neutral-400 m-0">
              This payment link doesn't exist or has been disabled.
            </p>
          </div>
        )}

        {state.s === "error" && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold text-black dark:text-white m-0 mb-1">
              Something went wrong
            </p>
            <p className="text-sm text-neutral-400 m-0">{state.message}</p>
          </div>
        )}

        {state.s === "ready" && state.succeeded && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold text-black dark:text-white m-0 mb-1">
              Payment received
            </p>
            <p className="text-sm text-neutral-500 m-0">
              Thanks — your payment for "{state.link.title}" is complete.
            </p>
          </div>
        )}

        {state.s === "ready" && !state.succeeded && state.awaitingUssd && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
            <p className="text-lg font-semibold text-black dark:text-white m-0 mb-1">
              Check your phone
            </p>
            <p className="text-sm text-neutral-500 m-0 mb-4">
              A payment prompt was sent to {phone}. Approve it to complete your
              payment for "{state.link.title}".
            </p>
            <span className="inline-flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Waiting for confirmation…
            </span>
            {payError && (
              <p className="text-[11px] text-red-600 mt-3 m-0">{payError}</p>
            )}
          </div>
        )}

        {state.s === "ready" && !state.succeeded && !state.awaitingUssd && (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8">
            <p className="text-[11px] uppercase tracking-wide text-neutral-400 m-0 mb-1">
              Payment request
            </p>
            <p className="text-xl font-semibold text-black dark:text-white m-0">
              {state.link.title}
            </p>
            {state.link.description && (
              <p className="text-sm text-neutral-500 mt-1 m-0">
                {state.link.description}
              </p>
            )}

            <div className="my-6 py-4 border-y border-neutral-100 dark:border-neutral-800 text-center">
              {state.link.amount !== null ? (
                <p className="text-3xl font-semibold text-black dark:text-white m-0 tabular-nums">
                  {fromMinorUnits(state.link.amount)}
                  <span className="text-sm font-normal text-neutral-400 ml-2">
                    {state.link.currency}
                  </span>
                </p>
              ) : (
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Amount ({state.link.currency})
                  </label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-40 mx-auto text-center px-3 py-2 text-lg rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="Phone (e.g. 0712 345 678)"
                className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
            </div>

            <button
              onClick={() => pay(state.link)}
              disabled={submitting}
              className="w-full py-3 text-sm font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              {submitting ? "Starting payment…" : "Pay now"}
            </button>

            {payError && (
              <p className="text-[11px] text-red-600 mt-2 m-0 text-center">
                {payError}
              </p>
            )}

            <p className="text-[10px] text-neutral-400 mt-4 m-0 text-center">
              You'll be taken to a secure checkout, or asked to approve a
              payment prompt on your phone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

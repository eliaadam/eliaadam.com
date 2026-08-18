import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.body = j;
    throw e;
  }
  return j.data ?? j;
}

function money(minor: number, currency: string) {
  return minor === 0 ? "Free" : `${(minor / 100).toLocaleString()} ${currency}`;
}

type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  billing_model: string;
  entitlement_type: string;
  price: number;
  currency: string;
  duration_days?: number;
  quota?: number;
};

export default function SubscribePanel({
  entitlementType,
  onPay,
  onSubscribed,
}: {
  entitlementType?: string;
  onPay?: (subscriptionId: string, amount: number, currency: string) => void;
  onSubscribed?: (subscriptionId: string) => void;
}) {
  const { actor } = useAuth();
  const actorId = actor?.id;

  const plansQ = useQuery({
    queryKey: ["sub-catalogue", entitlementType],
    queryFn: () =>
      api(
        "GET",
        `subscriptions/plans${entitlementType ? `?entitlement_type=${entitlementType}` : ""}`,
      ),
  });
  const plans: Plan[] = Array.isArray(plansQ.data) ? plansQ.data : [];

  if (!actorId)
    return <p className="text-sm text-neutral-400">Loading your account…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <MySubscriptions />

      <div>
        <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
          Available plans
        </p>
        {plansQ.isLoading ? (
          <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
        ) : plans.length === 0 ? (
          <p className="text-[11px] text-neutral-400 m-0">
            No plans available right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onPay={onPay}
                onSubscribed={onSubscribed}
                actorName={actor?.display_name ?? ""}
                actorEmail={(actor as any)?.email ?? ""}
              />
            ))}
          </div>
        )}
      </div>

      <RedeemVoucher onPay={onPay} />
    </div>
  );
}

/* ── plan card with pre-condition gating ──────────────────────────── */

function PlanCard({
  plan,
  onPay,
  onSubscribed,
  actorName = "",
  actorEmail = "",
}: {
  plan: Plan;
  onPay?: (s: string, a: number, c: string) => void;
  onSubscribed?: (s: string) => void;
  actorName?: string;
  actorEmail?: string;
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [unmet, setUnmet] = useState<any[] | null>(null);

  const isPaid = plan.price > 0;
  const [gateway, setGateway] = useState<"selcom" | "mpesa">("selcom");
  const [network, setNetwork] = useState<
    "vodacom" | "airtel" | "tigo" | "halotel"
  >("vodacom");
  const buyerName = actorName;
  const [buyerEmail, setBuyerEmail] = useState(actorEmail);
  const [buyerPhone, setBuyerPhone] = useState("");

  const detailsReady =
    !isPaid ||
    (buyerPhone.trim().length >= 9 &&
      (gateway !== "selcom" || Boolean(network)));

  const [pollSubId, setPollSubId] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart = useRef<number>(0);

  const preQ = useQuery({
    queryKey: ["sub-pre", plan.id],
    queryFn: () => api("GET", `subscriptions/plans/${plan.id}/preconditions`),
    enabled: expanded,
  });

  const subscribe = useMutation({
    mutationFn: () =>
      api("POST", "subscriptions/pay", {
        plan_id: plan.id,
        ...(isPaid
          ? {
              gateway,
              ...(gateway === "selcom" ? { network } : {}),
              buyer_name: buyerName || actorName,
              buyer_email: buyerEmail || actorEmail,
              buyer_phone: buyerPhone,
            }
          : {}),
      }),
    onSuccess: (data: any) => {
      setUnmet(null);
      if (data.payment_required) {
        if (data.checkout_url) {
          setMsg("Redirecting to payment…");
          window.location.href = data.checkout_url;
        } else {
          setMsg(
            `Check your phone (${buyerPhone}) — approve the ${money(data.amount, data.currency)} prompt. Waiting for confirmation…`,
          );
          pollStart.current = Date.now();
          setPollSubId(data.subscription_id);
          onPay?.(data.subscription_id, data.amount, data.currency);
        }
      } else {
        setMsg("Subscribed! Your subscription is active.");
        qc.invalidateQueries({ queryKey: ["sub-mine"] });
        onSubscribed?.(data.subscription_id ?? data.id);
      }
    },
    onError: (e: any) => {
      if (e.body?.unmet) {
        setUnmet(e.body.unmet);
        setMsg(null);
      } else setMsg(e.message);
    },
  });

  // Poll payment-status for an async payment until it resolves or times out.
  useEffect(() => {
    if (!pollSubId) return;

    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    const INTERVAL_MS = 4000;

    const tick = async () => {
      if (Date.now() - pollStart.current > TIMEOUT_MS) {
        setMsg(
          "We haven't seen the payment yet. If you approved it, it may take a little longer — you can check your subscriptions shortly.",
        );
        setPollSubId(null);
        return;
      }
      try {
        const res: any = await api(
          "GET",
          `subscriptions/${pollSubId}/payment-status`,
        );
        const d = res?.data ?? res;
        if (
          d?.subscription_status === "active" ||
          d?.payment_status === "succeeded"
        ) {
          setMsg("Payment confirmed — your subscription is active.");
          qc.invalidateQueries({ queryKey: ["sub-mine"] });
          onSubscribed?.(pollSubId);
          setPollSubId(null);
        } else if (d?.payment_status === "failed") {
          setMsg("The payment failed or was cancelled. You can try again.");
          setPollSubId(null);
        }
        // else still processing → keep polling
      } catch {
        // transient — keep polling until timeout
      }
    };

    pollTimer.current = setInterval(tick, INTERVAL_MS);
    tick(); // immediate first check

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [pollSubId, qc, onSubscribed]);

  const pre = preQ.data as { all_satisfied: boolean; steps: any[] } | undefined;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-black dark:text-white m-0">
            {plan.name}
          </p>
          {plan.description && (
            <p className="text-[11px] text-neutral-400 m-0 mt-0.5">
              {plan.description}
            </p>
          )}
        </div>
        <p className="text-sm font-semibold text-black dark:text-white m-0 tabular-nums">
          {money(plan.price, plan.currency)}
        </p>
      </div>

      <p className="text-[11px] text-neutral-400 m-0 mt-2">
        {plan.billing_model}
        {plan.duration_days ? ` · ${plan.duration_days} days` : ""}
        {plan.quota ? ` · ${plan.quota} uses` : ""}
      </p>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          {preQ.isLoading ? (
            <p className="text-[11px] text-neutral-400 m-0">
              Checking requirements…
            </p>
          ) : pre && pre.steps.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 m-0 mb-1">
                Requirements
              </p>
              {pre.steps.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-[11px] mb-0.5"
                >
                  <span
                    className={
                      s.satisfied ? "text-emerald-600" : "text-amber-600"
                    }
                  >
                    {s.satisfied ? "✓" : "○"}
                  </span>
                  <span
                    className={
                      s.satisfied
                        ? "text-neutral-400 line-through"
                        : "text-neutral-600 dark:text-neutral-300"
                    }
                  >
                    {s.description}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-neutral-400 m-0">
              No requirements — ready to subscribe.
            </p>
          )}
        </div>
      )}

      {unmet && (
        <div className="mt-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 m-0 mb-1">
            Complete these first:
          </p>
          {unmet.map((u, i) => (
            <p
              key={i}
              className="text-[11px] text-amber-700 dark:text-amber-400 m-0"
            >
              • {u.description ?? u.kind}
            </p>
          ))}
        </div>
      )}

      {/* Payment details — paid plans only, once requirements are satisfied. */}
      {expanded && isPaid && (!pre || pre.all_satisfied) && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          <p className="text-[11px] font-semibold text-neutral-500 m-0">
            Payment
          </p>

          {/* Gateway choice */}
          <div className="flex gap-2">
            {(["selcom", "mpesa"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGateway(g)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md border ${
                  gateway === g
                    ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                    : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {g === "selcom" ? "Selcom (mobile money)" : "M-Pesa"}
              </button>
            ))}
          </div>

          {/* Network picker — Selcom only. Selects the mobile-money network the
              USSD prompt is pushed to. M-Pesa is Vodacom-only, so it's hidden. */}
          {gateway === "selcom" && (
            <div>
              <p className="text-[10px] text-neutral-400 m-0 mb-1">
                Choose your mobile network:
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["vodacom", "M-Pesa (Vodacom)"],
                    ["airtel", "Airtel Money"],
                    ["tigo", "Mixx (Tigo)"],
                    ["halotel", "Halopesa"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setNetwork(code)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-md border ${
                      network === code
                        ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                        : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phone — the one thing we don't already have. Required. */}
          <input
            value={buyerPhone}
            onChange={(e) =>
              setBuyerPhone(e.target.value.replace(/[^0-9+]/g, ""))
            }
            placeholder="Payment phone number (e.g. 2557XXXXXXXX)"
            className="w-full px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />

          {/* Selcom is now mobile-money USSD push (not hosted checkout), so no
              name/email is collected — the prompt goes straight to the phone.
              buyer_name/email are still sent from the account behind the scenes
              (the pay endpoint requires them), so nothing to re-enter here. */}
          <input
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full px-3 py-2 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white"
          />
          <p className="text-[10px] text-neutral-400 m-0">
            {gateway === "mpesa"
              ? "A payment prompt will be sent to this phone. Approve it to activate."
              : "A payment prompt will be sent to this phone on your selected network. Approve it to activate."}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => {
            // For a paid plan, the payment form lives inside the expanded card.
            // If the card is collapsed, the first click should REVEAL the form
            // (so the user can enter phone/details) rather than sit dead.
            if (isPaid && !expanded) {
              setExpanded(true);
              return;
            }
            subscribe.mutate();
          }}
          disabled={
            subscribe.isPending ||
            (pre ? !pre.all_satisfied : false) ||
            // Only block on payment details once the form is actually visible
            // (expanded). Collapsed → button is active and expands the card.
            (isPaid && expanded && !detailsReady)
          }
          className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {subscribe.isPending
            ? "…"
            : plan.price === 0
              ? "Get it"
              : isPaid && !expanded
                ? "Subscribe"
                : "Pay & subscribe"}
        </button>
        {pollSubId && (
          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Waiting for payment…
          </span>
        )}
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-[11px] text-neutral-400 hover:text-neutral-600 underline"
        >
          {expanded ? "hide" : "requirements"}
        </button>
      </div>

      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

/* ── my subscriptions ─────────────────────────────────────────────── */

function MySubscriptions() {
  const q = useQuery({
    queryKey: ["sub-mine"],
    queryFn: () => api("GET", "subscriptions/mine"),
  });
  const rows: any[] = Array.isArray(q.data) ? q.data : [];
  if (q.isLoading || rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        Your subscriptions
      </p>
      <div className="space-y-2">
        {rows.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
          >
            <div>
              <p className="text-sm text-black dark:text-white m-0">
                {s.entitlement_type}
              </p>
              <p className="text-[11px] text-neutral-400 m-0">
                {s.billing_model}
                {s.ends_at
                  ? ` · until ${new Date(s.ends_at).toLocaleDateString()}`
                  : ""}
                {s.quota_total
                  ? ` · ${s.quota_used}/${s.quota_total} used`
                  : ""}
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── redeem voucher ───────────────────────────────────────────────── */

function RedeemVoucher({
  onPay,
}: {
  onPay?: (subscriptionId: string, amount: number, currency: string) => void;
}) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const check = useMutation({
    mutationFn: () =>
      api("POST", "subscriptions/vouchers/validate", { code: code.trim() }),
    onSuccess: (d) => {
      setPreview(d);
      setMsg(d.valid ? null : (d.reason ?? "Invalid voucher."));
    },
    onError: (e: Error) => {
      setPreview(null);
      setMsg(e.message);
    },
  });

  const redeem = useMutation({
    mutationFn: () =>
      api("POST", "subscriptions/vouchers/redeem", { code: code.trim() }),
    onSuccess: (d: any) => {
      if (d.type === "grant") {
        setMsg("Voucher redeemed — subscription active!");
        qc.invalidateQueries({ queryKey: ["sub-mine"] });
      } else {
        setMsg(
          `Discount applied: pay ${money(d.discounted_amount, d.currency)} (was ${money(d.original_amount, d.currency)}).`,
        );
        if (d.payment_required && d.subscription_id) {
          onPay?.(d.subscription_id, d.discounted_amount, d.currency);
        }
      }
    },
    onError: (e: any) => setMsg(e.body?.message ?? e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-2">
        Have a voucher?
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setPreview(null);
            setMsg(null);
          }}
          placeholder="Enter code"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white uppercase"
        />
        {preview?.valid ? (
          <button
            onClick={() => redeem.mutate()}
            disabled={redeem.isPending}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-emerald-600 text-white disabled:opacity-40"
          >
            {redeem.isPending ? "…" : "Redeem"}
          </button>
        ) : (
          <button
            onClick={() => check.mutate()}
            disabled={check.isPending || !code.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-40"
          >
            {check.isPending ? "…" : "Apply"}
          </button>
        )}
      </div>
      {preview?.valid && (
        <p className="text-[11px] text-emerald-600 mt-2 m-0">
          {preview.type === "grant"
            ? "Grants a free subscription."
            : `Discount: ${preview.discount_percent ? preview.discount_percent + "%" : "flat amount"} off.`}
        </p>
      )}
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

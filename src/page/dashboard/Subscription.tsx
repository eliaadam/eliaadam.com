import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Archive, Check, Star } from "lucide-react";
import {
  sdk,
  type BillingInterval,
  type SubscriptionPlan,
} from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageSubscriptionPlans } from "../../lib/hooks/useCanManageSubscriptionPlans";

const inputClass =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

function formatPrice(
  price: number,
  currency: string,
  interval: BillingInterval,
) {
  const major = (price / 100).toFixed(2);
  return `${currency} ${major}/${interval === "monthly" ? "mo" : "yr"}`;
}

export function Subscription() {
  const { currentContainerId } = useContainer();
  const { data: canManage } = useCanManageSubscriptionPlans();
  const [showCreate, setShowCreate] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription", "plans", currentContainerId],
    queryFn: () => sdk.subscription.listPlansForContainer(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — plans belong to whichever container is
        currently selected.
      </p>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Subscription</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            This container's subscription plans. Any actor may subscribe;
            managing plans requires core.subscription.plan.manage here.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex flex-none items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
          >
            <Plus size={15} />
            New plan
          </button>
        )}
      </div>

      {showCreate && (
        <CreatePlanForm
          containerId={currentContainerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {plans && plans.length === 0 && !showCreate && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Star
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No plans yet</p>
          {canManage && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Create one above to get started.
            </p>
          )}
        </div>
      )}

      {plans && plans.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              containerId={currentContainerId}
              canManage={Boolean(canManage)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  containerId,
  canManage,
}: {
  plan: SubscriptionPlan;
  containerId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showSubscribe, setShowSubscribe] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["subscription", "plans", containerId],
    });

  const archiveMutation = useMutation({
    mutationFn: () => sdk.subscription.archivePlan(plan.id),
    onSuccess: invalidate,
  });

  const { data: alreadySubscribed } = useQuery({
    queryKey: ["subscription", "has-active", user?.id, plan.id],
    queryFn: () => sdk.subscription.hasActiveSubscription(plan.id),
    enabled: Boolean(user),
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-semibold tracking-tight">{plan.name}</p>
          {canManage && (
            <button
              type="button"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              aria-label="Archive plan"
              className="text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
            >
              <Archive size={15} />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {formatPrice(plan.price, plan.currency, plan.billing_interval)}
          {plan.trial_days > 0 && ` · ${plan.trial_days}-day trial`}
        </p>
      </div>

      {plan.description && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {plan.description}
        </p>
      )}

      {plan.features.length > 0 && (
        <ul className="flex flex-col gap-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs">
              <Check size={13} className="mt-0.5 flex-none text-neutral-400" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {plan.benefits.length > 0 && (
        <div className="rounded-md bg-neutral-50 p-2.5 text-xs italic text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          {plan.benefits.join(" · ")}
        </div>
      )}

      <div className="mt-auto pt-2">
        {alreadySubscribed ? (
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            You already have an active subscription to this plan.
          </p>
        ) : showSubscribe ? (
          <SubscribeForm
            plan={plan}
            containerId={containerId}
            onDone={() => setShowSubscribe(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowSubscribe(true)}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
          >
            Subscribe
          </button>
        )}
      </div>
    </div>
  );
}

function SubscribeForm({
  plan,
  containerId,
  onDone,
}: {
  plan: SubscriptionPlan;
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [walletId, setWalletId] = useState("");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", containerId],
    queryFn: () => sdk.payment.listWallets(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.subscription.subscribe({
        plan_id: plan.id,
        paying_wallet_id: walletId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <select
        className={`${inputClass} w-full`}
        value={walletId}
        onChange={(e) => setWalletId(e.target.value)}
      >
        <option value="">Pay from…</option>
        {wallets?.map((w) => (
          <option key={w.id} value={w.id}>
            {w.label || w.owner_type} ({w.currency}{" "}
            {(w.balance / 100).toFixed(2)})
          </option>
        ))}
      </select>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Only wallets you're actually a participant of will work — a wallet that
        isn't yours will be rejected when you confirm.
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!walletId || mutation.isPending}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Subscribing…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
      </div>
      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't subscribe — check the wallet is really yours and has enough
          balance.
        </p>
      )}
    </div>
  );
}

function CreatePlanForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [payoutWalletId, setPayoutWalletId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");
  const [trialDays, setTrialDays] = useState("0");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", containerId],
    queryFn: () => sdk.payment.listWallets(containerId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.subscription.createPlan({
        container_id: containerId,
        code,
        name,
        payout_wallet_id: payoutWalletId,
        price: Math.round(Number(price) * 100),
        currency: currency.toUpperCase(),
        billing_interval: billingInterval,
        trial_days: Number(trialDays) || 0,
        description,
        features: featuresText
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean),
        benefits: benefitsText
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["subscription", "plans", containerId],
      });
      onDone();
    },
  });

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Code
          </label>
          <input
            className={inputClass}
            placeholder="pro"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Name
          </label>
          <input
            className={inputClass}
            placeholder="Pro"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Payout wallet — where a successful charge lands
        </label>
        <select
          className={inputClass}
          value={payoutWalletId}
          onChange={(e) => setPayoutWalletId(e.target.value)}
        >
          <option value="">Choose…</option>
          {wallets?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label || w.owner_type} ({w.currency})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Price
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="9.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Currency
          </label>
          <input
            className={inputClass}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Interval
          </label>
          <select
            className={inputClass}
            value={billingInterval}
            onChange={(e) =>
              setBillingInterval(e.target.value as BillingInterval)
            }
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Trial days
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description
        </label>
        <input
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Features — what you get, one per line
          </label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder={"5 templates\nPriority support"}
            value={featuresText}
            onChange={(e) => setFeaturesText(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Benefits — why it matters, one per line
          </label>
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Ship faster without asking permission every time"
            value={benefitsText}
            onChange={(e) => setBenefitsText(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={
            !code || !name || !payoutWalletId || !price || mutation.isPending
          }
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {mutation.isPending ? "Creating…" : "Create plan"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't create — check the code is unique on this container.
          </p>
        )}
      </div>
    </div>
  );
}

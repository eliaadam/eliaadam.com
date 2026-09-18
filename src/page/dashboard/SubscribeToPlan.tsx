import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Star } from "lucide-react";
import { sdk, type BillingInterval } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { SubscribeForm } from "./Subscription";

function formatPrice(
  price: number,
  currency: string,
  interval: BillingInterval,
) {
  const major = (price / 100).toFixed(2);
  return `${currency} ${major}/${interval === "monthly" ? "mo" : "yr"}`;
}

/**
 * Plan-scoped subscribe entry point — deliberately requires no
 * currently-selected container at all, unlike Subscription.tsx's own
 * browse view. Exists specifically for the case Subscription.tsx
 * can't handle: someone with no container yet, following a link from
 * a template that requires a specific plan (Provisioning's own
 * SubscriptionRequiredError names the exact plan_id, which is exactly
 * what this route takes). Reuses SubscribeForm directly rather than
 * duplicating it — the same component Subscription.tsx's own
 * PlanCard already uses, passed the plan's own container_id exactly
 * as PlanCard already does (plans are always listed "for" the
 * container that owns them, so this was always the same value, even
 * in the existing flow).
 */
export function SubscribeToPlan() {
  const { planId } = useParams<{ planId: string }>();
  const { user } = useAuth();

  const {
    data: plan,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subscription", "plan", planId],
    queryFn: () => sdk.subscription.getPlan(planId!),
    enabled: Boolean(planId),
  });

  const { data: alreadySubscribed } = useQuery({
    queryKey: ["subscription", "has-active", user?.id, planId],
    queryFn: () => sdk.subscription.hasActiveSubscription(planId!),
    enabled: Boolean(user && planId),
  });

  return (
    <div className="max-w-md">
      <Link
        to="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      {isError && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          This plan doesn't exist, or isn't available anymore.
        </p>
      )}

      {isLoading && !isError && (
        <div className="h-64 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      )}

      {plan && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <div>
            <p className="text-base font-semibold tracking-tight">
              {plan.name}
            </p>
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
                  <Check
                    size={13}
                    className="mt-0.5 flex-none text-neutral-400"
                  />
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

          <div className="mt-2">
            {alreadySubscribed ? (
              <div className="flex items-start gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-500">
                <Star size={14} className="mt-0.5 flex-none" />
                You already have an active subscription to this plan.
              </div>
            ) : (
              <SubscribeForm
                plan={plan}
                containerId={plan.container_id}
                onDone={() => undefined}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

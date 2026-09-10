import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Wallet as WalletIcon } from "lucide-react";
import {
  sdk,
  type PaymentIntentStatus,
  type WalletOwnerType,
} from "../../lib/sdk";
import { useContainer } from "../../components/context/ContainerContext";
import type { PayoutStatus } from "../../lib/sdk/domains/payment";
import { WalletCreateMenu } from "../../components/payment/WalletCreateMenu";

const STATUS_STYLES: Record<PaymentIntentStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  refunded:
    "border border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400",
};

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  pending:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  processing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  succeeded: "bg-black text-white dark:bg-white dark:text-black",
  partially_succeeded:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const OWNER_TYPE_LABELS: Record<WalletOwnerType, string> = {
  container: "Container",
  personal: "Personal",
  container_shared: "Container + members",
  shared: "Members only",
};

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

/**
 * Now a wallet list, not a single balance card — a container can have
 * many wallets across its four ownership shapes. Picking a wallet
 * opens `PaymentWalletDetail.tsx`, where balance, participants (if
 * any), and collecting/transferring/cashing-out actually happen.
 */
export function Payment() {
  const { currentContainerId } = useContainer();
  const navigate = useNavigate();

  const { data: wallets, isLoading: walletsLoading } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const { data: intents, isLoading: intentsLoading } = useQuery({
    queryKey: ["payment", "intents", currentContainerId],
    queryFn: () => sdk.payment.listIntents(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ["payment", "payouts", currentContainerId],
    queryFn: () => sdk.payment.listPayouts(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Payments</h1>

      <h2 className="mt-6 text-sm font-semibold tracking-tight">Wallets</h2>
      <div className="mt-2">
        {walletsLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}
        {wallets && wallets.length === 0 && (
          <p className="py-4 text-sm text-neutral-500 dark:text-neutral-500">
            No wallets yet.
          </p>
        )}
        {wallets && wallets.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {wallets.map((wallet) => (
              <li key={wallet.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/dashboard/payment/wallets/${wallet.id}`)
                  }
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {wallet.owner_type === "container" ? (
                      <WalletIcon
                        className="flex-none text-neutral-400"
                        size={18}
                      />
                    ) : (
                      <Users className="flex-none text-neutral-400" size={18} />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {wallet.label ?? "Wallet"}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                        {OWNER_TYPE_LABELS[wallet.owner_type ?? "container"]}
                      </p>
                    </div>
                  </div>
                  <span className="flex-none text-sm font-semibold">
                    {formatAmount(wallet.balance, wallet.currency)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <WalletCreateMenu
          containerId={currentContainerId}
          onCreated={(id) => navigate(`/dashboard/payment/wallets/${id}`)}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold tracking-tight">
        All payments
      </h2>
      <div className="mt-2">
        {intentsLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}
        {intents && intents.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
            No payments yet.
          </p>
        )}
        {intents && intents.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {intents.map((intent) => (
              <li key={intent.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/payment/${intent.id}`)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {intent.description}
                    </p>
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {formatAmount(intent.amount, intent.currency)} ·{" "}
                      {intent.gateway}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[intent.status]}`}
                  >
                    {intent.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="mt-8 text-sm font-semibold tracking-tight">Payouts</h2>
      <div className="mt-2">
        {payoutsLoading && (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}
        {payouts && payouts.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-500">
            No payouts yet.
          </p>
        )}
        {payouts && payouts.length > 0 && (
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {payouts.map((payout) => (
              <li key={payout.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/dashboard/payment/payouts/${payout.id}`)
                  }
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {payout.narration}
                    </p>
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                      {formatAmount(payout.amount, payout.currency)} ·{" "}
                      {payout.destination_type === "bank"
                        ? "Bank"
                        : "Mobile money"}
                    </p>
                  </div>
                  <span
                    className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${PAYOUT_STATUS_STYLES[payout.status]}`}
                  >
                    {payout.status.replace("_", " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

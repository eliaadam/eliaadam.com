import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Wallet as WalletIcon } from "lucide-react";
import { sdk, type WalletOwnerType } from "../../../lib/sdk";
import { useContainer } from "../../../components/context/ContainerContext";
import { WalletCreateMenu } from "../../../components/payment/WalletCreateMenu";

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
 * Balance, participants, transfer, and cashout for a specific wallet
 * are more involved, genuinely wallet-scoped actions than the
 * "pay"/"history"/"payouts" flows this consolidation targets — kept
 * as PaymentWalletDetail's own separate page rather than guessed at
 * and inlined here without having seen its actual contents.
 */
export function WalletsTab() {
  const { currentContainerId } = useContainer();
  const navigate = useNavigate();

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
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
    <div>
      {isLoading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
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
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <li
              key={wallet.id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800"
            >
              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/payment/wallets/${wallet.id}`)
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
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

      <div className="mt-4">
        <WalletCreateMenu
          containerId={currentContainerId}
          onCreated={(id) => navigate(`/dashboard/payment/wallets/${id}`)}
        />
      </div>
    </div>
  );
}

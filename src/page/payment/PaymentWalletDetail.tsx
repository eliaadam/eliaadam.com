import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight, Banknote, Plus } from "lucide-react";
import { sdk, type WalletOwnerType } from "../../lib/sdk";
import { useAuth } from "../../components/context/Authcontext";
import { CreateIntentForm } from "../../components/payment/CreateIntentForm";
import { CreatePayoutForm } from "../../components/payment/CreatePayoutForm";
import { TransferForm } from "../../components/payment/TransferForm";
import { WalletParticipants } from "../../components/payment/WalletParticipants";

const OWNER_TYPE_LABELS: Record<WalletOwnerType, string> = {
  container: "Container wallet",
  personal: "Personal wallet",
  container_shared: "Container + members wallet",
  shared: "Members-only wallet",
};

function formatAmount(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

export function PaymentWalletDetail() {
  const { walletId } = useParams<{ walletId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<"none" | "collect" | "transfer" | "payout">(
    "none",
  );

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["payment", "wallet", walletId],
    queryFn: () => sdk.payment.getWallet(walletId!),
    enabled: Boolean(walletId),
  });

  const { data: participants } = useQuery({
    queryKey: ["payment", "wallet-participants", walletId],
    queryFn: () => sdk.payment.listWalletParticipants(walletId!),
    enabled: Boolean(walletId) && wallet?.owner_type !== "container",
  });

  // "container_shared": only a real container owner may manage
  // participants — the Gate's wildcard step, checked directly, not a
  // capability role.
  const { data: isContainerOwner } = useQuery({
    queryKey: ["authority", "can-create-shared-wallet", wallet?.container_id],
    queryFn: () =>
      sdk.authority.authorize({
        actor_id: user!.id,
        container_id: wallet!.container_id!,
        permission_code: "core.payment.wallet.create_shared",
      }),
    enabled: Boolean(
      user?.id &&
      wallet?.owner_type === "container_shared" &&
      wallet.container_id,
    ),
  });

  if (isLoading || !wallet) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-500">Loading…</p>
    );
  }

  const myParticipant = participants?.find((p) => p.actor_id === user?.id);
  const canManageParticipants =
    wallet.owner_type === "container_shared"
      ? Boolean(isContainerOwner?.allowed)
      : wallet.owner_type === "shared"
        ? myParticipant?.role === "admin"
        : false;

  return (
    <div className="max-w-xl">
      <Link
        to="/dashboard/payment"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Back to payments
      </Link>

      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        {OWNER_TYPE_LABELS[wallet.owner_type ?? "container"]}
      </p>
      <h1 className="text-xl font-semibold tracking-tight">
        {wallet.label ?? "Wallet"}
      </h1>
      <p className="mt-1 text-2xl font-semibold">
        {formatAmount(wallet.balance, wallet.currency)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPanel(panel === "collect" ? "none" : "collect")}
          className="flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
        >
          <Plus size={15} />
          Collect payment
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "transfer" ? "none" : "transfer")}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
        >
          <ArrowLeftRight size={15} />
          Transfer
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "payout" ? "none" : "payout")}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium dark:border-neutral-700"
        >
          <Banknote size={15} />
          Cash out
        </button>
      </div>

      {panel === "collect" && (
        <div className="mt-4">
          <CreateIntentForm
            wallet={wallet}
            onCreated={(id) => {
              setPanel("none");
              navigate(`/dashboard/payment/${id}`);
            }}
          />
        </div>
      )}
      {panel === "transfer" && (
        <div className="mt-4">
          <TransferForm
            fromWallet={wallet}
            onCompleted={() => setPanel("none")}
          />
        </div>
      )}
      {panel === "payout" && (
        <div className="mt-4">
          <CreatePayoutForm
            wallet={wallet}
            onCreated={(id) => {
              setPanel("none");
              navigate(`/dashboard/payment/payouts/${id}`);
            }}
          />
        </div>
      )}

      {(wallet.owner_type === "container_shared" ||
        wallet.owner_type === "shared") && (
        <div className="mt-6">
          <WalletParticipants
            wallet={wallet}
            canManage={canManageParticipants}
          />
        </div>
      )}
    </div>
  );
}

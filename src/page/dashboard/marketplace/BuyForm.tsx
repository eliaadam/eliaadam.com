import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { sdk, type Listing } from "../../../lib/sdk";
import { useContainer } from "../../../components/context/ContainerContext";
import { DirectPayFlow } from "../../../components/payment-gateway/DirectPayFlow";
import { cn } from "../../../design-system/lib/utils";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

/** Split out of what used to be one large Marketplace.tsx. */

export function BuyForm({
  listing,
  onDone,
}: {
  listing: Listing;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { currentContainerId } = useContainer();

  const [walletId, setWalletId] = useState("");
  const [payMode, setPayMode] = useState<"wallet" | "direct">("wallet");

  const { data: wallets } = useQuery({
    queryKey: ["payment", "wallets", currentContainerId],
    queryFn: () => sdk.payment.listWallets(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  // Routed through capabilities.core.order rather than calling
  // sdk.surfacing.purchase() directly — a single-line, quantity=1
  // cart behaves identically to a direct purchase underneath (order
  // just calls surfacing.purchase() once), but now produces a real
  // Order record the buyer can look back at (see MyOrders.tsx).
  const mutation = useMutation({
    mutationFn: () =>
      sdk.order.createOrder({
        paying_wallet_id: walletId,
        lines: [{ listing_id: listing.id, quantity: 1 }],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surfacing"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });

  const orderResult = mutation.data;
  const lineResult = orderResult?.line_results[0];

  if (orderResult && lineResult) {
    if (lineResult.purchase_status === "completed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <span>
            {listing.pricing_mode === "free"
              ? "It's yours. Check your account for access."
              : "Purchased. Check your account for access."}
          </span>
        </div>
      );
    }

    if (lineResult.purchase_status === "subscribed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-xs text-success">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          <span>Subscribed. You'll be billed on the plan's own schedule.</span>
        </div>
      );
    }

    if (lineResult.purchase_status === "fulfillment_failed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-foreground">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Payment succeeded, but something went wrong granting access. Contact
            the seller.
          </span>
        </div>
      );
    }

    if (lineResult.purchase_status === "subscription_failed") {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-xs text-error">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Couldn't set up the subscription. Check the wallet balance and try
            again.
          </span>
        </div>
      );
    }

    if (lineResult.purchase_status === "payment_failed") {
      // order.createOrder() catches this internally rather than
      // throwing (see capabilities.core.order's own order_service.py
      // module docstring), so this outcome now arrives as a normal,
      // successful mutation.data with a failed line, never via
      // mutation.isError below.
      return (
        <div className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/5 p-3 text-xs text-error">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            {lineResult.error ??
              "Couldn't complete the purchase. Check the wallet balance and try again."}
          </span>
        </div>
      );
    }
  }

  if (!currentContainerId) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Select a container first to choose a wallet to pay from.
      </p>
    );
  }

  const canPayDirect = listing.pricing_mode !== "free";

  return (
    <div className="flex flex-col gap-3">
      {canPayDirect && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setPayMode("wallet")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              payMode === "wallet"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Wallet
          </button>

          <button
            type="button"
            onClick={() => setPayMode("direct")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              payMode === "direct"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Pay direct
          </button>
        </div>
      )}

      {payMode === "direct" && canPayDirect ? (
        // NOTE: still goes through paymentGateway.requestDirectPurchase()
        // directly, NOT through order — its own backend implementation
        // was never confirmed this session (whether it calls
        // surfacing.purchase() internally, or something else), so this
        // path is deliberately left untouched rather than rewired on a
        // guess. A direct-pay purchase still won't produce an Order
        // record — a known, separate gap from the wallet path above.
        <DirectPayFlow
          onSubmit={(buyerPhone) =>
            sdk.paymentGateway.requestDirectPurchase(listing.id, {
              method_type: "mobile_money",
              buyer_phone: buyerPhone,
            })
          }
          successLabel={
            listing.pricing_mode === "subscription"
              ? "Subscribed. You'll be billed on the plan's own schedule."
              : "Purchased. Check your account for access."
          }
          invalidateKeys={[["surfacing"]]}
        />
      ) : (
        <>
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  listing.pricing_mode === "free"
                    ? "Account to use..."
                    : "Pay from..."
                }
              />
            </SelectTrigger>

            <SelectContent>
              {wallets?.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.label || wallet.owner_type} ({wallet.currency}{" "}
                  {(wallet.balance / 100).toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={!walletId || mutation.isPending}
            >
              {mutation.isPending
                ? listing.pricing_mode === "subscription"
                  ? "Subscribing..."
                  : "Buying..."
                : listing.pricing_mode === "free"
                  ? "Get it free"
                  : listing.pricing_mode === "subscription"
                    ? "Subscribe"
                    : "Confirm"}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          </div>

          {mutation.isError && (
            <p className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-xs text-error">
              Couldn't complete the purchase. Something unexpected went wrong
              — try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}

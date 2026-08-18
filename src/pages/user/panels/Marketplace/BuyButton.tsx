import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi as api, toMajor } from "./marketplace-api";

type Listing = { id: string; title: string; price: number; currency: string };

/**
 * BuyButton — places an order for a listing and starts payment. On success:
 *   - free item → order is fulfilled immediately (shows "Owned")
 *   - paid item with a checkout_url → opens the gateway checkout
 *   - paid item settled asynchronously → order appears in My Orders as pending,
 *     then becomes fulfilled when PaymentSucceeded fires server-side
 *
 * The buy action is the same for every asset type; the DIFFERENT per-type
 * interaction (download/install/track) happens after fulfillment, in My Orders.
 */
export default function BuyButton({
  containerId,
  listing,
}: {
  containerId: string;
  listing: Listing;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState<string | null>(null);

  const buy = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/orders`, {
        listing_id: listing.id,
      }),
    onSuccess: (res: any) => {
      const order = res?.order;
      const payment = res?.payment;
      qc.invalidateQueries({
        queryKey: ["marketplace", "orders", containerId],
      });

      if (payment?.status === "not_required" || order?.status === "fulfilled") {
        setNote("Purchased — see My Orders.");
        return;
      }
      const checkout = payment?.action?.checkout_url;
      if (checkout) {
        window.open(checkout, "_blank");
        setNote(
          "Complete payment in the opened window. Your order will unlock once paid.",
        );
      } else {
        setNote("Payment initiated — check My Orders once it settles.");
      }
    },
    onError: (e: any) => setNote(e.message),
  });

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => buy.mutate()}
        disabled={buy.isPending}
        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {buy.isPending
          ? "…"
          : listing.price > 0
            ? `Buy · ${toMajor(listing.price)} ${listing.currency}`
            : "Get free"}
      </button>
      {note && <span className="text-[10px] text-neutral-500">{note}</span>}
    </div>
  );
}

// SNIPPET — how to mount MarketplaceCheckout from a listing in DiscoverPanel.
// Not a full panel; shows the buy-action integration point.

import { useState } from "react";
import MarketplaceCheckout from "./Marketplacecheckout";

function ListingBuyAction({
  listing,
  buyerContainerId,
  onDone,
}: {
  listing: { id: string; price: number; currency: string; title: string };
  buyerContainerId: string;
  onDone?: () => void;
}) {
  const [buying, setBuying] = useState(false);

  if (buying) {
    return (
      <MarketplaceCheckout
        listingId={listing.id}
        buyerContainerId={buyerContainerId}
        price={listing.price}
        currency={listing.currency}
        onPaid={() => {
          setBuying(false);
          onDone?.();
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setBuying(true)}
      className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
    >
      Buy
    </button>
  );
}

export default ListingBuyAction;

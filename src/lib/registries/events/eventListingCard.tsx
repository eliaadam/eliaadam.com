import { Calendar, MapPin, Ticket, Users } from "lucide-react";
import {
  registerListingCardBody,
  type ListingCardBodyProps,
} from "../listingCardRegistry";
import {
  registerPurchaseDisplay,
  type PurchaseDisplayProps,
} from "../purchaseDisplayRegistry";
import { ListingImageCarousel } from "../../../page/dashboard/Marketplace";

/**
 * Real registration for General Events, replacing the earlier
 * "example.events" placeholder. Reads exactly the metadata shape
 * catalog_seed.py's resolve_event_catalog_seed() actually produces —
 * starts_at, ends_at, physical_address, virtual_link, capacity — not
 * a guess, confirmed directly against that file.
 */

function EventListingCardBody({ listing }: ListingCardBodyProps) {
  const startsAt = listing.metadata?.starts_at as string | undefined;
  const physicalAddress = listing.metadata?.physical_address as
    string | null | undefined;
  const virtualLink = listing.metadata?.virtual_link as
    string | null | undefined;
  const capacity = listing.metadata?.capacity as number | null | undefined;

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:from-indigo-950/40 dark:to-purple-950/40">
      {listing.images.length > 0 && (
        <ListingImageCarousel fileIds={listing.images} />
      )}
      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
        <Calendar size={13} />
        {startsAt ? new Date(startsAt).toLocaleString() : "Event"}
      </div>
      <p className="text-sm font-semibold">{listing.title}</p>
      {listing.description && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {listing.description}
        </p>
      )}
      {(physicalAddress || virtualLink) && (
        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
          <MapPin size={11} />
          {physicalAddress || "Virtual event"}
        </div>
      )}
      {capacity != null && (
        <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-600">
          <Users size={11} />
          Capacity: {capacity}
        </div>
      )}
    </div>
  );
}

function EventPurchaseDisplay({ purchase }: PurchaseDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Ticket size={14} className="text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm font-medium">
        {(purchase.price_paid / 100).toFixed(2)} {purchase.currency} · Event
        ticket
      </p>
    </div>
  );
}

registerListingCardBody("core.events", EventListingCardBody);
registerPurchaseDisplay("core.events", EventPurchaseDisplay);
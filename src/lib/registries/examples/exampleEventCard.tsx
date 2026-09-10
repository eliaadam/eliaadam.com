/* eslint-disable react-refresh/only-export-components */
import { Calendar, MapPin, Ticket } from "lucide-react";
import {
  registerListingCardBody,
  type ListingCardBodyProps,
} from "../listingCardRegistry";
import {
  registerPurchaseDisplay,
  type PurchaseDisplayProps,
} from "../purchaseDisplayRegistry";

/**
 * EXAMPLE registration — proves the card/purchase-display registry
 * mechanism end to end, matching the backend's own synthetic
 * "example.events" catalog_registry test. Not a real capability; no
 * "example.events" backend resolver actually exists to seed a real
 * listing with this source_capability, so nothing in the live app
 * currently exercises this dispatch path in production — it's here
 * purely to prove the mechanism works before a real consumer needs
 * it, and as a copyable starting point for whoever builds Events,
 * Ticketing, or whatever comes first for real.
 *
 * DELETE this file (and its import in registrations.ts) once a real
 * capability registers its own card here instead.
 */

function ExampleEventCardBody({ listing }: ListingCardBodyProps) {
  // A real registration would read whatever it seeded via
  // CatalogSeed.metadata at listing-creation time — e.g.
  // listing.metadata.event_date, listing.metadata.venue.
  const eventDate = listing.metadata?.event_date as string | undefined;
  const venue = listing.metadata?.venue as string | undefined;

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:from-indigo-950/40 dark:to-purple-950/40">
      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
        <Calendar size={13} />
        {eventDate ?? "Example Event"}
      </div>
      <p className="text-sm font-semibold">{listing.title}</p>
      {listing.description && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {listing.description}
        </p>
      )}
      {venue && (
        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
          <MapPin size={11} />
          {venue}
        </div>
      )}
    </div>
  );
}

function ExampleEventPurchaseDisplay({ purchase }: PurchaseDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Ticket size={14} className="text-indigo-600 dark:text-indigo-400" />
      <p className="text-sm font-medium">
        {(purchase.price_paid / 100).toFixed(2)} {purchase.currency} · Example
        Event ticket
      </p>
    </div>
  );
}

registerListingCardBody("example.events", ExampleEventCardBody);
registerPurchaseDisplay("example.events", ExampleEventPurchaseDisplay);

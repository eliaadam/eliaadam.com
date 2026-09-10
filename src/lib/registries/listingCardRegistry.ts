import type { ComponentType } from "react";
import type { Listing } from "../sdk";

/**
 * Frontend counterpart to the backend's catalog_registry.py — same
 * shape, same reasoning: Marketplace should never hardcode which
 * capabilities exist. A capability whose listings need to look
 * genuinely different from a plain product card (an Event needs a
 * date/venue, a Ticket needs a seat class) registers its own card
 * body component here, keyed by source_capability. Marketplace's own
 * BrowseListingCard becomes a thin dispatcher: look up a registered
 * body for the listing's source_capability, fall back to the generic
 * one if nothing's registered.
 *
 * Deliberately registers only the "body" — the part that answers
 * "what is this thing" (image, title, whatever capability-specific
 * details matter) — not the whole card including the Buy flow.
 * Wallet selection and pricing-mode-aware button text are genuinely
 * capability-agnostic; reimplementing that per capability would just
 * be duplicated, driftable logic for no real benefit.
 */

export interface ListingCardBodyProps {
  listing: Listing;
}

const registry = new Map<string, ComponentType<ListingCardBodyProps>>();

export function registerListingCardBody(
  sourceCapability: string,
  component: ComponentType<ListingCardBodyProps>,
): void {
  registry.set(sourceCapability, component);
}

export function getListingCardBody(
  sourceCapability: string,
): ComponentType<ListingCardBodyProps> | undefined {
  return registry.get(sourceCapability);
}

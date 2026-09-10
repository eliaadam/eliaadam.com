import type { ComponentType } from "react";
import type { Purchase } from "../sdk";

/**
 * Same shape as listingCardRegistry.ts, for MyPurchases.tsx instead
 * of Marketplace.tsx — what a BUYER sees after purchasing, which is
 * often a genuinely different concern from the browse card. A Ticket
 * purchase probably needs a QR code or seat number here; a plain
 * digital product just needs a download link.
 *
 * Keyed by Purchase.source_capability — a snapshot of the purchased
 * listing's own source_capability at purchase time (see the backend's
 * PurchaseState.source_capability docstring), not a live lookup back
 * to the listing. Nullable on older purchase rows created before this
 * field existed — getPurchaseDisplay() returns undefined for those,
 * same as for any capability that never registered a display, and
 * MyPurchases falls back to its own generic row rendering.
 */

export interface PurchaseDisplayProps {
  purchase: Purchase;
}

const registry = new Map<string, ComponentType<PurchaseDisplayProps>>();

export function registerPurchaseDisplay(
  sourceCapability: string,
  component: ComponentType<PurchaseDisplayProps>,
): void {
  registry.set(sourceCapability, component);
}

export function getPurchaseDisplay(
  sourceCapability: string | null,
): ComponentType<PurchaseDisplayProps> | undefined {
  if (!sourceCapability) return undefined;
  return registry.get(sourceCapability);
}

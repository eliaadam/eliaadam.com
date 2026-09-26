/** Shared constants and helpers across the marketplace component
 * files — split out of what used to be one large Marketplace.tsx. */

export const segmentedButtonClass =
  "rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors";

export const activeSegmentClass =
  "border-primary bg-primary text-primary-foreground";

export const inactiveSegmentClass =
  "bg-surface text-muted-foreground hover:bg-muted hover:text-foreground";

export function formatPrice(price: number, currency: string) {
  return `${currency} ${(price / 100).toFixed(2)}`;
}

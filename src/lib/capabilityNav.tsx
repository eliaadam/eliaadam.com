import type { LucideIcon } from "lucide-react";
import { CreditCard, Shield } from "lucide-react";

export interface StaticCapabilityNavEntry {
  /** Must match the manifest's own `feature_code` exactly — this is
   * how a licensed-but-not-yet-in-this-list capability gets silently
   * skipped rather than crashing (see CapabilityNav's filter). */
  featureCode: string;
  label: string;
  icon: LucideIcon;
  route: string;
  requiredPermission: string;
  order: number;
}

/**
 * The single place nav presentation (icon, label, order, route) lives
 * now — previously this came from each capability manifest's own
 * `navigation()` (Python, emoji icon strings). Moving it here means a
 * frontend dev can retitle, reorder, or swap an icon without a
 * backend deploy, and get real Lucide icons instead of emoji glyphs
 * that render inconsistently across platforms/fonts.
 *
 * `requiredPermission` still has to be a REAL permission code some
 * manifest declares — this is exactly the kind of string the
 * `check_permission_codes.py` CI script cross-checks, so a typo here
 * fails the build instead of silently hiding a nav item forever.
 *
 * Only two entries are filled in below — `core.payment` and
 * `core.admin` — because those are the only two manifests actually
 * reviewed in this codebase so far. DO NOT invent a route or
 * required_permission for the rest by guessing; that's exactly the
 * class of bug the CI check exists to catch (see the payout
 * permission incident). Add each remaining capability's entry by
 * copying its real `navigation()` values — `route`,
 * `required_permission` — straight out of that capability's own
 * manifest.py, and pick whatever Lucide icon best matches its old
 * emoji as a starting point (feel free to improve it once it's real).
 */
export const CAPABILITY_NAV: StaticCapabilityNavEntry[] = [
  {
    featureCode: "core.payment",
    label: "Payments",
    icon: CreditCard,
    route: "payment",
    requiredPermission: "core.payment.wallet.view",
    order: 60,
  },
  {
    featureCode: "core.admin",
    label: "Admin",
    icon: Shield,
    route: "admin/hub",
    requiredPermission: "core.admin.actor.view",
    order: 90,
  },

  // TODO — fill in from each manifest's own navigation():
  //   system.document, system.provisioning, core.form,
  //   core.communication, core.subscription, core.marketplace,
  //   core.inventory, core.events, core.payment_gateway, core.tender,
  //   core.paytrack
  // A capability missing from this list simply won't appear in the
  // nav even if licensed — CapabilityNav filters against this array,
  // not the other way around — so nothing breaks by leaving these
  // out for now, they're just invisible until added.
];

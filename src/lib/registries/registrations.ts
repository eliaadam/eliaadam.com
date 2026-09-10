/**
 * Runs every registry-registration module's side effects, once, at
 * app startup — the frontend counterpart to a backend AppConfig's own
 * ready(). Import this ONCE from App.tsx (or main.tsx) before
 * anything renders; each imported module calls its own
 * registerListingCardBody()/registerPurchaseDisplay()/etc. as a
 * module-level side effect just by being imported.
 *
 * Add a new capability's own registration import here when it needs
 * one. Remove the example import once a real capability replaces it.
 */

import "./examples/exampleEventCard";

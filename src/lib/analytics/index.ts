import { tracker, type TrackerStatus } from "./tracker";

export { tracker, TRACKER_VERSION, type TrackerStatus, type TrackerOptions } from "./tracker";
export { normalizeRoute, sanitizeMessage, validComponent } from "./normalize";

/** For the API client: report one call. Safe to call from anywhere; does nothing if tracking is off. */
export function trackApiCall(path: string, method: string, status: number, durationMs: number): void {
  tracker.trackApiCall(path, method, status, durationMs);
}

/** A deliberate, named interaction a click doesn't describe — "open", "select", "toggle"… */
export function trackInteraction(component: string, action: string): void {
  tracker.trackInteraction(component, action);
}

/** For forms that submit through a button handler rather than a <form> submit event. */
export function trackFormSubmit(component: string, outcome: "ok" | "error"): void {
  tracker.trackFormSubmit(component, outcome);
}

export type { TrackerStatus as AnalyticsStatus };

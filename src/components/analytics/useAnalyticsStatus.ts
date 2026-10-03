import { useSyncExternalStore } from "react";
import { tracker, type TrackerStatus } from "../../lib/analytics";

const subscribe = (listener: () => void) => tracker.subscribe(listener);
const snapshot = () => tracker.getStatus();
const server = (): TrackerStatus => "not_started";

/** Whether tracking is currently on in this browser, and if not, why. */
export function useAnalyticsStatus(): TrackerStatus {
  return useSyncExternalStore(subscribe, snapshot, server);
}

import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../lib/query/Api";
import { getAuthToken } from "../../lib/other/authToken";
import { tracker } from "../../lib/analytics";
import { useContainer } from "../context/ContainerContext";

/** The container the person currently has selected. Held at module level because the tracker reads it from
 * outside React (inside event handlers) at the moment each event happens. */
let selectedContainerId: string | null = null;

/**
 * Starts the tracker and reports a page view on every route change. Mount it ONCE, inside the Router and above
 * every route — including the public ones (/c/...), which is where anonymous visits happen:
 *
 *   <BrowserRouter>
 *     <AnalyticsProvider>
 *       ...everything...
 *
 * Only the PATH is passed on — never the query string, which is where search boxes put what people type.
 */
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    tracker.init({ endpoint: `${API_BASE_URL}/api/analytics`, getAuthToken, getContainerId: () => selectedContainerId });
  }, []);

  useEffect(() => {
    tracker.pageView(location.pathname);
  }, [location.pathname]);

  return <>{children}</>;
}

/**
 * Tells the tracker which container is selected, so events can be attributed to it. Render it once, anywhere
 * INSIDE ContainerProvider (it renders nothing). Public routes outside the provider simply have no container.
 */
export function AnalyticsContainerSync() {
  const { currentContainerId } = useContainer();
  useEffect(() => {
    selectedContainerId = currentContainerId;
    return () => { selectedContainerId = null; };
  }, [currentContainerId]);
  return null;
}

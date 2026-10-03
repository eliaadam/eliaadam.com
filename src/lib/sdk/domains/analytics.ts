import { api } from "../../query/Api";

/**
 * Typed client for `core.analytics`'s operator and privacy endpoints (`/api/analytics/...`).
 * (Collection itself — `collect/` and `config/` — is the tracker's job and doesn't go through here.)
 */

export type AnalyticsEventType =
  | "page_view" | "page_leave" | "heartbeat" | "impression" | "click" | "interaction" | "form_start" | "form_submit"
  | "form_abandon" | "rage_click" | "dead_click" | "error" | "api_call";

export const ANALYTICS_EVENT_TYPES: AnalyticsEventType[] = [
  "page_view", "page_leave", "heartbeat", "impression", "click", "interaction", "form_start", "form_submit",
  "form_abandon", "rage_click", "dead_click", "error", "api_call",
];

export interface AnalyticsEvent {
  event_id: string;
  occurred_at: string;
  type: AnalyticsEventType;
  session_id: string;
  visitor_id: string;
  actor_id: string | null;
  container_id: string | null;
  container_verified: boolean;
  page_view_id: string | null;
  route: string;
  component: string | null;
  props: Record<string, unknown>;
}

export interface AnalyticsOverview {
  window_hours: number;
  since: string;
  totals: { events: number; visitors: number; authenticated_users: number; page_views: number; errors: number; sessions: number };
  by_type: Array<{ type: AnalyticsEventType; count: number }>;
  top_routes: Array<{ route: string; views: number; visitors: number }>;
  top_components: Array<{ component: string; clicks: number; impressions: number; friction: number }>;
}

export interface ActorExport {
  actor_id: string;
  visitor_ids: string[];
  truncated: boolean;
  sessions: Array<Record<string, unknown>>;
  events: AnalyticsEvent[];
}

export interface ErasureResult { events: number; sessions: number; links: number }

const base = "/api/analytics";

function qs(params: Record<string, string | number | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") out.set(k, String(v));
  const s = out.toString();
  return s ? `?${s}` : "";
}

export const analytics_ = {
  overview: (hours = 24) => api.get<AnalyticsOverview>(`${base}/admin/overview/${qs({ hours })}`),
  recent: (p: { limit?: number; type?: AnalyticsEventType; actor_id?: string } = {}) =>
    api.get<{ results: AnalyticsEvent[] }>(`${base}/admin/recent/${qs(p)}`).then((r) => r.results),
  exportActor: (actorId: string) => api.get<ActorExport>(`${base}/admin/export-actor/${qs({ actor_id: actorId })}`),
  eraseActor: (actorId: string) => api.post<{ erased: ErasureResult }>(`${base}/admin/erase-actor/`, { actor_id: actorId }).then((r) => r.erased),
  /** Any signed-in person, about themselves only. */
  eraseMe: () => api.post<{ erased: ErasureResult }>(`${base}/me/erase/`, {}).then((r) => r.erased),
};

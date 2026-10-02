import { api } from "../../query/Api";

/** Typed client for `core.search`'s REST API (`/api/search/...`) —
 * platform-wide full-text search, backed by PostgreSQL's native
 * search engine. `query()` searches one container; `querySystemWide()`
 * searches every container the signed-in actor has access to, resolved
 * server-side — there's no way to pass a container list in from here,
 * by design. No public/unauthenticated endpoint — search spans
 * everything indexed for a container, including non-public internal
 * items, so it's permission-gated like any other dashboard feature. */

export interface SearchHit {
  container_id: string;
  source_capability: string;
  source_type: string;
  source_id: string;
  title: string;
  snippet: string;
  route: string;
  /** Real, structured fields a source chose to expose — status, a
   * count, whatever's genuinely useful to see without navigating away.
   * Shape varies by source_capability/source_type; render generically. */
  structured_data: Record<string, unknown>;
  rank: number;
}

export interface SearchSource {
  source_capability: string;
  source_type: string;
}

export interface ReindexResult extends SearchSource {
  count: number;
}

function base(containerId: string) {
  return `/api/search/containers/${containerId}`;
}

function buildQueryString(q: string, options?: { sources?: string[]; limit?: number }) {
  const qs = new URLSearchParams({ q });
  if (options?.sources?.length) qs.set("sources", options.sources.join(","));
  if (options?.limit) qs.set("limit", String(options.limit));
  return qs.toString();
}

function query(containerId: string, q: string, options?: { sources?: string[]; limit?: number }) {
  return api.get<{ results: SearchHit[] }>(`${base(containerId)}/?${buildQueryString(q, options)}`).then((r) => r.results);
}

/** Searches every container the signed-in actor has search access to.
 * Until that's wired to this platform's real container/permission
 * system on the backend, this always returns an empty list — not an
 * error, just nothing — see the backend wiring notes. */
function querySystemWide(q: string, options?: { sources?: string[]; limit?: number }) {
  return api.get<{ results: SearchHit[] }>(`/api/search/system/?${buildQueryString(q, options)}`).then((r) => r.results);
}

function listMyContainers() {
  return api.get<{ container_ids: string[] }>("/api/search/system/containers/").then((r) => r.container_ids);
}

function listSources(containerId: string) {
  return api.get<{ sources: SearchSource[] }>(`${base(containerId)}/sources/`).then((r) => r.sources);
}

function reindexAll(containerId: string) {
  return api.post<{ reindexed: ReindexResult[] }>(`${base(containerId)}/reindex/`, {}).then((r) => r.reindexed);
}

function reindexOne(containerId: string, sourceCapability: string, sourceType: string) {
  return api.post<ReindexResult>(`${base(containerId)}/reindex/${sourceCapability}/${sourceType}/`, {});
}

export const search_ = { query, querySystemWide, listMyContainers, listSources, reindexAll, reindexOne };

import { api } from "../../query/Api";

/**
 * Typed client for `core.settings`'s REST API (`/api/settings/...`).
 * Three scopes — platform, container, actor ("me") — share an
 * identical shape (list current / get / set / clear / history); only
 * container scope needs a containerId. `listDefinitions()` is the
 * registry an admin UI uses to show known settings with a proper
 * label, description, and typed input instead of a bare key/value box
 * — but setting an unregistered key is equally valid, just with no
 * validation and no label to show.
 */

export type SettingScope = "platform" | "container" | "actor";
export type ValueType = "string" | "number" | "boolean" | "json";

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  value_type: ValueType;
  choices: unknown[] | null;
  allowed_scopes: string[];
  default: unknown;
}

export interface SettingValue {
  id: string;
  scope: string;
  scope_id: string;
  key: string;
  value: unknown;
  revision: number;
  is_cleared: boolean;
  set_by_actor_id: string | null;
  set_at: string | null;
}

/** What `getPlatform`/`getContainer`/`getMySetting` return for a key
 * that's never been set — same shape, minus the revision/audit
 * fields, flagged by `is_set: false`. */
export interface UnsetSettingValue {
  key: string;
  value: null;
  is_set: false;
}

export interface ResolvedSetting {
  key: string;
  value: unknown;
  source: "actor" | "container" | "platform" | "default";
  is_registered: boolean;
}

const base = "/api/settings";
const enc = encodeURIComponent;

function listDefinitions() {
  return api.get<{ definitions: SettingDefinition[] }>(`${base}/registry/`).then((r) => r.definitions);
}

// -- platform ------------------------------------------------------------------------------

function listPlatform() {
  return api.get<{ settings: SettingValue[] }>(`${base}/platform/`).then((r) => r.settings);
}
function getPlatform(key: string) {
  return api.get<SettingValue | UnsetSettingValue>(`${base}/platform/${enc(key)}/`);
}
function setPlatform(key: string, value: unknown) {
  return api.post<SettingValue>(`${base}/platform/${enc(key)}/set/`, { value });
}
function clearPlatform(key: string) {
  return api.post<SettingValue>(`${base}/platform/${enc(key)}/clear/`, {});
}
function platformHistory(key: string, options?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (options?.limit) qs.set("limit", String(options.limit));
  if (options?.offset) qs.set("offset", String(options.offset));
  return api.get<{ history: SettingValue[] }>(`${base}/platform/${enc(key)}/history/?${qs.toString()}`).then((r) => r.history);
}

// -- container ----------------------------------------------------------------------------

function listContainer(containerId: string) {
  return api.get<{ settings: SettingValue[] }>(`${base}/containers/${containerId}/`).then((r) => r.settings);
}
function getContainer(containerId: string, key: string) {
  return api.get<SettingValue | UnsetSettingValue>(`${base}/containers/${containerId}/${enc(key)}/`);
}
function setContainer(containerId: string, key: string, value: unknown) {
  return api.post<SettingValue>(`${base}/containers/${containerId}/${enc(key)}/set/`, { value });
}
function clearContainer(containerId: string, key: string) {
  return api.post<SettingValue>(`${base}/containers/${containerId}/${enc(key)}/clear/`, {});
}
function containerHistory(containerId: string, key: string, options?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (options?.limit) qs.set("limit", String(options.limit));
  if (options?.offset) qs.set("offset", String(options.offset));
  return api.get<{ history: SettingValue[] }>(`${base}/containers/${containerId}/${enc(key)}/history/?${qs.toString()}`).then((r) => r.history);
}
/** The cascaded effective value (actor > container > platform >
 * default) for the CALLING actor — not a generic "resolve for anyone"
 * lookup; the backend always uses the caller's own identity for the
 * actor half of the cascade. */
function resolve(containerId: string, key: string) {
  return api.get<ResolvedSetting>(`${base}/containers/${containerId}/resolve/?key=${enc(key)}`);
}

// -- me (actor scope — self-service only) --------------------------------------------------

function listMySettings() {
  return api.get<{ settings: SettingValue[] }>(`${base}/me/`).then((r) => r.settings);
}
function getMySetting(key: string) {
  return api.get<SettingValue | UnsetSettingValue>(`${base}/me/${enc(key)}/`);
}
function setMySetting(key: string, value: unknown) {
  return api.post<SettingValue>(`${base}/me/${enc(key)}/set/`, { value });
}
function clearMySetting(key: string) {
  return api.post<SettingValue>(`${base}/me/${enc(key)}/clear/`, {});
}

export const settings_ = {
  listDefinitions,
  listPlatform, getPlatform, setPlatform, clearPlatform, platformHistory,
  listContainer, getContainer, setContainer, clearContainer, containerHistory, resolve,
  listMySettings, getMySetting, setMySetting, clearMySetting,
};

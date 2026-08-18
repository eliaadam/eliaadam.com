import { type MaicoreClientConfig, MaicoreClient } from "./system-sdk";

const STORAGE_KEY = "use_token";

function loadToken(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function persistToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  persistToken(null);
}

const config: MaicoreClientConfig = {
  baseUrl: import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000",
  token: loadToken(),
  useSanctumCookies: false,
  debug: import.meta.env.DEV,
  onUnauthorized: () => {
    // Clear both the SDK token and localStorage
    system.setToken(undefined);
    clearToken();
    localStorage.removeItem("maicore_actor");
  },
};

export const system = new MaicoreClient(config);

export function setAuthToken(token: string | null): void {
  system.setToken(token ?? undefined);
  persistToken(token);
}

// ═══════════════════════════════════════════════════════════
// ADD THIS TO THE BOTTOM OF src/lib/system.ts
// ═══════════════════════════════════════════════════════════

export const templateApi = {
  listKinds: () => tFetch("GET", "/api/hierarchy/container-kinds"),
  createKind: (d: Record<string, unknown>) => tFetch("POST", "/api/hierarchy/container-kinds", d),
  updateKind: (id: string, d: Record<string, unknown>) => tFetch("PUT", `/api/hierarchy/container-kinds/${id}`, d),
  deleteKind: (id: string) => tFetch("DELETE", `/api/hierarchy/container-kinds/${id}`),

  listTemplates: () => tFetch("GET", "/api/hierarchy/container-templates"),
  createTemplate: (d: Record<string, unknown>) => tFetch("POST", "/api/hierarchy/container-templates", d),
  updateTemplate: (id: string, d: Record<string, unknown>) => tFetch("PUT", `/api/hierarchy/container-templates/${id}`, d),
  deleteTemplate: (id: string) => tFetch("DELETE", `/api/hierarchy/container-templates/${id}`),

  listHierarchies: () => tFetch("GET", "/api/hierarchy/hierarchy-templates"),
  getHierarchy: (id: string) => tFetch("GET", `/api/hierarchy/hierarchy-templates/${id}`),
  createHierarchy: (d: Record<string, unknown>) => tFetch("POST", "/api/hierarchy/hierarchy-templates", d),
  updateHierarchy: (id: string, d: Record<string, unknown>) => tFetch("PUT", `/api/hierarchy/hierarchy-templates/${id}`, d),
  deleteHierarchy: (id: string) => tFetch("DELETE", `/api/hierarchy/hierarchy-templates/${id}`),
  instantiate: (id: string, d: Record<string, unknown>) => tFetch("POST", `/api/hierarchy/hierarchy-templates/${id}/instantiate`, d),
};

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function tFetch(method: string, path: string, body?: Record<string, unknown>) {
  const token = localStorage.getItem("use_token");
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const err = new Error(b.message ?? `HTTP ${res.status}`) as Error & {
      status?: number;
      errors?: unknown;
    };
    err.status = res.status;
    err.errors = b.errors;
    throw err;
  }

  if (res.status === 204) return null;
  const json = await res.json();
  return json.data ?? json;
}

function uHeaders(): Record<string, string> {
  const token = localStorage.getItem("use_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function uFetch(method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: uHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const err: any = new Error(b.message ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.errors = b.errors;
    throw err;
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json.data ?? json;
}

export const userApi = {
  // Discovery
  discoverContainers: (params?: { parent_id?: string; kind?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.parent_id) qs.set("parent_id", params.parent_id);
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return uFetch("GET", `/api/hierarchy/containers/discover${q ? `?${q}` : ""}`);
  },

  searchContainers: (query: string) =>
    uFetch("GET", `/api/hierarchy/containers/search?q=${encodeURIComponent(query)}&limit=20`),

  getContainer: (id: string) => uFetch("GET", `/api/hierarchy/containers/${id}`),

  // Memberships
  myMemberships: (actorId: string) =>
    uFetch("GET", `/api/hierarchy/memberships?actor_id=${actorId}`),

  joinContainer: (actorId: string, containerId: string) =>
    uFetch("POST", "/api/hierarchy/memberships/join", { actor_id: actorId, container_id: containerId }),

  activateMembership: (id: string) => uFetch("POST", `/api/hierarchy/memberships/${id}/activate`),

  leaveMembership: (id: string) => uFetch("POST", `/api/hierarchy/memberships/${id}/leave`),

  // Invitations
  listInvitations: (containerId: string) =>
    uFetch("GET", `/api/hierarchy/containers/${containerId}/invitations`),

  createInvitation: (containerId: string, inviteeId: string, expiresAt?: string, roles?: string[]) =>
    uFetch("POST", "/api/hierarchy/invitations", {
      container_id: containerId,
      invitee_id: inviteeId,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(roles && roles.length > 0 ? { roles } : {}),
    }),

  redeemInvitation: (token: string, actorId: string) =>
    uFetch("POST", "/api/hierarchy/invitations/redeem", { token, actor_id: actorId }),

  revokeInvitation: (id: string) => uFetch("POST", `/api/hierarchy/invitations/${id}/revoke`),

  // Hierarchy templates (for self-service instantiation)
  listHierarchyTemplates: () => uFetch("GET", "/api/hierarchy/hierarchy-templates"),

  instantiateTemplate: (id: string, data: Record<string, unknown>) =>
    uFetch("POST", `/api/hierarchy/hierarchy-templates/${id}/instantiate`, data),

  // Container children
  getChildren: (id: string) => uFetch("GET", `/api/hierarchy/containers/${id}/children`),

  // Policy
  getPolicy: (containerId: string) => uFetch("GET", `/api/hierarchy/containers/${containerId}/policy`),
  searchActors: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    return uFetch("GET", `/api/v1/identity/ember/actors${qs}`);
  },
};


export const capabilityApi = {
  list: () => uFetch("GET", "/api/authority/capabilities"),

  getContainers: (code: string) =>
    uFetch("GET", `/api/authority/capabilities/${code}/containers`),

  mapToContainers: (
    code: string,
    containerIds: string[],
    accessMode: "role_required" | "open_to_members" = "role_required",
  ) =>
    uFetch("POST", `/api/authority/capabilities/${code}/containers`, {
      container_ids: containerIds,
      access_mode: accessMode,
    }),

  // Change enabled and/or access_mode on an existing mapping
  updateMapping: (
    code: string,
    containerId: string,
    patch: { enabled?: boolean; access_mode?: "role_required" | "open_to_members" },
  ) =>
    uFetch("PATCH", `/api/authority/capabilities/${code}/containers/${containerId}`, patch),

  unmapFromContainer: (code: string, containerId: string) =>
    uFetch("DELETE", `/api/authority/capabilities/${code}/containers/${containerId}`),

  getContainerFeatures: (containerId: string) =>
    uFetch("GET", `/api/hierarchy/containers/${containerId}/features`),
};
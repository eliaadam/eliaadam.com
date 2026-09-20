import { api } from "../../query/Api";

/**
 * Typed client for `domains.identity`'s REST API
 * (`/api/identity/auth/...` + `/api/identity/actors/...` — see
 * IDENTITY_API.md).
 *
 * Mirrors the backend's own read/write split in spirit: every function
 * here is a thin, typed pass-through to one REST endpoint — no caching,
 * no React state, no localStorage. Callers (AuthContext, a future
 * react-query hook, etc.) own all of that.
 */

export interface Actor {
  id: string;
  actor_type_code: string;
  display_name: string;
  code: string | null;
  name: string | null;
  status: string;
  represented_type: string | null;
  represented_id: string | null;
}

export interface AuthSession {
  actor: Actor;
  access_token: string;
}

export interface TwoFactorChallenge {
  challenge_id: string;
}

export interface TwoFactorVerification {
  verified: boolean;
}

function register(input: {
  email: string;
  password: string;
  display_name: string;
  actor_type_code?: string;
}): Promise<AuthSession> {
  return api.post<AuthSession>("/api/identity/auth/register", input);
}

function login(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  return api.post<AuthSession>("/api/identity/auth/login", input);
}

function logout(): Promise<{ revoked: boolean }> {
  return api.post<{ revoked: boolean }>("/api/identity/auth/logout");
}

function me(): Promise<{ actor: Actor }> {
  return api.get<{ actor: Actor }>("/api/identity/auth/me");
}

function requestTwoFactorChallenge(): Promise<TwoFactorChallenge> {
  return api.post<TwoFactorChallenge>("/api/identity/auth/2fa/challenge");
}

function verifyTwoFactorChallenge(input: {
  challenge_id: string;
  code: string;
}): Promise<TwoFactorVerification> {
  return api.post<TwoFactorVerification>(
    "/api/identity/auth/2fa/verify",
    input,
  );
}

// -- Actor management (admin) ------------------------------------------

export interface ListActorsParams {
  containerId: string;
  status?: string;
  actorTypeCode?: string;
  representedType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function listActors(params: ListActorsParams): Promise<Actor[]> {
  const query = new URLSearchParams();
  query.set("container_id", params.containerId);
  if (params.status) query.set("status", params.status);
  if (params.actorTypeCode) query.set("actor_type_code", params.actorTypeCode);
  if (params.representedType)
    query.set("represented_type", params.representedType);
  if (params.search) query.set("search", params.search);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));
  return api.get<Actor[]>(`/api/identity/actors/?${query.toString()}`);
}

function getActor(actorId: string): Promise<Actor> {
  // Deliberately NOT admin-gated — used throughout the app (chat
  // participant lists, join-request rows, wallet participants) just
  // to resolve an id to a display name, not an admin action. Only
  // `listActors` (the full browse/manage list) and the three
  // transitions below require `core.admin`.
  return api.get<Actor>(`/api/identity/actors/${actorId}/`);
}

function suspendActor(actorId: string, containerId: string): Promise<Actor> {
  return api.post<Actor>(`/api/identity/actors/${actorId}/suspend/`, {
    container_id: containerId,
  });
}

function activateActor(actorId: string, containerId: string): Promise<Actor> {
  return api.post<Actor>(`/api/identity/actors/${actorId}/activate/`, {
    container_id: containerId,
  });
}

function archiveActor(actorId: string, containerId: string): Promise<Actor> {
  return api.post<Actor>(`/api/identity/actors/${actorId}/archive/`, {
    container_id: containerId,
  });
}

function updateMyProfile(input: {
  display_name?: string;
  name?: string;
}): Promise<Actor> {
  return api.post<Actor>("/api/identity/actors/me/", input);
}

export const identity = {
  register,
  login,
  logout,
  me,
  requestTwoFactorChallenge,
  verifyTwoFactorChallenge,
  listActors,
  getActor,
  suspendActor,
  activateActor,
  archiveActor,
  updateMyProfile,
};
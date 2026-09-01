import { api } from "../../query/Api";

/**
 * Typed client for `domains.identity`'s REST API
 * (`/api/identity/auth/...` — see IDENTITY_API.md).
 *
 * Mirrors the backend's own read/write split in spirit: every function
 * here is a thin, typed pass-through to one REST endpoint — no caching,
 * no React state, no localStorage. Callers (AuthContext, a future
 * react-query hook, etc.) own all of that.
 */

export interface Actor {
  id: string;
  actor_type: string;
  display_name: string;
  code: string | null;
  status: string;
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

export const identity = {
  register,
  login,
  logout,
  me,
  requestTwoFactorChallenge,
  verifyTwoFactorChallenge,
};

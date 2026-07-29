import type { HttpClient } from "../http-client.ts";
import type {
  LoginRequest,
  LoginResult,
  RegisterRequest,
  Actor,
  IssueTokenRequest,
  IssuedToken,
  RevokeTokenRequest,
  AuthDriverCode,
} from "../types.ts";

/**
 * 1. Authentication — /api/identity/ember/auth/*, /api/identity/ember/tokens/*
 *
 * Login now returns a bearer token directly in the response, eliminating
 * the need for a separate issueToken() call. The SDK auto-stores the token
 * on the HTTP client after a successful login.
 */
export class AuthResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * POST /api/identity/ember/auth/login (public)
   *
   * On success, the response includes a bearer token. This method
   * automatically sets it on the HTTP client so all subsequent calls
   * are authenticated. No need to call issueToken() separately.
   *
   * @param payload - credentials
   * @param autoSetToken - if true (default), sets the returned token on the client
   */
  async login(
    payload: LoginRequest & { token_name?: string },
    autoSetToken = true
  ): Promise<LoginResult> {
    const result = await this.http.postIdentity<LoginResult>(
      "/api/identity/ember/auth/login",
      payload
    );

    if (autoSetToken && result.authenticated && result.token?.token) {
      this.http.setToken(result.token.token);
    }

    return result;
  }

  /**
   * POST /api/identity/ember/auth/register (public)
   *
   * Returns the created actor. Does NOT authenticate or issue a token.
   * Call login() with the same credentials to sign in.
   */
  register(payload: RegisterRequest): Promise<Actor> {
    return this.http.postIdentity<Actor>(
      "/api/identity/ember/auth/register",
      payload
    );
  }

  /**
   * POST /api/identity/ember/auth/{driver}/login (public)
   *
   * Same as login() but for a specific auth driver.
   */
  async loginWithDriver(
    driver: AuthDriverCode | string,
    payload: LoginRequest & { token_name?: string },
    autoSetToken = true
  ): Promise<LoginResult> {
    const result = await this.http.postIdentity<LoginResult>(
      `/api/identity/ember/auth/${driver}/login`,
      payload
    );

    if (autoSetToken && result.authenticated && result.token?.token) {
      this.http.setToken(result.token.token);
    }

    return result;
  }

  /**
   * POST /api/identity/ember/tokens/issue (auth:sanctum)
   *
   * Still available for programmatic token issuance (service accounts,
   * additional tokens). For normal login flows, login() handles this
   * automatically.
   */
  issueToken(payload: IssueTokenRequest): Promise<IssuedToken> {
    return this.http.postIdentity<IssuedToken>(
      "/api/identity/ember/tokens/issue",
      payload
    );
  }

  /** POST /api/identity/ember/tokens/revoke (auth:sanctum) */
  revokeToken(payload: RevokeTokenRequest): Promise<unknown> {
    return this.http.postIdentity("/api/identity/ember/tokens/revoke", payload);
  }

  /**
   * POST /api/identity/ember/auth/logout (auth:sanctum)
   *
   * Revokes the current bearer token server-side, then clears it from
   * the SDK client.
   */
  async logout(): Promise<void> {
    try {
      await this.http.postIdentity("/api/identity/ember/auth/logout");
    } finally {
      // Always clear local token, even if the server call fails
      this.http.setToken(undefined);
    }
  }
}
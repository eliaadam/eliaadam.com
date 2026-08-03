import type { HttpClient } from "../http-client.js";
import type {
  AuthorizeRequest,
  AuthorizeDecision,
  CanResult,
  CannotResult,
  EffectivePermissionsParams,
  EffectivePermission,
} from "../types.js";

/**
 * 12. Authorization Checks — /api/authority/authorize/*
 * The core cross-domain endpoints, resolving the full chain:
 * Identity (actor verification) -> Hierarchy (membership/container lookup)
 * -> Authority (permission evaluation via RBAC driver).
 */
export class AuthorizationResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** POST /api/authority/authorize — full decision with a human-readable reason. */
  authorize(payload: AuthorizeRequest): Promise<AuthorizeDecision> {
    return this.http.post<AuthorizeDecision>(
      "/api/authority/authorize",
      payload
    );
  }

  /** POST /api/authority/authorize/can — boolean shorthand: { can: boolean } */
  can(payload: AuthorizeRequest): Promise<boolean> {
    return this.http
      .raw<CanResult>("POST", "/api/authority/authorize/can", { body: payload })
      .then((r) => r.can);
  }

  /** POST /api/authority/authorize/cannot — inverse boolean shorthand: { cannot: boolean } */
  cannot(payload: AuthorizeRequest): Promise<boolean> {
    return this.http
      .raw<CannotResult>("POST", "/api/authority/authorize/cannot", {
        body: payload,
      })
      .then((r) => r.cannot);
  }

  /**
   * GET /api/authority/authorize/effective-permissions?actor_id=...&container_id=...
   * All permissions the actor effectively holds, resolved through every
   * active role assignment in the container.
   */
  effectivePermissions(
    params: EffectivePermissionsParams
  ): Promise<EffectivePermission[]> {
    return this.http.get<EffectivePermission[]>(
      "/api/authority/authorize/effective-permissions",
      params
    );
  }

  /**
   * GET /api/authority/authorize/effective-roles
   * Placeholder for future projection-based role resolution.
   * Currently always returns an empty array.
   */
  effectiveRoles(): Promise<unknown[]> {
    return this.http.get<unknown[]>("/api/authority/authorize/effective-roles");
  }
}

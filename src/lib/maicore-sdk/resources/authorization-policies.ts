import type { HttpClient } from "../http-client.js";
import type {
  AuthorizationPolicy,
  CreateAuthorizationPolicyRequest,
  UpdateAuthorizationPolicyRequest,
  UUID,
} from "../types.js";

/**
 * 14. Authorization Policies — /api/authority/policies
 * `priority` must be one of 25, 50, 75, or 100.
 */
export class AuthorizationPoliciesResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<AuthorizationPolicy[]> {
    return this.http.get<AuthorizationPolicy[]>("/api/authority/policies");
  }

  get(id: UUID): Promise<AuthorizationPolicy> {
    return this.http.get<AuthorizationPolicy>(`/api/authority/policies/${id}`);
  }

  create(payload: CreateAuthorizationPolicyRequest): Promise<AuthorizationPolicy> {
    return this.http.post<AuthorizationPolicy>("/api/authority/policies", payload);
  }

  update(
    id: UUID,
    payload: UpdateAuthorizationPolicyRequest
  ): Promise<AuthorizationPolicy> {
    return this.http.put<AuthorizationPolicy>(
      `/api/authority/policies/${id}`,
      payload
    );
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/authority/policies/${id}`);
  }
}

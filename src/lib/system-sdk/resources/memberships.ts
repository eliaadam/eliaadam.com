import type { HttpClient } from "../http-client.js";
import type {
  Membership,
  JoinMembershipRequest,
  TransferMembershipRequest,
  UUID,
} from "../types.js";

/**
 * 6. Membership Management — /api/hierarchy/memberships
 *
 * Valid lifecycle transitions:
 *   pending   -> active
 *   active    -> suspended, left, archived
 *   suspended -> active, archived
 * Invalid transitions raise InvalidMembershipStatusException (HTTP 500).
 */
export class MembershipsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** POST /api/hierarchy/memberships/join — creates with status "pending". */
  join(payload: JoinMembershipRequest): Promise<Membership> {
    return this.http.post<Membership>("/api/hierarchy/memberships/join", payload);
  }

  /** GET /api/hierarchy/memberships/{id} */
  get(id: UUID): Promise<Membership> {
    return this.http.get<Membership>(`/api/hierarchy/memberships/${id}`);
  }

  /** POST /api/hierarchy/memberships/{id}/activate -> "active" */
  activate(id: UUID): Promise<Membership> {
    return this.http.post<Membership>(`/api/hierarchy/memberships/${id}/activate`);
  }

  /** POST /api/hierarchy/memberships/{id}/suspend -> "suspended" */
  suspend(id: UUID): Promise<Membership> {
    return this.http.post<Membership>(`/api/hierarchy/memberships/${id}/suspend`);
  }

  /** POST /api/hierarchy/memberships/{id}/terminate -> "archived" */
  terminate(id: UUID): Promise<Membership> {
    return this.http.post<Membership>(`/api/hierarchy/memberships/${id}/terminate`);
  }

  /** POST /api/hierarchy/memberships/{id}/leave -> "left". Returns 204 (void). */
  leave(id: UUID): Promise<void> {
    return this.http.post<void>(`/api/hierarchy/memberships/${id}/leave`);
  }

  /** POST /api/hierarchy/memberships/{id}/transfer — transfer via the membership endpoint. */
  transfer(id: UUID, payload: TransferMembershipRequest): Promise<Membership> {
    return this.http.post<Membership>(
      `/api/hierarchy/memberships/${id}/transfer`,
      payload
    );
  }
}

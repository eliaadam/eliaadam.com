import type { HttpClient } from "../http-client.js";
import type {
  RoleAssignment,
  AssignRoleRequest,
  ListActiveAssignmentsParams,
  RevokeAssignmentRequest,
  RevokeAssignmentResult,
  UUID,
} from "../types.js";

/**
 * 11. Role Assignments — /api/authority/role-assignments
 * Link an actor to a role within a specific container, optionally time-bounded.
 */
export class RoleAssignmentsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * POST /api/authority/role-assignments
   * Idempotent — the same actor+container+role combination returns the
   * existing active assignment rather than creating a duplicate.
   */
  assign(payload: AssignRoleRequest): Promise<RoleAssignment> {
    return this.http.post<RoleAssignment>(
      "/api/authority/role-assignments",
      payload
    );
  }

  /**
   * GET /api/authority/role-assignments/{actorId}?container_id={containerId}
   * `container_id` is required — a missing value returns 422.
   * Only temporally-active assignments are returned
   * (effective_from <= now <= effective_until).
   */
  listActive(
    actorId: UUID,
    params: ListActiveAssignmentsParams
  ): Promise<RoleAssignment[]> {
    return this.http.get<RoleAssignment[]>(
      `/api/authority/role-assignments/${actorId}`,
      params
    );
  }

  /** DELETE /api/authority/role-assignments */
  revoke(payload: RevokeAssignmentRequest): Promise<RevokeAssignmentResult> {
    return this.http.raw<RevokeAssignmentResult>(
      "DELETE",
      "/api/authority/role-assignments",
      { body: payload }
    );
  }
}

import type { HttpClient } from "../http-client.js";
import type {
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  AttachPermissionRequest,
  AttachedResult,
  DetachedResult,
  UUID,
} from "../types.js";

/**
 * 10. Roles — /api/authority/roles
 * Roles group permissions and are container-agnostic; the same role can be
 * assigned in different containers via Role Assignments (Section 11).
 */
export class RolesResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<Role[]> {
    return this.http.get<Role[]>("/api/authority/roles");
  }

  get(id: UUID): Promise<Role> {
    return this.http.get<Role>(`/api/authority/roles/${id}`);
  }

  /** `is_system: true` roles cannot be archived. */
  create(payload: CreateRoleRequest): Promise<Role> {
    return this.http.post<Role>("/api/authority/roles", payload);
  }

  update(id: UUID, payload: UpdateRoleRequest): Promise<Role> {
    return this.http.put<Role>(`/api/authority/roles/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/authority/roles/${id}`);
  }

  /**
   * POST /api/authority/roles/{roleId}/permissions
   * Idempotent — attaching the same permission twice is a no-op.
   */
  attachPermission(
    roleId: UUID,
    payload: AttachPermissionRequest
  ): Promise<AttachedResult> {
    return this.http.raw<AttachedResult>(
      "POST",
      `/api/authority/roles/${roleId}/permissions`,
      { body: payload }
    );
  }

  /** DELETE /api/authority/roles/{roleId}/permissions/{permissionId} */
  detachPermission(
    roleId: UUID,
    permissionId: UUID
  ): Promise<DetachedResult> {
    return this.http.raw<DetachedResult>(
      "DELETE",
      `/api/authority/roles/${roleId}/permissions/${permissionId}`
    );
  }
}

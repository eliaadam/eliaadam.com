import type { HttpClient } from "../http-client.js";
import type {
  Permission,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  UUID,
} from "../types.js";

/**
 * 9.3 Permissions — /api/authority/permissions
 * Combines a resource + action into a checkable unit (e.g. "invoice.approve").
 */
export class PermissionsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<Permission[]> {
    return this.http.get<Permission[]>("/api/authority/permissions");
  }

  get(id: UUID): Promise<Permission> {
    return this.http.get<Permission>(`/api/authority/permissions/${id}`);
  }

  create(payload: CreatePermissionRequest): Promise<Permission> {
    return this.http.post<Permission>("/api/authority/permissions", payload);
  }

  update(id: UUID, payload: UpdatePermissionRequest): Promise<Permission> {
    return this.http.put<Permission>(`/api/authority/permissions/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/authority/permissions/${id}`);
  }
}

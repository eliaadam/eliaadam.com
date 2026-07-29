import type { HttpClient } from "../http-client.js";
import type {
  Container,
  CreateContainerRequest,
  UpdateContainerRequest,
  MoveContainerRequest,
  LifecycleReasonRequest,
  UUID,
} from "../types.js";

/**
 * 3. Container Management — /api/hierarchy/containers
 */
export class ContainersResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /**
   * POST /api/hierarchy/containers
   * Created in `draft` status — call `.activate(id)` to make it operational.
   * Omit `parent_id` for a root container.
   */
  create(payload: CreateContainerRequest): Promise<Container> {
    return this.http.post<Container>("/api/hierarchy/containers", payload);
  }

  /** GET /api/hierarchy/containers/{id} */
  get(id: UUID): Promise<Container> {
    return this.http.get<Container>(`/api/hierarchy/containers/${id}`);
  }

  /** PATCH /api/hierarchy/containers/{id} */
  update(id: UUID, payload: UpdateContainerRequest): Promise<Container> {
    return this.http.patch<Container>(`/api/hierarchy/containers/${id}`, payload);
  }

  /** DELETE /api/hierarchy/containers/{id} — soft delete. Returns 204. */
  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/hierarchy/containers/${id}`);
  }

  /**
   * POST /api/hierarchy/containers/{id}/move
   * Errors: root containers cannot be moved; moving under own descendant
   * creates a cycle and is rejected (InvalidHierarchyOperationException).
   */
  move(id: UUID, payload: MoveContainerRequest): Promise<Container> {
    return this.http.post<Container>(
      `/api/hierarchy/containers/${id}/move`,
      payload
    );
  }

  /** POST /api/hierarchy/containers/{id}/activate -> "active" */
  activate(id: UUID): Promise<Container> {
    return this.http.post<Container>(`/api/hierarchy/containers/${id}/activate`);
  }

  /** POST /api/hierarchy/containers/{id}/suspend -> "suspended" */
  suspend(id: UUID, payload?: LifecycleReasonRequest): Promise<Container> {
    return this.http.post<Container>(
      `/api/hierarchy/containers/${id}/suspend`,
      payload
    );
  }

  /** POST /api/hierarchy/containers/{id}/archive -> "archived" */
  archive(id: UUID, payload?: LifecycleReasonRequest): Promise<Container> {
    return this.http.post<Container>(
      `/api/hierarchy/containers/${id}/archive`,
      payload
    );
  }

  /** POST /api/hierarchy/containers/{id}/restore -> "draft" */
  restore(id: UUID): Promise<Container> {
    return this.http.post<Container>(`/api/hierarchy/containers/${id}/restore`);
  }
}

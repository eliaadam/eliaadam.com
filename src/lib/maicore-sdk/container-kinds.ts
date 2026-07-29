
import type { HttpClient } from "./http-client.js";
import type { CreateContainerKindRequest, UpdateContainerKindRequest } from "../template-types.js";
import type {
  ContainerKind,

  UUID,
} from "./types.js";

/**
 * Container Kinds — /api/hierarchy/container-kinds
 * Define what types of containers can exist (organization, team, project, etc.)
 */
export class ContainerKindsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<ContainerKind[]> {
    return this.http.get<ContainerKind[]>("/api/hierarchy/container-kinds");
  }

  get(id: UUID): Promise<ContainerKind> {
    return this.http.get<ContainerKind>(`/api/hierarchy/container-kinds/${id}`);
  }

  create(payload: CreateContainerKindRequest): Promise<ContainerKind> {
    return this.http.post<ContainerKind>("/api/hierarchy/container-kinds", payload);
  }

  update(id: UUID, payload: UpdateContainerKindRequest): Promise<ContainerKind> {
    return this.http.put<ContainerKind>(`/api/hierarchy/container-kinds/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/hierarchy/container-kinds/${id}`);
  }
}

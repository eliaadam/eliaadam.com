type UUID = string;
import type { HttpClient } from "./http-client.js";
import type { ContainerTemplate, CreateContainerTemplateRequest, UpdateContainerTemplateRequest } from "../template-types.js";


/**
 * Container Templates — /api/hierarchy/container-templates
 * Blueprints for creating containers: kind + visibility + default policy + name pattern.
 */
export class ContainerTemplatesResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<ContainerTemplate[]> {
    return this.http.get<ContainerTemplate[]>("/api/hierarchy/container-templates");
  }

  get(id: UUID): Promise<ContainerTemplate> {
    return this.http.get<ContainerTemplate>(`/api/hierarchy/container-templates/${id}`);
  }

  create(payload: CreateContainerTemplateRequest): Promise<ContainerTemplate> {
    return this.http.post<ContainerTemplate>("/api/hierarchy/container-templates", payload);
  }

  update(id: UUID, payload: UpdateContainerTemplateRequest): Promise<ContainerTemplate> {
    return this.http.put<ContainerTemplate>(`/api/hierarchy/container-templates/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/hierarchy/container-templates/${id}`);
  }
}

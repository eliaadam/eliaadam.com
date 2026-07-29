type UUID = string;
import type { HttpClient } from "./http-client.js";
import type { HierarchyTemplate, CreateHierarchyTemplateRequest, UpdateHierarchyTemplateRequest, InstantiateHierarchyTemplateRequest, InstantiateResult } from "../template-types.js";


/**
 * Hierarchy Templates — /api/hierarchy/hierarchy-templates
 * Define tree structures composed of container templates.
 * Instantiate to create an entire hierarchy in one call.
 */
export class HierarchyTemplatesResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  list(): Promise<HierarchyTemplate[]> {
    return this.http.get<HierarchyTemplate[]>("/api/hierarchy/hierarchy-templates");
  }

  /** GET enriches the structure with template display names. */
  get(id: UUID): Promise<HierarchyTemplate> {
    return this.http.get<HierarchyTemplate>(`/api/hierarchy/hierarchy-templates/${id}`);
  }

  create(payload: CreateHierarchyTemplateRequest): Promise<HierarchyTemplate> {
    return this.http.post<HierarchyTemplate>("/api/hierarchy/hierarchy-templates", payload);
  }

  update(id: UUID, payload: UpdateHierarchyTemplateRequest): Promise<HierarchyTemplate> {
    return this.http.put<HierarchyTemplate>(`/api/hierarchy/hierarchy-templates/${id}`, payload);
  }

  delete(id: UUID): Promise<void> {
    return this.http.delete<void>(`/api/hierarchy/hierarchy-templates/${id}`);
  }

  /**
   * Create the entire container tree from this template.
   * Returns all created containers with their IDs, codes, and paths.
   */
  instantiate(id: UUID, payload: InstantiateHierarchyTemplateRequest): Promise<InstantiateResult> {
    return this.http.post<InstantiateResult>(`/api/hierarchy/hierarchy-templates/${id}/instantiate`, payload);
  }
}

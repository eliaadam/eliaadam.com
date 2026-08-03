import type { HttpClient } from "../http-client.js";
import type {
  Container,
  ContainerSearchParams,
  ContainerDiscoverParams,
  ContainerTreeNode,
  UUID,
} from "../types.js";

/**
 * 5. Container Discovery & Traversal
 */
export class ContainerDiscoveryResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/hierarchy/containers/search?q=...&visibility=...&lifecycle=...&limit=...&offset=... */
  search(params: ContainerSearchParams): Promise<Container[]> {
    return this.http.get<Container[]>("/api/hierarchy/containers/search", params);
  }

  /** GET /api/hierarchy/containers/discover — public containers only. */
  discover(params?: ContainerDiscoverParams): Promise<Container[]> {
    return this.http.get<Container[]>("/api/hierarchy/containers/discover", params);
  }
  /** GET /hierarchy/containers — list all containers (admin). */
  list(): Promise<Container[]> {
    return this.http.get<Container[]>("/api/hierarchy/containers");
  }
  /** GET /api/hierarchy/containers/{id}/ancestors — ordered by depth DESC, up to root. */
  ancestors(id: UUID): Promise<Container[]> {
    return this.http.get<Container[]>(`/api/hierarchy/containers/${id}/ancestors`);
  }

  /** GET /api/hierarchy/containers/{id}/descendants — full subtree, ordered by path. */
  descendants(id: UUID): Promise<Container[]> {
    return this.http.get<Container[]>(`/api/hierarchy/containers/${id}/descendants`);
  }

  /** GET /api/hierarchy/containers/{id}/children — direct children only. */
  children(id: UUID): Promise<Container[]> {
    return this.http.get<Container[]>(`/api/hierarchy/containers/${id}/children`);
  }

  /** GET /api/hierarchy/containers/{id}/tree — subtree as flattened tree projections. */
  tree(id: UUID): Promise<ContainerTreeNode[]> {
    return this.http.get<ContainerTreeNode[]>(`/api/hierarchy/containers/${id}/tree`);
  }
}

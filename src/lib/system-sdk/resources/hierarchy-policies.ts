import type { HttpClient } from "../http-client.js";
import type {
  HierarchyPolicy,
  ApplyHierarchyPolicyRequest,
  UpdateHierarchyPolicyRequest,
  UUID,
} from "../types.js";

/**
 * 4. Hierarchy Policy Management — /api/hierarchy/containers/{containerId}/policy
 */
export class HierarchyPoliciesResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  /** GET /api/hierarchy/containers/{containerId}/policy — 404 if none configured. */
  get(containerId: UUID): Promise<HierarchyPolicy> {
    return this.http.get<HierarchyPolicy>(
      `/api/hierarchy/containers/${containerId}/policy`
    );
  }

  /**
   * POST /api/hierarchy/containers/{containerId}/policy/apply
   * Creates the policy if none exists, or updates the existing one.
   */
  apply(
    containerId: UUID,
    payload: ApplyHierarchyPolicyRequest
  ): Promise<HierarchyPolicy> {
    return this.http.post<HierarchyPolicy>(
      `/api/hierarchy/containers/${containerId}/policy/apply`,
      payload
    );
  }

  /**
   * PATCH /api/hierarchy/containers/{containerId}/policy
   * Returns 404 if no policy exists yet — use `.apply()` for the first write.
   *
   * Semantics for `maximum_depth` / `maximum_children`:
   *  - omitted field -> unchanged
   *  - `null`        -> reset to unlimited
   *  - integer       -> set to this value
   */
  update(
    containerId: UUID,
    payload: UpdateHierarchyPolicyRequest
  ): Promise<HierarchyPolicy> {
    return this.http.patch<HierarchyPolicy>(
      `/api/hierarchy/containers/${containerId}/policy`,
      payload
    );
  }
}

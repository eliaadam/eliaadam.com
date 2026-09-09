import { api } from "../../query/Api";

/**
 * Typed client for `domains.capability`'s REST API
 * (`/api/capability/...`).
 */

export interface CapabilityNav {
  label: string;
  icon: string;
  route: string;
  required_permission: string;
  order: number;
}

export interface CapabilityRole {
  code: string;
  label: string;
  description: string | null;
}

export interface CapabilityManifest {
  feature_code: string;
  display_name: string;
  description: string;
  family: string | null;
  tags: string[];
  navigation: CapabilityNav | null;
  roles: CapabilityRole[];
  /** Combine with `licensed` to get "roles actually assignable on this
   * container right now": filter manifests to `licensed === true`,
   * flatten `.roles`. */
  /** Only meaningful when `containerId` was passed to `listManifests` —
   * see the backend's own `CapabilityManifestProjection` docstring.
   * Always `false` if no container was scoped. */
  licensed: boolean;
}

function listManifests(containerId?: string): Promise<CapabilityManifest[]> {
  const query = containerId ? `?container_id=${containerId}` : "";
  return api.get<CapabilityManifest[]>(`/api/capability/manifests/${query}`);
}

export const capability = {
  listManifests,
};

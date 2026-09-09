import { api } from "../../query/Api";

/**
 * Typed client for `domains.authority`'s REST API (`/api/authority/...`).
 *
 * NOTE on response envelopes: `authorize()`/`licenseFeature()`/
 * `getFeatureLicense()`/`revokeFeatureLicense()`/`assignRoleByCode()`
 * all return the projection dataclass flattened directly at the top
 * level of the response body (no `.data` wrapper) — see
 * `domains/authority/interface/views.py`'s `authority_api_view`
 * decorator: a plain dict result is passed straight to `JsonResponse`.
 * `listContainerFeatureLicenses`/`listContainerRoleAssignments` DO use
 * a `{"data": [...]}` wrapper. Check the actual view before adding a
 * new function here — this file has bitten us once already by
 * assuming uniformity that isn't there.
 */

export type AccessMode = "role_required" | "open_to_members";

export interface AuthorizationDecision {
  allowed: boolean;
  permission: string;
  reason: string;
  strategy: string;
  constraints: Record<string, unknown>;
}

export interface FeatureLicense {
  id: string;
  container_id: string;
  feature_code: string;
  enabled: boolean;
  access_mode: AccessMode;
  granted_by_actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface RoleAssignment {
  id: string;
  actor_id: string;
  container_id: string;
  role_id: string;
  status: string;
  effective_from: string | null;
  effective_until: string | null;
  assigned_at: string | null;
  revoked_at: string | null;
  is_currently_effective: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  is_system: boolean;
  is_wildcard: boolean;
  status: string;
}

function getRole(roleId: string): Promise<Role> {
  return api.get<Role>(`/api/authority/roles/${roleId}/`);
}

function authorize(input: {
  actor_id: string;
  container_id: string;
  permission_code: string;
}): Promise<AuthorizationDecision> {
  return api.post<AuthorizationDecision>("/api/authority/authorize/", input);
}

function effectiveRoles(params: {
  actorId: string;
  containerId: string;
}): Promise<string[]> {
  return api.get<string[]>(
    `/api/authority/authorize/effective-roles/?actor_id=${params.actorId}&container_id=${params.containerId}`,
  );
}

function licenseFeature(input: {
  container_id: string;
  acting_container_id: string;
  feature_code: string;
  enabled?: boolean;
  access_mode?: AccessMode;
  granted_by_actor_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<FeatureLicense> {
  const { container_id, ...body } = input;
  return api.post<FeatureLicense>(
    `/api/authority/containers/${container_id}/feature-licenses/`,
    body,
  );
}

function getFeatureLicense(
  containerId: string,
  featureCode: string,
  actingContainerId: string,
): Promise<FeatureLicense> {
  return api.get<FeatureLicense>(
    `/api/authority/containers/${containerId}/feature-licenses/${featureCode}/?acting_container_id=${actingContainerId}`,
  );
}

/** Requires GET support on the backend's `container_feature_licenses`
 * view — see that view's own patch instructions (added alongside
 * `assign_role_by_code`) for the one-method edit needed.
 * `actingContainerId` is the ADMIN's own currently-selected container
 * (where their `core.admin` permission is checked from) — distinct
 * from `containerId` (the target whose licenses are being listed). */
function listContainerFeatureLicenses(
  containerId: string,
  actingContainerId: string,
): Promise<FeatureLicense[]> {
  return api.get<FeatureLicense[]>(
    `/api/authority/containers/${containerId}/feature-licenses/?acting_container_id=${actingContainerId}`,
  );
}

function revokeFeatureLicense(
  containerId: string,
  featureCode: string,
  actingContainerId: string,
): Promise<FeatureLicense> {
  return api.delete<FeatureLicense>(
    `/api/authority/containers/${containerId}/feature-licenses/${featureCode}/?acting_container_id=${actingContainerId}`,
  );
}

/** Every role assignment recorded for a container — was a dead
 * endpoint until `AuthorityReadApi.find_assignments_for_container()`
 * got a real implementation (previously a `NotImplementedError`
 * stub). Backs container member management's "what role does this
 * person hold" half. */
function listContainerRoleAssignments(
  containerId: string,
): Promise<RoleAssignment[]> {
  return api.get<RoleAssignment[]>(
    `/api/authority/containers/${containerId}/role-assignments/`,
  );
}

/** Resolves `roleCode` server-side (via `find_role_by_code`) so the
 * frontend never needs to know an Authority role's internal id —
 * every role picker in this app only ever has the CODE (from
 * `sdk.capability.listManifests()`'s `roles` field). */
function assignRoleByCode(input: {
  container_id: string;
  actor_id: string;
  role_code: string;
  granted_by_actor_id?: string;
}): Promise<RoleAssignment> {
  const { container_id, ...body } = input;
  return api.post<RoleAssignment>(
    `/api/authority/containers/${container_id}/role-assignments-by-code/`,
    body,
  );
}

function revokeRoleAssignment(
  roleAssignmentId: string,
): Promise<RoleAssignment> {
  return api.post<RoleAssignment>(
    `/api/authority/role-assignments/${roleAssignmentId}/revoke/`,
  );
}

export const authority = {
  authorize,
  effectiveRoles,
  getRole,
  licenseFeature,
  getFeatureLicense,
  listContainerFeatureLicenses,
  revokeFeatureLicense,
  listContainerRoleAssignments,
  assignRoleByCode,
  revokeRoleAssignment,
};

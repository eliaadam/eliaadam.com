export { MaicoreClient } from "./client.js";
export { HttpClient } from "./http-client.js";
export type { MaicoreClientConfig, QueryParams } from "./http-client.js";

export {
  MaicoreError,
  MaicoreAuthenticationError,
  MaicoreForbiddenError,
  MaicoreNotFoundError,
  MaicoreValidationError,
  MaicoreNotImplementedError,
  MaicoreDomainError,
  MaicoreNetworkError,
} from "./errors.js";

// Individual resource classes — useful for advanced composition/testing,
// most consumers will just use `MaicoreClient`.
export { AuthResource } from "./resources/auth.js";
export { ActorsResource } from "./resources/actors.js";
export { ContainersResource } from "./resources/containers.js";
export { HierarchyPoliciesResource } from "./resources/hierarchy-policies.js";
export { ContainerDiscoveryResource } from "./resources/container-discovery.js";
export { MembershipsResource } from "./resources/memberships.js";
export { InvitationsResource } from "./resources/invitations.js";
export { TransfersResource } from "./resources/transfers.js";
export { ActionsResource } from "./resources/actions.js";
export { ResourcesResource } from "./resources/authority-resources.js";
export { PermissionsResource } from "./resources/permissions.js";
export { RolesResource } from "./resources/roles.js";
export { RoleAssignmentsResource } from "./resources/role-assignments.js";
export { AuthorizationResource } from "./resources/authorization.js";
export { DriversResource } from "./resources/drivers.js";
export { AuthorizationPoliciesResource } from "./resources/authorization-policies.js";

export * from "./types.js";

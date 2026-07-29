import { ContainerKindsResource } from "./container-kinds.js";
import { ContainerTemplatesResource } from "./container-templates.js";
import { HierarchyTemplatesResource } from "./hierarchy-templates.js";
import { HttpClient } from "./http-client.js";
import type { MaicoreClientConfig } from "./http-client.js";

import { ActionsResource } from "./resources/actions.js";
import { ActorsResource } from "./resources/actors.js";
import { AuthResource } from "./resources/auth.js";

import { ResourcesResource } from "./resources/authority-resources.js";
import { AuthorizationPoliciesResource } from "./resources/authorization-policies.js";
import { AuthorizationResource } from "./resources/authorization.js";
import { ContainerDiscoveryResource } from "./resources/container-discovery.js";
import { ContainersResource } from "./resources/containers.js";
import { DriversResource } from "./resources/drivers.js";
import { HierarchyPoliciesResource } from "./resources/hierarchy-policies.js";
import { InvitationsResource } from "./resources/invitations.js";
import { MembershipsResource } from "./resources/memberships.js";
import { PermissionsResource } from "./resources/permissions.js";
import { RoleAssignmentsResource } from "./resources/role-assignments.js";
import { RolesResource } from "./resources/roles.js";
import { TransfersResource } from "./resources/transfers.js";

export class MaicoreClient {
  private readonly http: HttpClient;

  readonly identity: {
    auth: AuthResource;
    actors: ActorsResource;
  };

  readonly hierarchy: {
    containers: ContainersResource;
    containerKinds: ContainerKindsResource;
    containerTemplates: ContainerTemplatesResource;
    hierarchyTemplates: HierarchyTemplatesResource;
    policies: HierarchyPoliciesResource;
    discovery: ContainerDiscoveryResource;
    memberships: MembershipsResource;
    invitations: InvitationsResource;
    transfers: TransfersResource;
  };

  readonly authority: {
    actions: ActionsResource;
    resources: ResourcesResource;
    permissions: PermissionsResource;
    roles: RolesResource;
    roleAssignments: RoleAssignmentsResource;
    authorization: AuthorizationResource;
    drivers: DriversResource;
    policies: AuthorizationPoliciesResource;
  };

  constructor(config: MaicoreClientConfig) {
    this.http = new HttpClient(config);

    this.identity = {
      auth: new AuthResource(this.http),
      actors: new ActorsResource(this.http),
    };

    this.hierarchy = {
      containers: new ContainersResource(this.http),
      containerKinds: new ContainerKindsResource(this.http),
      containerTemplates: new ContainerTemplatesResource(this.http),
      hierarchyTemplates: new HierarchyTemplatesResource(this.http),
      policies: new HierarchyPoliciesResource(this.http),
      discovery: new ContainerDiscoveryResource(this.http),
      memberships: new MembershipsResource(this.http),
      invitations: new InvitationsResource(this.http),
      transfers: new TransfersResource(this.http),
    };

    this.authority = {
      actions: new ActionsResource(this.http),
      resources: new ResourcesResource(),
      permissions: new PermissionsResource(this.http),
      roles: new RolesResource(this.http),
      roleAssignments: new RoleAssignmentsResource(this.http),
      authorization: new AuthorizationResource(this.http),
      drivers: new DriversResource(this.http),
      policies: new AuthorizationPoliciesResource(this.http),
    };
  }

  /** Update the bearer token after construction (e.g. right after login + issueToken). */
  setToken(token: MaicoreClientConfig["token"]): void {
    this.http.setToken(token);
  }

  /** Fetch Laravel's XSRF-TOKEN cookie — call once before login(). */
  ensureCsrfCookie(): Promise<void> {
    return this.http.ensureCsrfCookie();
  }
}

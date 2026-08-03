/**
 * Sonic Platform — shared types, enums, and DTOs.
 * Mirrors the System Admin API Reference v1.0.
 */

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------

export type UUID = string;
export type ISODateTime = string;

/** Identity domain envelope: { success, data } */
export interface IdentityEnvelope<T> {
  success: boolean;
  data: T;
}

/** Hierarchy / Authority domain envelope: { data } */
export interface DataEnvelope<T> {
  data: T;
}

export interface DeletedEnvelope {
  deleted: true;
}

export interface ValidationErrorShape {
  message: string;
  errors: Record<string, string[]>;
}

export interface DomainExceptionShape {
  message: string;
  exception: string;
}

// ---------------------------------------------------------------------------
// Enums (Section 16)
// ---------------------------------------------------------------------------

export type ActorStatus = "active" | "suspended" | "retired";

export type ContainerStatus = "draft" | "active" | "suspended" | "archived";

export type ContainerVisibility = "public" | "private" | "restricted";

export type PolicyVisibility = "public" | "protected" | "private";

export type MembershipStatus =
  | "pending"
  | "active"
  | "suspended"
  | "left"
  | "archived";

export type InvitationStatus = "pending" | "accepted" | "cancelled" | "expired";

export type TransferStatus =
  | "pending"
  | "approved"
  | "completed"
  | "rejected"
  | "cancelled";

export type AuthorizationDecision = "granted" | "denied";

/** Applies to Actions, Permissions, Roles (RBAC entities) */
export type AuthorityStatus = "active" | "suspended" | "archived";

export type AssignmentStatus =
  | "active"
  | "pending"
  | "suspended"
  | "revoked"
  | "expired";

export type DriverType = "rbac" | "abac" | "rebac" | "policy" | "custom";

export type PolicyPriority = 25 | 50 | 75 | 100;

export type AuthDriverCode = "password" | "oauth" | "api_key";

// ---------------------------------------------------------------------------
// 1. Authentication
// ---------------------------------------------------------------------------

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface AuthenticatedActorSummary {
  id: UUID;
  code: string | null;
  display_name: string;
  status: ActorStatus;
}

export interface EmbeddedToken {
  id: string;
  token: string;
}

export interface LoginResult {
  authenticated: boolean;
  actor: AuthenticatedActorSummary | null;
  credential_id: string | null;

  token: EmbeddedToken | null;
  message: string;
}

export interface IssueTokenRequest {
  actorId: UUID;
  name: string;
}

export interface IssuedToken {
  id: string;
  token: string;
}

export interface RevokeTokenRequest {
  tokenId: string;
}

// ---------------------------------------------------------------------------
// 2. Actor Management
// ---------------------------------------------------------------------------

export interface Actor {
  id: UUID;
  actor_type_id: UUID;
  code: string | null;
  display_name: string;
  status: ActorStatus;
  metadata: Record<string, unknown>;
}

export interface CreateActorRequest {
  actor_type_id: UUID;
  display_name: string;
  code?: string;
  status: ActorStatus;
  metadata?: Record<string, unknown>;
}

export interface UpdateActorRequest {
  display_name?: string;
  status?: ActorStatus;
  metadata?: Record<string, unknown>;
}

export interface ActorType {
  id: UUID;
  code: string;
  name: string;
  display_name: string;
  status: AuthorityStatus;
}

export interface CredentialType {
  id: UUID;
  code: string;
  name: string;
}

export interface CreateCredentialRequest {
  credential_type_id: UUID;
  identifier: string;
  secret: string;
}

export interface CredentialResource {
  id: UUID;
  actor_id: UUID;
  credential_type_id: UUID;
  identifier: string;
  status: AuthorityStatus | ActorStatus | string;
}

export interface RotateCredentialRequest {
  secret: string;
}

// ---------------------------------------------------------------------------
// 3. Container Kind & Container Management
// ---------------------------------------------------------------------------

/** Container kinds have no HTTP endpoint — seeded/created out of band. */
export interface ContainerKind {
  id: UUID;
  code:
  | "system_platform"
  | "organization"
  | "department"
  | "team"
  | "project"
  | string;
  purpose?: string;
}

export interface Container {
  id: UUID;
  code: string;
  slug: string;
  display_name: string;
  description: string | null;
  path: string;
  visibility: ContainerVisibility;
  status: ContainerStatus;
  container_kind_id: UUID;
  parent_container_id: UUID | null;
  tenant_container_id: UUID;
  owner_container_id: UUID;
  version: number;
  metadata: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateContainerRequest {
  code: string;
  slug: string;
  display_name: string;
  description?: string;
  kind: UUID;
  visibility: ContainerVisibility;
  parent_id?: UUID;
  metadata?: Record<string, unknown>;
}

export interface UpdateContainerRequest {
  display_name?: string;
  description?: string | null;
  visibility?: ContainerVisibility;
  metadata?: Record<string, unknown> | null;
}

export interface MoveContainerRequest {
  parent_id: UUID;
}

export interface LifecycleReasonRequest {
  reason?: string;
}

// ---------------------------------------------------------------------------
// 4. Hierarchy Policy Management
// ---------------------------------------------------------------------------

export interface HierarchyPolicy {
  id: UUID;
  container_id: UUID;
  maximum_depth: number | null;
  maximum_children: number | null;
  allowed_child_kinds: UUID[];
  default_visibility: PolicyVisibility;
  allow_transfers: boolean;
  allow_invitations: boolean;
  allow_public_discovery: boolean;
  status: AuthorityStatus;
  version: number;
  metadata: Record<string, unknown>;
}

/**
 * Shared by apply (create-or-update) and patch (update-only).
 * Special semantics for maximum_depth / maximum_children on PATCH:
 *   - omitted   => don't change it
 *   - null      => reset to unlimited
 *   - integer   => set to this value
 */
export interface ApplyHierarchyPolicyRequest {
  maximum_depth?: number | null;
  maximum_children?: number | null;
  allowed_child_kinds?: UUID[];
  default_visibility?: PolicyVisibility;
  allow_transfers?: boolean;
  allow_invitations?: boolean;
  allow_public_discovery?: boolean;
}

export type UpdateHierarchyPolicyRequest = ApplyHierarchyPolicyRequest;

// ---------------------------------------------------------------------------
// 5. Container Discovery & Traversal
// ---------------------------------------------------------------------------

export interface ContainerSearchParams {
  q: string;
  visibility?: ContainerVisibility;
  lifecycle?: ContainerStatus;
  limit?: number;
  offset?: number;
}

export interface ContainerDiscoverParams {
  parent_id?: UUID;
  kind?: string;
  limit?: number;
  offset?: number;
}

export interface ContainerTreeNode {
  container_id: UUID;
  parent_id: UUID | null;
  hierarchy_path: string;
  depth: number;
  child_count: number;
  visibility: ContainerVisibility;
  lifecycle: ContainerStatus;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 6. Membership Management
// ---------------------------------------------------------------------------

export interface Membership {
  id: UUID;
  container_id: UUID;
  actor_id: UUID;
  role: string | null;
  status: MembershipStatus;
  joined_at: ISODateTime | null;
  left_at: ISODateTime | null;
  version: number;
  metadata: Record<string, unknown>;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface JoinMembershipRequest {
  actor_id: UUID;
  container_id: UUID;
}

export interface TransferMembershipRequest {
  to_container_id: UUID;
  reason?: string;
}

// ---------------------------------------------------------------------------
// 7. Invitation Management
// ---------------------------------------------------------------------------

export interface Invitation {
  id: UUID;
  container_id: UUID;
  invited_by_actor_id: UUID;
  invitee_actor_id: UUID | null;
  invitee_email: string | null;
  role: string | null;
  status: InvitationStatus;
  expires_at: ISODateTime | null;
  accepted_at: ISODateTime | null;
  declined_at: ISODateTime | null;
  version: number;
  metadata: Record<string, unknown>;
}

export interface CreateInvitationRequest {
  container_id: UUID;
  invitee_id: UUID;
  expires_at?: ISODateTime;
}

export interface RedeemInvitationRequest {
  token: string;
  actor_id: UUID;
}

// ---------------------------------------------------------------------------
// 8. Transfer Management
// ---------------------------------------------------------------------------

export interface Transfer {
  id: UUID;
  membership_id: UUID;
  to_container_id: UUID;
  reason: string | null;
  status: TransferStatus;
}

export interface RequestTransferRequest {
  membership_id: UUID;
  to_container_id: UUID;
  reason?: string;
}

export interface RejectTransferRequest {
  reason: string;
}

export interface ApproveTransferRequest {
  notes?: string;
}

// ---------------------------------------------------------------------------
// 9. RBAC: Resources, Actions, Permissions
// ---------------------------------------------------------------------------

export interface AuthorityAction {
  id: UUID;
  code: string;
  name: string;
  display_name: string | null;
  description: string | null;
  status: AuthorityStatus;
  metadata: Record<string, unknown>;
}

export interface CreateActionRequest {
  code: string;
  name: string;
  display_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateActionRequest extends CreateActionRequest {
  status: AuthorityStatus;
}

/** Resources have no controller yet — seeded directly against the DB. */
export interface AuthorityResource {
  id: UUID;
  code: string;
  name: string;
  display_name: string;
  description: string | null;
  resource_type: "custom" | "system";
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface SeedResourceRequest {
  code: string;
  name: string;
  display_name: string;
  description?: string;
  resource_type: "custom" | "system";
  metadata?: Record<string, unknown>;
}

export interface Permission {
  id: UUID;
  resource_id: UUID;
  action_id: UUID;
  code: string;
  display_name: string | null;
  status: AuthorityStatus;
  description?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreatePermissionRequest {
  resource_id: UUID;
  action_id: UUID;
  code: string;
  display_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePermissionRequest extends CreatePermissionRequest {
  status: AuthorityStatus;
}

// ---------------------------------------------------------------------------
// 10. RBAC: Roles
// ---------------------------------------------------------------------------

export interface Role {
  id: UUID;
  code: string;
  name: string;
  display_name: string | null;
  description?: string | null;
  is_system: boolean;
  status: AuthorityStatus;
  metadata?: Record<string, unknown>;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  display_name?: string;
  description?: string;
  is_system?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateRoleRequest extends CreateRoleRequest {
  status: AuthorityStatus;
}

export interface AttachPermissionRequest {
  permission_id: UUID;
}

export interface AttachedResult {
  attached: true;
}

export interface DetachedResult {
  detached: true;
}

// ---------------------------------------------------------------------------
// 11. RBAC: Role Assignments
// ---------------------------------------------------------------------------

export interface RoleAssignment {
  id: UUID;
  actor_id: UUID;
  container_id: UUID;
  role_id: UUID;
  effective_from: ISODateTime;
  effective_until: ISODateTime | null;
  assigned_at: ISODateTime;
  revoked_at: ISODateTime | null;
  status: AssignmentStatus;
  metadata: Record<string, unknown>;
}

export interface AssignRoleRequest {
  actor_id: UUID;
  container_id: UUID;
  role_id: UUID;
  effective_from?: ISODateTime;
  effective_until?: ISODateTime | null;
  metadata?: Record<string, unknown>;
}

export interface ListActiveAssignmentsParams {
  container_id: UUID;
}

export interface RevokeAssignmentRequest {
  assignment_id: UUID;
  revoked_at?: ISODateTime;
  metadata?: Record<string, unknown>;
}

export interface RevokeAssignmentResult {
  data: RoleAssignment;
  revoked: true;
}

// ---------------------------------------------------------------------------
// 12. Authorization Checks
// ---------------------------------------------------------------------------

export interface AuthorizeRequest {
  actor_id: UUID;
  container_id: UUID;
  resource_code: string;
  action_code: string;
  context?: Record<string, unknown>;
}

export interface AuthorizeDecision {
  decision: AuthorizationDecision;
  reason: string;
}

export interface CanResult {
  can: boolean;
}

export interface CannotResult {
  cannot: boolean;
}

export interface EffectivePermissionsParams {
  actor_id: UUID;
  container_id: UUID;
}

export interface EffectivePermission {
  id: UUID;
  code: string;
  status: AuthorityStatus;
}

// ---------------------------------------------------------------------------
// 13. Authorization Drivers
// ---------------------------------------------------------------------------

export interface AuthorityDriver {
  id: UUID;
  code: string;
  name: string;
  display_name: string | null;
  description: string | null;
  driver_type: DriverType;
  driver_class: string;
  priority: number;
  is_default: boolean;
  metadata: Record<string, unknown>;
}

export interface RegisterDriverRequest {
  code: string;
  name: string;
  display_name?: string;
  description?: string;
  driver_type: DriverType;
  driver_class: string;
  priority?: number;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 14. Authorization Policies
// ---------------------------------------------------------------------------

export interface AuthorizationPolicy {
  id: UUID;
  code: string;
  name: string;
  display_name: string | null;
  description: string | null;
  driver: string;
  priority: PolicyPriority;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CreateAuthorizationPolicyRequest {
  code: string;
  name: string;
  display_name?: string;
  description?: string;
  driver: string;
  priority: PolicyPriority;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type UpdateAuthorizationPolicyRequest = CreateAuthorizationPolicyRequest;

// ---------------------------------------------------------------------------
// 17. Error Reference
// ---------------------------------------------------------------------------

export const MAICORE_EXCEPTIONS = [
  "ContainerException",
  "ContainerNotFoundException",
  "HierarchyPolicyViolationException",
  "InvalidHierarchyOperationException",
  "InvalidContainerKindException",
  "MembershipAlreadyExistsException",
  "MembershipNotFoundException",
  "InvalidMembershipStatusException",
  "InvitationRevokedException",
  "InvitationExpiredException",
  "InvalidTransferException",
  "HierarchyPolicyException",
  "AuthenticationFailedException",
  "ActorNotFoundException",
] as const;

export type MaicoreExceptionName = (typeof MAICORE_EXCEPTIONS)[number];

export interface RegisterRequest {
  display_name: string;
  identifier: string; // email
  password: string;
}

// ---------------------------------------------------------------------------
// 6. Membership Management (continued)
// ---------------------------------------------------------------------------

export interface JoinMembershipRequest {
  actor_id: UUID;
  container_id: UUID;
}

export interface TransferMembershipRequest {
  to_container_id: UUID;
  reason?: string;
}

export type AccessMode = "role_required" | "open_to_members";

export interface TemplateFeature {
  code: string;
  access_mode: AccessMode;
}
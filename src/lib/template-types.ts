// ── Container Kinds ───────────────────────────────────────────────

export interface ContainerKind {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateContainerKindRequest {
  code: string;
  name: string;
  display_name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateContainerKindRequest {
  name?: string;
  display_name?: string;
  description?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

// ── Container Templates ──────────────────────────────────────────

export interface ContainerTemplatePolicy {
  maximum_depth?: number | null;
  maximum_children?: number | null;
  allow_transfers?: boolean;
  allow_invitations?: boolean;
  allow_public_discovery?: boolean;
  default_visibility?: "public" | "protected" | "private";
}


export interface CreateContainerTemplateRequest {
  code: string;
  name: string;
  display_name: string;
  description?: string;
  container_kind_id: string;
  default_visibility?: "public" | "private" | "restricted";
  default_policy?: ContainerTemplatePolicy;
  name_pattern?: string;
  metadata?: Record<string, unknown>;
  // Business capabilities enabled automatically on every container created
  // from this template, and the capability-scoped roles granted to the
  // creator in the container it produces.
  default_features?: string[];
  default_capability_roles?: string[];
}

export interface UpdateContainerTemplateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  container_kind_id?: string;
  default_visibility?: "public" | "private" | "restricted";
  default_policy?: ContainerTemplatePolicy;
  name_pattern?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  default_features?: string[];
  default_capability_roles?: string[];
}


export interface CreateHierarchyTemplateRequest {
  code: string;
  name: string;
  display_name: string;
  description?: string;
  structure: HierarchyTemplateNode;
  metadata?: Record<string, unknown>;
}

export interface UpdateHierarchyTemplateRequest {
  name?: string;
  display_name?: string;
  description?: string;
  structure?: HierarchyTemplateNode;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface InstantiateHierarchyTemplateRequest {
  code_prefix: string;
  display_name_prefix: string;
  visibility?: "public" | "private" | "restricted";
  activate?: boolean;
}

// src/lib/template-types.ts

export interface ContainerKind {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TemplatePermission {
  resource_code: string;
  action_code: string;
}

export type TemplateRole = {
  role_code: string;
  role_name: string;
  /** Flat permission codes: "invoice.create", "documents.document.view" */
  permissions: string[];
  auto_assign_creator?: boolean;
  /** true = reference an existing authority_role; its permissions are not rewritten */
  existing?: boolean;
};

/** The legacy shape, kept only so normalizeRoles() can migrate it on load. */
export type LegacyTemplatePermission = {
  resource_code: string;
  action_code: string;
};

export interface TemplatePolicy {
  maximum_depth?: number | null;
  maximum_children?: number | null;
  allow_transfers?: boolean;
  allow_invitations?: boolean;
  allow_public_discovery?: boolean;
  allow_public_join?: boolean;
  default_visibility?: "public" | "protected" | "private";
}

export interface ContainerTemplate {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description: string | null;
  container_kind_id: string;
  container_kind: { id: string; code: string; display_name: string } | null;
  default_visibility: string;
  default_policy: TemplatePolicy;
  default_roles: TemplateRole[];
  // Business capabilities auto-enabled on containers created from this
  // template, and the capability roles granted to the instantiating creator.
  default_features: string[];
  default_capability_roles: string[];
  name_pattern: string | null;
  status: string;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HierarchyTemplateNode {
  template_id: string;
  code_suffix: string;
  children: HierarchyTemplateNode[];
  template_name?: string;
  template_code?: string;
  kind_name?: string;
}

export interface HierarchyTemplate {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description: string | null;
  structure: HierarchyTemplateNode;
  status: string;
  version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InstantiateResult {
  template_id: string;
  containers_created: number;
  root_container_id: string;
  containers: Array<{
    id: string;
    code: string;
    display_name: string;
    path: string;
    status: string;
    template_id: string;
    container_actor_id: string | null;
    roles_created: number;
  }>;
}
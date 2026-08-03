/* ── capability-side types ───────────────────────────────────────── */

export type Capability = {
  code: string;
  display_name: string;
  description: string | null;
  is_module: boolean;
  resources: { code: string; display_name: string }[];
  permissions: {
    id: string;
    code: string;
    display_name: string;
    resource_code: string;
    action_code: string;
  }[];
  roles: {
    id: string;
    code: string;
    display_name: string;
    permissions: string[];
  }[];
  container_count: number;
};

export type CatalogEntry = {
  feature_code: string;
  display_name: string;
  description: string | null;
  tier: string;
  origin?: string; // 'manifest' | 'custom' — may be absent on older payloads
  has_frontend: boolean;
  is_universal: boolean;
  family: { code: string; display_name: string; icon: string | null } | null;
  industries: { code: string; display_name: string }[];
  tags: string[];
  internal_uses: { feature_code: string; nature: string; optional: boolean }[];
};

export type Mapping = {
  container_id: string;
  enabled: boolean;
  access_mode: "role_required" | "open_to_members";
  container_display_name: string;
  container_code: string;
  container_path: string;
  container_status: string;
};

export type Container = {
  id: string;
  code: string;
  display_name: string;
  path?: string;
};

/* ── registry-side types ──────────────────────────────────────────── */

export type AssetType =
  | "platform"
  | "domain"
  | "service"
  | "package"
  | "contract"
  | "driver"
  | "capability";
export type AssetStatus = "active" | "inactive" | "deprecated" | "retired";
export type VersionStatus = "draft" | "active" | "deprecated" | "retired";
export type DetailTab = "overview" | "versions" | "relationships";
export type ViewMode = "list" | "graph";

export interface Asset {
  id: string;
  asset_type: AssetType;
  code: string;
  slug: string;
  name: string;
  description: string;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  versions?: AssetVersion[];
  source_relationships?: Relationship[];
  target_relationships?: Relationship[];
}

export interface AssetVersion {
  id: string;
  version: string;
  status: VersionStatus;
  released_at: string;
  metadata: Record<string, unknown>;
}

export interface RelationshipData {
  outgoing: { relationship_type: string; target_asset_id: string }[];
  incoming: { relationship_type: string; source_asset_id: string }[];
  relationship_type_breakdown: Record<string, number>;
}

export interface Relationship {
  relationship_type: string;
  target_asset_id?: string;
  source_asset_id?: string;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
}

/* ── documentation types ─────────────────────────────────────────── */

export type DocCategory = {
  code: string;
  display_name: string;
  description: string | null;
  status: string;
};

export type RegistryDocument = {
  id: string;
  asset_id: string;
  version_id: string;
  category: { code: string; display_name: string } | null;
  title: string;
  slug: string;
  status: string;
  metadata: Record<string, unknown>;
  content: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistryVersion = {
  id: string;
  asset_id: string;
  version: string;
  status: string;
  released_at: string | null;
};

/* ── manage-mode / workspace types ───────────────────────────────── */

export type CapabilityTab = "containers" | "permissions" | "documentation" | "about";
export type WorkspaceMode = "manage" | "explore";

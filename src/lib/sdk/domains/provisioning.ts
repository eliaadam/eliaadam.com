import { api } from "../../query/Api";

/**
 * Typed client for `domains.provisioning`'s REST API
 * (`/api/provisioning/...`). Every template is addressed by CODE, not
 * internal id, matching the backend's own routing.
 */

export type AccessMode = "role_required" | "open_to_members";
export type Visibility = "public" | "protected" | "private";

export interface TemplateCapability {
  feature_code: string;
  access_mode: AccessMode;
}

export interface ContainerTemplate {
  id: string;
  code: string;
  name: string;
  container_kind_code: string;
  status: "active" | "archived";
  description: string | null;
  default_visibility: Visibility;
  allow_transfers: boolean;
  allow_invitations: boolean;
  allow_public_join: boolean;
  default_member_role_code: string | null;
  maximum_depth: number | null;
  maximum_children: number | null;
  allowed_child_kinds: string[];
  capabilities: TemplateCapability[];
  requires_approval: boolean;
  required_form_id: string | null;
  metadata: Record<string, unknown>;
  created_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateChildEdge {
  id: string;
  parent_template_id: string;
  child_template_id: string;
  order: number;
  name_override: string | null;
}

export interface InstantiatedContainer {
  id: string;
  code: string;
  slug: string;
  name: string;
  display_name: string;
  parent_container_id: string | null;
  container_kind_id: string;
  visibility: string;
  status: string;
}

export interface InstantiationRequest {
  id: string;
  request_type: string;
  requester_actor_id: string;
  target_type: string;
  target_id: string;
  status: "pending" | "approved" | "rejected";
  payload: {
    template_code: string;
    parent_container_id: string | null;
    name: string | null;
    visibility_override: Visibility | null;
    allow_public_join_override: boolean | null;
    form_answers: Record<string, unknown> | null;
  };
  requested_at: string | null;
  decided_at: string | null;
  decided_by_actor_id: string | null;
  decision_reason: string | null;
}

export type InstantiateResult =
  | { type: "container"; container: InstantiatedContainer }
  | { type: "instantiation_request"; request: InstantiationRequest };

export interface TemplateInput {
  code: string;
  name: string;
  container_kind_code: string;
  description?: string;
  default_visibility?: Visibility;
  allow_transfers?: boolean;
  allow_invitations?: boolean;
  allow_public_join?: boolean;
  default_member_role_code?: string;
  maximum_depth?: number;
  maximum_children?: number;
  allowed_child_kinds?: string[];
  capabilities?: TemplateCapability[];
  requires_approval?: boolean;
  required_form_id?: string;
  metadata?: Record<string, unknown>;
}

function listTemplates(): Promise<ContainerTemplate[]> {
  return api.get<ContainerTemplate[]>("/api/provisioning/templates/");
}

function getTemplate(code: string): Promise<ContainerTemplate> {
  return api.get<ContainerTemplate>(`/api/provisioning/templates/${code}/`);
}

function createTemplate(input: TemplateInput): Promise<ContainerTemplate> {
  return api.post<ContainerTemplate>("/api/provisioning/templates/", input);
}

function updateTemplate(
  code: string,
  input: Partial<TemplateInput>,
): Promise<ContainerTemplate> {
  return api.patch<ContainerTemplate>(
    `/api/provisioning/templates/${code}/`,
    input,
  );
}

function archiveTemplate(code: string): Promise<ContainerTemplate> {
  return api.post<ContainerTemplate>(
    `/api/provisioning/templates/${code}/archive/`,
  );
}

function listChildren(code: string): Promise<TemplateChildEdge[]> {
  return api.get<TemplateChildEdge[]>(
    `/api/provisioning/templates/${code}/children/`,
  );
}

function addChild(
  code: string,
  input: {
    child_template_code: string;
    order?: number;
    name_override?: string;
  },
): Promise<TemplateChildEdge> {
  return api.post<TemplateChildEdge>(
    `/api/provisioning/templates/${code}/children/`,
    input,
  );
}

function removeChild(
  code: string,
  childEdgeId: string,
): Promise<{ deleted: boolean; id: string }> {
  return api.delete<{ deleted: boolean; id: string }>(
    `/api/provisioning/templates/${code}/children/${childEdgeId}/`,
  );
}

function instantiateTemplate(
  code: string,
  input: {
    actor_id: string;
    parent_container_id?: string;
    name?: string;
    visibility_override?: Visibility;
    allow_public_join_override?: boolean;
    form_answers?: Record<string, unknown>;
  },
): Promise<InstantiateResult> {
  return api.post<InstantiateResult>(
    `/api/provisioning/templates/${code}/instantiate/`,
    input,
  );
}

// -- Instantiation requests (requires_approval templates) -----------------

async function listInstantiationRequests(
  templateCode: string,
  status: string = "pending",
): Promise<InstantiationRequest[]> {

  return api.get<InstantiationRequest[]>(
    `/api/provisioning/templates/${templateCode}/instantiation-requests/?status=${status}`,
  );
}

function approveInstantiationRequest(
  requestId: string,
  containerId?: string,
  reason?: string,
): Promise<InstantiatedContainer> {
  return api.post<InstantiatedContainer>(
    `/api/provisioning/instantiation-requests/${requestId}/approve/`,
    { container_id: containerId, reason },
  );
}

function rejectInstantiationRequest(
  requestId: string,
  containerId?: string,
  reason?: string,
): Promise<InstantiationRequest> {
  return api.post<InstantiationRequest>(
    `/api/provisioning/instantiation-requests/${requestId}/reject/`,
    { container_id: containerId, reason },
  );
}

async function listMyInstantiationRequests(
  status?: string,
): Promise<InstantiationRequest[]> {

  return api.get<InstantiationRequest[]>(
    `/api/provisioning/my-instantiation-requests/${status ? `?status=${status}` : ""}`,
  );
}

async function listAllInstantiationRequests(
  status: string = "pending",
): Promise<InstantiationRequest[]> {
  return api.get<InstantiationRequest[]>(
    `/api/provisioning/instantiation-requests/?status=${status}`,
  );
}

export const provisioning = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  archiveTemplate,
  listChildren,
  addChild,
  removeChild,
  instantiateTemplate,
  listInstantiationRequests,
  approveInstantiationRequest,
  rejectInstantiationRequest,
  listMyInstantiationRequests,
  listAllInstantiationRequests,
};

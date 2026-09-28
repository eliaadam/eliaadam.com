import { api, API_BASE_URL, ApiError } from "../../query/Api";
import { getAuthToken } from "../../other/authToken";

/**
 * Typed client for `capabilities.core.template_library`
 * (`/api/template-library/...`): shareable, versioned templates —
 * configuration, starter content and files — that collaborators author
 * and containers apply.
 *
 * Attachments never expose a stored file id: each one carries an
 * authenticated `download_path`, fetched by `downloadAttachment()`
 * (a plain <a href> can't send the Authorization header).
 */

export type TemplateVisibility = "private" | "public";
export type TemplateStatus = "draft" | "published" | "archived";
export type VersionStatus = "draft" | "published";
export type CollaboratorRole = "owner" | "editor";
export type InstallStatus = "applied" | "failed";

export interface TemplateKind {
  code: string;
  label: string;
  description: string;
  /** false = "recorded only": installing just records the adoption. */
  applicable: boolean;
  payload_hint: Record<string, unknown> | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  kind: string;
  visibility: TemplateVisibility;
  status: TemplateStatus;
  tags: string[];
  owner_container_id: string | null;
  created_by_actor_id: string;
  forked_from_template_id: string | null;
  /** Highest PUBLISHED version; 0 = never published. */
  latest_version_number: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateListItem extends Template {
  install_count: number;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  status: VersionStatus;
  payload: Record<string, unknown>;
  changelog: string;
  published_at: string | null;
  published_by_actor_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateAttachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  position: number;
  /** Server-relative path; use downloadAttachment(). */
  download_path: string;
}

export interface VersionDetail {
  version: TemplateVersion;
  attachments: TemplateAttachment[];
}

export interface TemplateDetail {
  template: Template;
  /** The caller's collaborator role, or null when just a reader. */
  my_role: CollaboratorRole | null;
  install_count: number;
  published: VersionDetail | null;
  /** Collaborators only. */
  draft: VersionDetail | null;
}

export interface Collaborator {
  id: string;
  template_id: string;
  actor_id: string;
  role: CollaboratorRole;
  added_by_actor_id: string | null;
  created_at: string | null;
}

export interface TemplateInstall {
  id: string;
  template_id: string;
  version_id: string;
  version_number: number;
  target_container_id: string;
  applied_by_actor_id: string;
  status: InstallStatus;
  result: Record<string, unknown>;
  error: string;
  created_at: string | null;
}

export interface TemplateInstallSummary extends TemplateInstall {
  template_name: string;
  latest_version_number: number;
  /** A newer published version exists than the one installed. */
  update_available: boolean;
}

export interface BrowseFilters {
  kind?: string;
  tag?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTemplateInput {
  name: string;
  kind: string;
  description?: string;
  tags?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface InstallInput {
  /** Omit for the latest published version. */
  version_number?: number;
  /** Passed to the kind's apply handler. */
  options?: Record<string, unknown>;
  /** Install again even if this version is already installed here. */
  allow_repeat?: boolean;
}

const BASE = "/api/template-library";

// -- kinds & discovery ------------------------------------------------

async function listKinds(): Promise<TemplateKind[]> {
  const r = await api.get<{ results: TemplateKind[] }>(`${BASE}/kinds/`);
  return r.results;
}

/** Public, published templates. Needs `template.view` in the container. */
async function browseLibrary(
  containerId: string,
  filters: BrowseFilters = {},
): Promise<TemplateListItem[]> {
  const params = new URLSearchParams();
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined) params.set("offset", String(filters.offset));
  const qs = params.toString();
  const r = await api.get<{ results: TemplateListItem[] }>(
    `${BASE}/containers/${containerId}/library/${qs ? `?${qs}` : ""}`,
  );
  return r.results;
}

/** Templates the caller collaborates on (any status). */
async function listMyTemplates(): Promise<Template[]> {
  const r = await api.get<{ results: Template[] }>(`${BASE}/templates/mine/`);
  return r.results;
}

// -- template lifecycle -----------------------------------------------

/** Needs `template.author` in the container; the creator becomes owner. */
function createTemplate(containerId: string, input: CreateTemplateInput): Promise<Template> {
  return api.post<Template>(`${BASE}/containers/${containerId}/templates/`, input);
}

/** 404 when the template is private and the caller isn't a collaborator. */
function getTemplate(templateId: string): Promise<TemplateDetail> {
  return api.get<TemplateDetail>(`${BASE}/templates/${templateId}/`);
}

function updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<Template> {
  return api.post<Template>(`${BASE}/templates/${templateId}/update/`, input);
}

/** Owner only. "public" requires a published version. */
function setVisibility(templateId: string, visibility: TemplateVisibility): Promise<Template> {
  return api.post<Template>(`${BASE}/templates/${templateId}/visibility/`, { visibility });
}

function archiveTemplate(templateId: string): Promise<Template> {
  return api.post<Template>(`${BASE}/templates/${templateId}/archive/`);
}

function restoreTemplate(templateId: string): Promise<Template> {
  return api.post<Template>(`${BASE}/templates/${templateId}/restore/`);
}

/** Copies the latest published version into a new private template the
 * caller owns. Needs `template.author` in the acting container. */
function forkTemplate(containerId: string, templateId: string, name?: string): Promise<Template> {
  return api.post<Template>(
    `${BASE}/containers/${containerId}/templates/${templateId}/fork/`,
    name ? { name } : {},
  );
}

// -- versions, drafts, attachments ------------------------------------

async function listVersions(templateId: string): Promise<TemplateVersion[]> {
  const r = await api.get<{ results: TemplateVersion[] }>(`${BASE}/templates/${templateId}/versions/`);
  return r.results;
}

function getVersion(templateId: string, versionNumber: number): Promise<VersionDetail> {
  return api.get<VersionDetail>(`${BASE}/templates/${templateId}/versions/${versionNumber}/`);
}

/** Starts the next draft from the latest published version (409 if one exists). */
function createDraft(templateId: string): Promise<VersionDetail> {
  return api.post<VersionDetail>(`${BASE}/templates/${templateId}/draft/`);
}

/** 400 with the kind's own message when the payload is invalid. */
function updateDraft(
  templateId: string,
  input: { payload?: Record<string, unknown>; changelog?: string },
): Promise<VersionDetail> {
  return api.post<VersionDetail>(`${BASE}/templates/${templateId}/draft/update/`, input);
}

function publishDraft(templateId: string): Promise<VersionDetail> {
  return api.post<VersionDetail>(`${BASE}/templates/${templateId}/draft/publish/`);
}

function discardDraft(templateId: string): Promise<{ discarded: boolean }> {
  return api.post<{ discarded: boolean }>(`${BASE}/templates/${templateId}/draft/discard/`);
}

/** Adds a file to the DRAFT (max 25 MB, 20 per version). */
function uploadAttachment(templateId: string, file: File): Promise<TemplateAttachment> {
  const form = new FormData();
  form.append("file", file);
  return api.uploadMultipart<TemplateAttachment>(
    `${BASE}/templates/${templateId}/draft/attachments/`,
    form,
  );
}

function removeAttachment(templateId: string, attachmentId: string): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `${BASE}/templates/${templateId}/draft/attachments/${attachmentId}/remove/`,
  );
}

/** Downloads through the authenticated endpoint and saves the file in
 * the browser. (An <a href> can't carry the Authorization header.) */
async function downloadAttachment(
  attachment: Pick<TemplateAttachment, "download_path" | "filename">,
): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${attachment.download_path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Download failed with status ${response.status}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body) {
        message = String((body as { error: unknown }).error);
      }
    } catch {
      // Non-JSON error body.
    }
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// -- collaborators ----------------------------------------------------

/** Collaborators only. */
async function listCollaborators(templateId: string): Promise<Collaborator[]> {
  const r = await api.get<{ results: Collaborator[] }>(`${BASE}/templates/${templateId}/collaborators/`);
  return r.results;
}

/** Owner only. There is no read-only role — Ownership counts every
 * collaborator as an owner, so only "owner" and "editor" exist. */
function addCollaborator(
  templateId: string,
  actorId: string,
  role: CollaboratorRole = "editor",
): Promise<Collaborator> {
  return api.post<Collaborator>(`${BASE}/templates/${templateId}/collaborators/`, {
    actor_id: actorId,
    role,
  });
}

/** 409 if it would leave the template with no owner. */
function changeCollaboratorRole(
  templateId: string,
  collaboratorId: string,
  role: CollaboratorRole,
): Promise<Collaborator> {
  return api.post<Collaborator>(
    `${BASE}/templates/${templateId}/collaborators/${collaboratorId}/update/`,
    { role },
  );
}

/** An owner can remove anyone; anyone can remove themselves (leave). */
function removeCollaborator(templateId: string, collaboratorId: string): Promise<{ removed: boolean }> {
  return api.post<{ removed: boolean }>(
    `${BASE}/templates/${templateId}/collaborators/${collaboratorId}/remove/`,
  );
}

// -- installs ---------------------------------------------------------

/** Needs `template.apply` in the container. Applying is a COPY. A kind
 * whose handler fails rejects with an ApiError (HTTP 422) carrying the
 * reason; the failed install is still recorded in listInstalls(). */
function installTemplate(
  containerId: string,
  templateId: string,
  input: InstallInput = {},
): Promise<TemplateInstall> {
  return api.post<TemplateInstall>(
    `${BASE}/containers/${containerId}/templates/${templateId}/install/`,
    input,
  );
}

async function listInstalls(containerId: string): Promise<TemplateInstallSummary[]> {
  const r = await api.get<{ results: TemplateInstallSummary[] }>(
    `${BASE}/containers/${containerId}/installs/`,
  );
  return r.results;
}

export const templateLibrary = {
  listKinds, browseLibrary, listMyTemplates,
  createTemplate, getTemplate, updateTemplate, setVisibility, archiveTemplate, restoreTemplate, forkTemplate,
  listVersions, getVersion, createDraft, updateDraft, publishDraft, discardDraft,
  uploadAttachment, removeAttachment, downloadAttachment,
  listCollaborators, addCollaborator, changeCollaboratorRole, removeCollaborator,
  installTemplate, listInstalls,
};

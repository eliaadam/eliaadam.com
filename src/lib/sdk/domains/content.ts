import { api } from "../../query/Api";

/**
 * Typed client for `core.content`'s REST API (`/api/content/...`) —
 * generic, configurable content: content types, the working copy and
 * its lifecycle, immutable published versions, and five composable
 * structures (blocks, media, links, embeds, content-to-content
 * references). `getPublic` is the one call that hits a genuinely
 * unauthenticated route — it never returns draft/working-copy state,
 * only the latest published snapshot.
 */

export type ContentFormat = "markdown" | "html" | "rich_text" | "structured" | "plain_text" | "custom";
export type ContentStatus = "draft" | "in_review" | "published" | "archived";
export type ContentVisibility = "private" | "container" | "public";
export type MediaKind = "image" | "video" | "audio" | "document";

export interface ContentType {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface ContentItem {
  id: string;
  content_type_id: string;
  title: string;
  summary: string;
  body: string;
  format: ContentFormat;
  status: ContentStatus;
  visibility: ContentVisibility;
  slug: string | null;
  author_actor_id: string | null;
  published_at: string | null;
  latest_published_version: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  title: string;
  summary: string;
  body: string;
  format: ContentFormat;
  published_at: string | null;
  published_by_actor_id: string | null;
}

export interface PublicContentReference {
  id: string;
  from_content_id: string;
  to_content_id: string;
  relation_type: string;
  /** Only set when the target is itself published + public — otherwise
   * there's nothing safe to link to, and the frontend should show this
   * as plain text instead of a link. */
  to_slug: string | null;
  to_title: string | null;
}

export interface PublicContent {
  title: string;
  summary: string;
  body: string;
  format: ContentFormat;
  version_number: number;
  published_at: string | null;
  /** Served LIVE from the current working copy, NOT snapshotted at
   * publish time like title/body/summary are — see the backend wiring
   * notes. */
  blocks: ContentBlock[];
  media: MediaReference[];
  links: LinkReference[];
  embeds: EmbedReference[];
  references: PublicContentReference[];
}

export interface ContentBlock {
  id: string;
  content_id: string;
  position: number;
  block_type: string;
  payload: Record<string, unknown>;
}

export interface MediaReference {
  id: string;
  content_id: string;
  document_id: string;
  kind: MediaKind;
  caption: string;
  position: number;
}

export interface LinkReference {
  id: string;
  content_id: string;
  url: string;
  label: string;
  position: number;
}

export interface EmbedReference {
  id: string;
  content_id: string;
  embed_type: string;
  embed_data: Record<string, unknown>;
  position: number;
}

export interface ContentReference {
  id: string;
  from_content_id: string;
  to_content_id: string;
  relation_type: string;
}

export interface ContentGroup {
  id: string;
  parent_group_id: string | null;
  name: string;
  slug: string | null;
  description: string;
  position: number;
}

export interface GroupMember {
  membership_id: string;
  position: number;
  content_id: string;
  title: string;
  summary: string;
  slug: string | null;
  status: ContentStatus;
  visibility: ContentVisibility;
}

export interface PublicContentSummary {
  slug: string;
  title: string;
  summary: string;
  content_type_id: string;
  published_at: string | null;
}

export interface PublicGroupSummary {
  id: string;
  slug: string | null;
  name: string;
  description: string;
}

export interface PublicGroupPage {
  group: PublicGroupSummary;
  child_groups: PublicGroupSummary[];
  content: PublicContentSummary[];
}

function base(containerId: string) {
  return `/api/content/containers/${containerId}`;
}

function contentTypes(containerId: string) {
  const b = `${base(containerId)}/content-types`;
  return {
    list: (activeOnly = false) => api.get<{ content_types: ContentType[] }>(`${b}/${activeOnly ? "?active_only=true" : ""}`).then((r) => r.content_types),
    get: (id: string) => api.get<ContentType>(`${b}/${id}/`),
    create: (input: { code: string; name: string; description?: string }) => api.post<ContentType>(`${b}/create/`, input),
    update: (id: string, changes: Partial<Pick<ContentType, "code" | "name" | "description">>) => api.post<ContentType>(`${b}/${id}/update/`, changes),
    activate: (id: string) => api.post<ContentType>(`${b}/${id}/activate/`, {}),
    deactivate: (id: string) => api.post<ContentType>(`${b}/${id}/deactivate/`, {}),
  };
}

function content(containerId: string) {
  const b = `${base(containerId)}/content`;
  return {
    list: (filters?: { content_type_id?: string; status?: ContentStatus; author_actor_id?: string }) => {
      const qs = new URLSearchParams();
      if (filters?.content_type_id) qs.set("content_type_id", filters.content_type_id);
      if (filters?.status) qs.set("status", filters.status);
      if (filters?.author_actor_id) qs.set("author_actor_id", filters.author_actor_id);
      const s = qs.toString();
      return api.get<{ content: ContentItem[] }>(`${b}/${s ? `?${s}` : ""}`).then((r) => r.content);
    },
    get: (id: string) => api.get<ContentItem>(`${b}/${id}/`),
    create: (input: { content_type_id: string; title: string; summary?: string; body?: string; format?: ContentFormat; visibility?: ContentVisibility; slug?: string }) =>
      api.post<ContentItem>(`${b}/create/`, input),
    update: (id: string, changes: Partial<Pick<ContentItem, "title" | "summary" | "body" | "format" | "visibility" | "slug" | "content_type_id">>) =>
      api.post<ContentItem>(`${b}/${id}/update/`, changes),
    submitForReview: (id: string) => api.post<ContentItem>(`${b}/${id}/submit-for-review/`, {}),
    sendBack: (id: string) => api.post<ContentItem>(`${b}/${id}/send-back/`, {}),
    publish: (id: string) => api.post<ContentItem>(`${b}/${id}/publish/`, {}),
    unpublish: (id: string) => api.post<ContentItem>(`${b}/${id}/unpublish/`, {}),
    archive: (id: string) => api.post<ContentItem>(`${b}/${id}/archive/`, {}),
    restore: (id: string) => api.post<ContentItem>(`${b}/${id}/restore/`, {}),
    versions: (id: string) => api.get<{ versions: ContentVersion[] }>(`${b}/${id}/versions/`).then((r) => r.versions),
    version: (id: string, versionNumber: number) => api.get<ContentVersion>(`${b}/${id}/versions/${versionNumber}/`),
  };
}

function blocks(containerId: string) {
  return {
    list: (contentId: string) => api.get<{ blocks: ContentBlock[] }>(`${base(containerId)}/content/${contentId}/blocks/`).then((r) => r.blocks),
    add: (contentId: string, input: { position: number; block_type: string; payload: Record<string, unknown> }) =>
      api.post<ContentBlock>(`${base(containerId)}/content/${contentId}/blocks/add/`, input),
    update: (blockId: string, changes: Partial<Pick<ContentBlock, "position" | "block_type" | "payload">>) =>
      api.post<ContentBlock>(`${base(containerId)}/blocks/${blockId}/update/`, changes),
    remove: (blockId: string) => api.post<{ removed: true }>(`${base(containerId)}/blocks/${blockId}/remove/`, {}),
  };
}

function media(containerId: string) {
  return {
    list: (contentId: string) => api.get<{ media: MediaReference[] }>(`${base(containerId)}/content/${contentId}/media/`).then((r) => r.media),
    add: (contentId: string, input: { document_id: string; kind: MediaKind; caption?: string; position?: number }) =>
      api.post<MediaReference>(`${base(containerId)}/content/${contentId}/media/add/`, input),
    remove: (referenceId: string) => api.post<{ removed: true }>(`${base(containerId)}/media/${referenceId}/remove/`, {}),
  };
}

function links(containerId: string) {
  return {
    list: (contentId: string) => api.get<{ links: LinkReference[] }>(`${base(containerId)}/content/${contentId}/links/`).then((r) => r.links),
    add: (contentId: string, input: { url: string; label?: string; position?: number }) =>
      api.post<LinkReference>(`${base(containerId)}/content/${contentId}/links/add/`, input),
    remove: (referenceId: string) => api.post<{ removed: true }>(`${base(containerId)}/links/${referenceId}/remove/`, {}),
  };
}

function embeds(containerId: string) {
  return {
    list: (contentId: string) => api.get<{ embeds: EmbedReference[] }>(`${base(containerId)}/content/${contentId}/embeds/`).then((r) => r.embeds),
    add: (contentId: string, input: { embed_type: string; embed_data: Record<string, unknown>; position?: number }) =>
      api.post<EmbedReference>(`${base(containerId)}/content/${contentId}/embeds/add/`, input),
    remove: (referenceId: string) => api.post<{ removed: true }>(`${base(containerId)}/embeds/${referenceId}/remove/`, {}),
  };
}

function contentReferences(containerId: string) {
  return {
    listFrom: (contentId: string) => api.get<{ references: ContentReference[] }>(`${base(containerId)}/content/${contentId}/references/from/`).then((r) => r.references),
    listTo: (contentId: string) => api.get<{ references: ContentReference[] }>(`${base(containerId)}/content/${contentId}/references/to/`).then((r) => r.references),
    add: (contentId: string, toContentId: string, relationType = "related") =>
      api.post<ContentReference>(`${base(containerId)}/content/${contentId}/references/add/`, { to_content_id: toContentId, relation_type: relationType }),
    remove: (referenceId: string) => api.post<{ removed: true }>(`${base(containerId)}/references/${referenceId}/remove/`, {}),
  };
}

/** Genuinely unauthenticated — no permission check on the backend at
 * all. Note the "content/" segment before the slug — it's there
 * deliberately so a real content slug that happens to equal "discover"
 * or "groups" is never swallowed by those other public routes. */
function getPublic(containerId: string, slug: string) {
  return api.get<PublicContent>(`/api/content/public/${containerId}/content/${slug}/`);
}

function discoverPublic(containerId: string, filters?: { content_type_id?: string; search?: string; group_id?: string }) {
  const qs = new URLSearchParams();
  if (filters?.content_type_id) qs.set("content_type_id", filters.content_type_id);
  if (filters?.search) qs.set("search", filters.search);
  if (filters?.group_id) qs.set("group_id", filters.group_id);
  const s = qs.toString();
  return api.get<{ content: PublicContentSummary[] }>(`/api/content/public/${containerId}/discover/${s ? `?${s}` : ""}`).then((r) => r.content);
}

function listPublicRootGroups(containerId: string) {
  return api.get<{ groups: PublicGroupSummary[] }>(`/api/content/public/${containerId}/groups/`).then((r) => r.groups);
}

function getPublicGroup(containerId: string, groupSlug: string) {
  return api.get<PublicGroupPage>(`/api/content/public/${containerId}/groups/${groupSlug}/`);
}

function groups(containerId: string) {
  const b = `${base(containerId)}/groups`;
  return {
    list: () => api.get<{ groups: ContentGroup[] }>(`${b}/`).then((r) => r.groups),
    children: (parentGroupId?: string) =>
      api.get<{ groups: ContentGroup[] }>(`${b}/children/${parentGroupId ? `?parent_group_id=${parentGroupId}` : ""}`).then((r) => r.groups),
    create: (input: { name: string; parent_group_id?: string; slug?: string; description?: string; position?: number }) =>
      api.post<ContentGroup>(`${b}/create/`, input),
    get: (groupId: string) => api.get<ContentGroup>(`${b}/${groupId}/`),
    update: (groupId: string, changes: Partial<Pick<ContentGroup, "name" | "slug" | "description" | "position" | "parent_group_id">>) =>
      api.post<ContentGroup>(`${b}/${groupId}/update/`, changes),
    delete: (groupId: string) => api.post<{ deleted: true }>(`${b}/${groupId}/delete/`, {}),
    members: (groupId: string) => api.get<{ members: GroupMember[] }>(`${b}/${groupId}/members/`).then((r) => r.members),
    addMember: (groupId: string, contentId: string, position = 0) =>
      api.post<{ id: string; group_id: string; content_id: string; position: number }>(`${b}/${groupId}/members/add/`, { content_id: contentId, position }),
    removeMember: (groupId: string, contentId: string) => api.post<{ removed: true }>(`${b}/${groupId}/members/${contentId}/remove/`, {}),
  };
}

export const content_ = {
  contentTypes, content, blocks, media, links, embeds, contentReferences, groups, getPublic, discoverPublic, listPublicRootGroups, getPublicGroup,
};

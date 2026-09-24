import { api, ApiError } from "../../query/Api";

/**
 * Typed client for `domains.container`'s REST API (`/api/container/...`).
 *
 * NOTE on response envelopes: unlike identity/registry, Container's
 * list endpoints return `{"results": [...]}`, not `{"data": [...]}`.
 * `api.get<T>()`'s generic unwrap only understands `.data` (see
 * `lib/query/Api.ts`), so list functions here type the raw envelope
 * and pull `.results` out themselves rather than pretending the
 * generic unwrap handles it — matching what the backend actually
 * returns, not reshaping it to "look nicer" (see sdk/README.md's own
 * rule on this).
 */

export interface Container {
  id: string;
  container_owner_id: string;
  tenant_container_id: string;
  parent_container_id: string | null;
  container_kind_id: string;
  code: string;
  slug: string;
  name: string;
  display_name: string;
  description: string | null;
  path: string;
  depth: number;
  is_root: boolean;
  visibility: "public" | "protected" | "private";
  status: "draft" | "active" | "suspended" | "archived";
  version: number;
  metadata: Record<string, unknown>;
}

export interface Membership {
  id: string;
  container_id: string;
  actor_id: string;
  role: string;
  status: "pending" | "active" | "suspended" | "left" | "terminated";
  version: number;
  metadata: Record<string, unknown>;
}

export interface ContainerKind {
  id: string;
  code: string;
  name: string;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
}

export interface Invitation {
  id: string;
  container_id: string;
  invited_by_actor_id: string;
  code: string;
  type: "email" | "actor" | "link";
  role: string;
  status: string;
  invitee_actor_id: string | null;
  expires_at: string | null;
  assigned_role_codes: string[];
  metadata: Record<string, unknown>;
}

export interface JoinRequest {
  id: string;
  container_id: string;
  actor_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string | null;
  decided_at: string | null;
  decided_by_actor_id: string | null;
}

export interface SearchContainersParams {
  visibility?: "public" | "protected" | "private";
  excludeVisibility?: "public" | "protected" | "private";
  status?: "draft" | "active" | "suspended" | "archived";
  publicJoinOnly?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

interface ResultsEnvelope<T> {
  results: T[];
}

function getContainer(containerId: string): Promise<Container> {
  return api.get<Container>(`/api/container/containers/${containerId}/`);
}

function getContainerBySlug(slug: string): Promise<Container> {
  return api.get<Container>(`/api/container/containers/by-slug/${slug}/`);
}

async function listActorMemberships(actorId: string): Promise<Membership[]> {
  const envelope = await api.get<ResultsEnvelope<Membership>>(
    `/api/container/actors/${actorId}/memberships/`,
  );
  return envelope.results;
}

async function listChildren(containerId: string): Promise<Container[]> {
  const envelope = await api.get<ResultsEnvelope<Container>>(
    `/api/container/containers/${containerId}/children/`,
  );
  return envelope.results;
}

async function listDescendants(containerId: string): Promise<Container[]> {
  const envelope = await api.get<ResultsEnvelope<Container>>(
    `/api/container/containers/${containerId}/descendants/`,
  );
  return envelope.results;
}

async function listAncestors(containerId: string): Promise<Container[]> {
  const envelope = await api.get<ResultsEnvelope<Container>>(
    `/api/container/containers/${containerId}/ancestors/`,
  );
  return envelope.results;
}

/** General browse/search — `publicJoinOnly: true` backs the "Discover"
 * tab (containers whose policy allows self-serve join); omitted, this
 * is a general admin browse across every container regardless of
 * joinability. `excludeVisibility` is the separate fix for the
 * private-container leak: `DiscoverTab()` passes
 * `excludeVisibility: "private"` to hide private containers while
 * still showing "protected" ones — `AllContainers.tsx` (admin) never
 * passes this, by design, and keeps seeing everything. */
async function searchContainers(
  params: SearchContainersParams = {},
): Promise<Container[]> {
  const query = new URLSearchParams();
  if (params.visibility) query.set("visibility", params.visibility);
  if (params.excludeVisibility)
    query.set("exclude_visibility", params.excludeVisibility);
  if (params.status) query.set("status", params.status);
  if (params.publicJoinOnly) query.set("public_join_only", "true");
  if (params.q) query.set("q", params.q);
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));
  const envelope = await api.get<ResultsEnvelope<Container>>(
    `/api/container/containers/search/?${query.toString()}`,
  );
  return envelope.results;
}

/** Reverse of `listActorMemberships` — "who's in this container," not
 * "which containers is this actor in." Backs container member
 * management. */
async function listMembers(
  containerId: string,
  status: string = "active",
): Promise<Membership[]> {
  const envelope = await api.get<ResultsEnvelope<Membership>>(
    `/api/container/containers/${containerId}/members/?status=${status}`,
  );
  return envelope.results;
}

function terminateMembership(membershipId: string): Promise<Membership> {
  return api.post<Membership>(
    `/api/container/memberships/${membershipId}/terminate/`,
  );
}

/** Admin only — see `usePermission`-gated admin pages. No list/get-by-code
 * endpoint exists yet (same "no list query on the frozen repository
 * protocol" gap the backend itself flags), so kinds created via this
 * are tracked client-side for the session rather than fetched back. */
function createKind(input: {
  code: string;
  name: string;
  metadata?: Record<string, unknown>;
}): Promise<ContainerKind> {
  return api.post<ContainerKind>("/api/container/container-kinds/", input);
}

// -- Membership self-service (join / invite / redeem) --------------------

/** Only succeeds if the container's policy has `allow_public_join: true`
 * — this calls the same `join()` the backend's own seeders use, with
 * no invitation attached, so `rules.can_join_container` falls through
 * to its `allow_public_join` check. A container that requires an
 * invitation instead will reject this with a 409 — catch and show that
 * as "this container isn't open to public join," not a generic error. */
function joinContainer(input: {
  container_id: string;
  actor_id: string;
  role: string;
}): Promise<Membership> {
  return api.post<Membership>("/api/container/memberships/join/", input);
}

function createInvitation(input: {
  container_id: string;
  invited_by_actor_id: string;
  invitee_actor_id: string;
  role: string;
  type?: "email" | "actor" | "link";
  expires_at?: string;
  assigned_role_codes?: string[];
  metadata?: Record<string, unknown>;
}): Promise<Invitation> {
  return api.post<Invitation>("/api/container/invitations/", input);
}

function redeemInvitation(input: {
  code: string;
  actor_id: string;
}): Promise<Membership> {
  return api.post<Membership>("/api/container/invitations/redeem/", input);
}

// -- Join requests (visibility="protected") -------------------------------

/** For a "protected" container — `joinContainer()` will always 409 on
 * one of these post-collapse (protected derives `allow_public_join:
 * false`), so this is the real path: request, then the owner decides.
 * Actor is resolved server-side from the bearer token, not sent here. */
function requestToJoin(containerId: string): Promise<JoinRequest> {
  return api.post<JoinRequest>(
    `/api/container/containers/${containerId}/join-requests/`,
  );
}

/** Owner-only — the backend checks this via a direct role-assignment
 * lookup, not the usual Gate/permission path (Container is never a
 * licensed feature), so a non-owner gets a 403 here, not a filtered
 * empty list. */
async function listJoinRequests(
  containerId: string,
  status: string = "pending",
): Promise<JoinRequest[]> {
  const envelope = await api.get<ResultsEnvelope<JoinRequest>>(
    `/api/container/containers/${containerId}/join-requests/list/?status=${status}`,
  );
  return envelope.results;
}

function approveJoinRequest(requestId: string): Promise<JoinRequest> {
  return api.post<JoinRequest>(
    `/api/container/join-requests/${requestId}/approve/`,
  );
}

function rejectJoinRequest(requestId: string): Promise<JoinRequest> {
  return api.post<JoinRequest>(
    `/api/container/join-requests/${requestId}/reject/`,
  );
}

// -- Policy + lifecycle (owner-only writes, member-only read) -------------

export interface ContainerPolicy {
  id: string;
  container_id: string;
  default_visibility: "public" | "protected" | "private";
  allow_transfers: boolean;
  allow_invitations: boolean;
  allow_public_join: boolean;
  default_member_role_code: string | null;
  maximum_depth: number | null;
  maximum_children: number | null;
  allowed_child_kinds: string[];
  metadata: Record<string, unknown>;
}

/** Returns `null` if this container has no direct policy of its own
 * yet (it inherits from an ancestor) — a 404 from the backend, not an
 * error; the caller decides what defaults to show for a first-time
 * "apply" in that case. Requires at least membership; throws
 * (ApiError, status 403) for a non-member. */
async function getContainerPolicy(
  containerId: string,
): Promise<ContainerPolicy | null> {
  try {
    return await api.get<ContainerPolicy>(
      `/api/container/containers/${containerId}/policy/`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Owner-only — a non-owner gets a 403. `allow_public_join` is
 * deliberately NOT a parameter here: it's derived server-side from
 * `default_visibility` (public -> true, protected/private -> false),
 * never independently settable. */
function applyContainerPolicy(
  containerId: string,
  input: {
    default_visibility?: "public" | "protected" | "private";
    allow_transfers?: boolean;
    allow_invitations?: boolean;
    default_member_role_code?: string;
    maximum_depth?: number;
    maximum_children?: number;
    allowed_child_kinds?: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<ContainerPolicy> {
  return api.post<ContainerPolicy>(
    `/api/container/containers/${containerId}/policy/apply/`,
    input,
  );
}

function activateContainer(containerId: string): Promise<Container> {
  return api.post<Container>(
    `/api/container/containers/${containerId}/activate/`,
  );
}

function suspendContainer(containerId: string): Promise<Container> {
  return api.post<Container>(
    `/api/container/containers/${containerId}/suspend/`,
  );
}

function archiveContainer(containerId: string): Promise<Container> {
  return api.post<Container>(
    `/api/container/containers/${containerId}/archive/`,
  );
}

function restoreContainer(containerId: string): Promise<Container> {
  return api.post<Container>(
    `/api/container/containers/${containerId}/restore/`,
  );
}

function getContainerAvatarUrl(
  containerId: string,
): Promise<{ avatar_url: string | null }> {
  return api.get<{ avatar_url: string | null }>(
    `/api/container/containers/${containerId}/avatar-url/`,
  );
}

function renameContainer(
  containerId: string,
  input: { name?: string; display_name?: string },
): Promise<Container> {
  return api.post<Container>(
    `/api/container/containers/${containerId}/rename/`,
    input,
  );
}


export const container = {
  getContainer,
  getContainerBySlug,
  listActorMemberships,
  listChildren,
  listDescendants,
  listAncestors,
  searchContainers,
  listMembers,
  terminateMembership,
  createKind,
  joinContainer,
  createInvitation,
  redeemInvitation,
  requestToJoin,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getContainerPolicy,
  applyContainerPolicy,
  renameContainer,
  activateContainer,
  suspendContainer,
  archiveContainer,
  restoreContainer,
  getContainerAvatarUrl,
};

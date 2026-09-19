import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.communication`'s REST API
 * (`/api/communication/...`).
 *
 * Every endpoint here is enforced server-side via BOTH a container-level
 * Authority `require_permission` check AND a per-record participant/role
 * check in the application layer — a 403 from either is reported
 * identically. The acting actor is always resolved from the bearer
 * token, NOT from a request body field, so none of these functions take
 * an `actorId` for the CALLER's own identity. `addParticipant` /
 * `removeParticipant` / `setParticipantRole` still take an `actorId`
 * because that identifies who's being acted upon, not who's acting.
 *
 * Response shapes: list endpoints return `{"data": [...]}` (auto-
 * unwrapped by `api.get()`); single-item endpoints return the
 * projection flattened directly, no wrapper.
 *
 * Known interface-layer gaps (see API reference):
 * - No realtime transport — polling only.
 * - `message.view` gates both sending and reading messages; there's no
 *   distinct "send" permission wired up yet despite existing in the
 *   manifest.
 * - Search (`listMessages` with `q`) is `icontains`, not indexed.
 */

export type ConversationType = "direct" | "group";
export type ParticipantRole = "member" | "moderator" | "admin";
export type ConversationStatus = "active" | "archived";
export type ParticipantStatus = "active" | "removed";

export interface Conversation {
  id: string;
  type: ConversationType;
  container_id: string;
  created_by_actor_id: string;
  /** Required for group, null for direct. */
  title: string | null;
  /** Group-only. */
  description: string | null;
  /** Group-only. */
  avatar_url: string | null;
  status: ConversationStatus;
  /** Group-only "broadcast" flag. */
  only_admins_can_post: boolean;
  metadata: Record<string, unknown>;
  /** Response-only — computed per request, never stored. */
  unread_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Participant {
  id: string;
  conversation_id: string;
  actor_id: string;
  /** Meaningful only in group conversations. */
  role: ParticipantRole;
  status: ParticipantStatus;
  joined_at: string | null;
  /** Backs unread counts / read receipts. */
  last_read_at: string | null;
  /** Self-service, client hint only. */
  muted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_actor_id: string;
  /** Redacted to "" once deleted_at is set. */
  body: string;
  sent_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown>;
  /** Always a root message's id — one level of threading. */
  parent_message_id: string | null;
  pinned_at: string | null;
  pinned_by_actor_id: string | null;
  /** Filtered to active participants at send time. */
  mentioned_actor_ids: string[];
  /** Opaque external references — existence/access is unverified. */
  attachment_asset_ids: string[];
}

export interface Reaction {
  id: string;
  message_id: string;
  actor_id: string;
  emoji: string;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

/** Every conversation the caller actively participates in within the
 * container, each with `unread_count` populated. */
async function listConversations(containerId: string): Promise<Conversation[]> {
  return api.get<Conversation[]>(
    `/api/communication/conversations/?container_id=${containerId}`,
  );
}

function getConversation(id: string): Promise<Conversation> {
  return api.get<Conversation>(`/api/communication/conversations/${id}/`);
}

/** Idempotent — starting a "direct" with someone you already have one
 * with returns the existing conversation, never a duplicate.
 * `other_actor_id` equal to the caller is valid (self-DM). */
function createDirectConversation(input: {
  container_id: string;
  other_actor_id: string;
}): Promise<Conversation> {
  return api.post<Conversation>(
    "/api/communication/conversations/direct/",
    input,
  );
}

/** Caller becomes the sole initial admin; any ids in
 * `participant_actor_ids` are added as "member". */
function createGroupConversation(input: {
  container_id: string;
  title: string;
  participant_actor_ids?: string[];
  only_admins_can_post?: boolean;
}): Promise<Conversation> {
  return api.post<Conversation>(
    "/api/communication/conversations/group/",
    input,
  );
}

/** Group-only — 409 if the conversation is "direct". Requires admin.
 * Omitted/null fields are left unchanged. */
function updateConversation(
  id: string,
  input: {
    title?: string;
    description?: string;
    avatar_url?: string;
    only_admins_can_post?: boolean;
  },
): Promise<Conversation> {
  return api.patch<Conversation>(
    `/api/communication/conversations/${id}/`,
    input,
  );
}

/** Group requires admin; direct allows any participant. */
function archiveConversation(id: string): Promise<Conversation> {
  return api.post<Conversation>(
    `/api/communication/conversations/${id}/archive/`,
  );
}

/** Sets the caller's own `last_read_at` to now. */
function markConversationRead(id: string): Promise<Participant> {
  return api.post<Participant>(`/api/communication/conversations/${id}/read/`);
}

/** Self-service only — always affects the caller's own Participant row. */
function muteConversation(id: string): Promise<Participant> {
  return api.post<Participant>(`/api/communication/conversations/${id}/mute/`);
}

function unmuteConversation(id: string): Promise<Participant> {
  return api.post<Participant>(
    `/api/communication/conversations/${id}/unmute/`,
  );
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------

async function listParticipants(
  conversationId: string,
): Promise<Participant[]> {
  return api.get<Participant[]>(
    `/api/communication/conversations/${conversationId}/participants/`,
  );
}

/** `actorId` is who's being ADDED — requires the caller to be a group
 * admin. 409 if the conversation isn't a group, or the actor is
 * already an active participant. */
function addParticipant(
  conversationId: string,
  input: { actor_id: string; role?: ParticipantRole },
): Promise<Participant> {
  return api.post<Participant>(
    `/api/communication/conversations/${conversationId}/participants/`,
    input,
  );
}

/** `actorId` here is who's being REMOVED. 409 if they're the last
 * remaining admin. */
function removeParticipant(
  conversationId: string,
  actorId: string,
): Promise<Participant> {
  return api.delete<Participant>(
    `/api/communication/conversations/${conversationId}/participants/${actorId}/`,
  );
}

/** `actorId` is whose role is changing. 409 if it would demote the
 * last remaining admin. */
function setParticipantRole(
  conversationId: string,
  actorId: string,
  role: ParticipantRole,
): Promise<Participant> {
  return api.patch<Participant>(
    `/api/communication/conversations/${conversationId}/participants/${actorId}/`,
    { role },
  );
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Deleted messages are excluded from the results either way. Passing
 * `q` switches the endpoint to an `icontains` substring search on
 * `body` within this conversation (not a full-text index) instead of
 * the plain paginated list. */
function listMessages(
  conversationId: string,
  options?: { limit?: number; offset?: number; q?: string },
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.q) params.set("q", options.q);

  const qs = params.toString();
  return api.get<Message[]>(
    `/api/communication/conversations/${conversationId}/messages/${qs ? `?${qs}` : ""
    }`,
  );
}

/** 403 (BroadcastOnlyConversationError) if the conversation has
 * `only_admins_can_post: true` and the caller isn't an admin. Replying
 * to an existing reply re-parents to that reply's root, so
 * `parent_message_id` always ends up pointing at a root message. */
function sendMessage(
  conversationId: string,
  input: {
    body: string;
    parent_message_id?: string;
    mentioned_actor_ids?: string[];
    attachment_asset_ids?: string[];
  },
): Promise<Message> {
  return api.post<Message>(
    `/api/communication/conversations/${conversationId}/messages/`,
    input,
  );
}

/** Sender-only. */
function editMessage(messageId: string, body: string): Promise<Message> {
  return api.patch<Message>(`/api/communication/messages/${messageId}/`, {
    body,
  });
}

/** Sender, group admin, or group moderator. Soft-delete — the
 * returned Message comes back with `body: ""` and `deleted_at` set. */
function deleteMessage(messageId: string): Promise<Message> {
  return api.delete<Message>(`/api/communication/messages/${messageId}/`);
}

/** Flat, one level — a thread's replies, not nested further. */
function listReplies(messageId: string): Promise<Message[]> {
  return api.get<Message[]>(
    `/api/communication/messages/${messageId}/replies/`,
  );
}

/** Group requires admin or moderator; direct allows any participant. */
function pinMessage(messageId: string): Promise<Message> {
  return api.post<Message>(`/api/communication/messages/${messageId}/pin/`);
}

function unpinMessage(messageId: string): Promise<Message> {
  return api.post<Message>(`/api/communication/messages/${messageId}/unpin/`);
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

function listReactions(messageId: string): Promise<Reaction[]> {
  return api.get<Reaction[]>(
    `/api/communication/messages/${messageId}/reactions/`,
  );
}

/** 409 (DuplicateReactionError) on a repeated (actor, emoji) pair;
 * 409 (MessageAlreadyDeletedError) if the message has been deleted. */
function addReaction(messageId: string, emoji: string): Promise<Reaction> {
  return api.post<Reaction>(
    `/api/communication/messages/${messageId}/reactions/`,
    { emoji },
  );
}

/** Always removes the caller's own reaction — there's no endpoint to
 * remove another actor's. `emoji` is URL-encoded since it's a path
 * segment and reaction emoji can include multi-byte characters. */
function removeReaction(messageId: string, emoji: string): Promise<Reaction> {
  return api.delete<Reaction>(
    `/api/communication/messages/${messageId}/reactions/${encodeURIComponent(
      emoji,
    )}/`,
  );
}

export const communication = {
  listConversations,
  getConversation,
  createDirectConversation,
  createGroupConversation,
  updateConversation,
  archiveConversation,
  markConversationRead,
  muteConversation,
  unmuteConversation,
  listParticipants,
  addParticipant,
  removeParticipant,
  setParticipantRole,
  listMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  listReplies,
  pinMessage,
  unpinMessage,
  listReactions,
  addReaction,
  removeReaction,
};
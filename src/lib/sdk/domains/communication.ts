import { api } from "../../query/Api";

/**
 * Typed client for `capabilities.core.communication`'s REST API
 * (`/api/communication/...`).
 *
 * Every endpoint here is enforced server-side via `require_permission`
 * — the acting actor is resolved from the bearer token, NOT from a
 * request body field. Because of that, none of these functions take
 * an `actorId`/`senderActorId` parameter for the CALLER's own id —
 * sending one would be ignored. `addParticipant` still takes an
 * `actorId` because that identifies who's being ADDED, not who's
 * acting.
 *
 * Response shapes: list endpoints return `{"data": [...]}`
 * (auto-unwrapped by `api.get()`); single-item endpoints return the
 * projection flattened directly, no wrapper.
 */

export type ConversationType = "direct" | "group";
export type ParticipantRole = "member" | "admin";

export interface Conversation {
  id: string;
  type: ConversationType;
  container_id: string;
  created_by_actor_id: string;
  title: string | null;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface Participant {
  id: string;
  conversation_id: string;
  actor_id: string;
  role: ParticipantRole;
  status: "active" | "removed";
  joined_at: string | null;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_actor_id: string;
  body: string;
  sent_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, unknown>;
}

async function listConversations(containerId: string): Promise<Conversation[]> {
  return api.get<Conversation[]>(
    `/api/communication/conversations/?container_id=${containerId}`,
  );
}

function getConversation(id: string): Promise<Conversation> {
  return api.get<Conversation>(`/api/communication/conversations/${id}/`);
}

/** Idempotent — starting a "direct" with someone you already have one
 * with returns the existing conversation, never a duplicate. */
function createDirectConversation(input: {
  container_id: string;
  other_actor_id: string;
}): Promise<Conversation> {
  return api.post<Conversation>(
    "/api/communication/conversations/direct/",
    input,
  );
}

function createGroupConversation(input: {
  container_id: string;
  title: string;
  participant_actor_ids?: string[];
}): Promise<Conversation> {
  return api.post<Conversation>(
    "/api/communication/conversations/group/",
    input,
  );
}

function archiveConversation(id: string): Promise<Conversation> {
  return api.post<Conversation>(
    `/api/communication/conversations/${id}/archive/`,
  );
}

function markConversationRead(id: string): Promise<Participant> {
  return api.post<Participant>(`/api/communication/conversations/${id}/read/`);
}

async function listParticipants(
  conversationId: string,
): Promise<Participant[]> {
  return api.get<Participant[]>(
    `/api/communication/conversations/${conversationId}/participants/`,
  );
}

/** `actorId` is who's being ADDED — the caller (who must be a group
 * admin) is resolved server-side from the bearer token. */
function addParticipant(
  conversationId: string,
  input: { actor_id: string; role?: ParticipantRole },
): Promise<Participant> {
  return api.post<Participant>(
    `/api/communication/conversations/${conversationId}/participants/`,
    input,
  );
}

/** `actorId` here is who's being REMOVED. */
function removeParticipant(
  conversationId: string,
  actorId: string,
): Promise<Participant> {
  return api.delete<Participant>(
    `/api/communication/conversations/${conversationId}/participants/${actorId}/`,
  );
}

async function listMessages(
  conversationId: string,
  limit = 100,
  offset = 0,
): Promise<Message[]> {
  return api.get<Message[]>(
    `/api/communication/conversations/${conversationId}/messages/?limit=${limit}&offset=${offset}`,
  );
}

function sendMessage(conversationId: string, body: string): Promise<Message> {
  return api.post<Message>(
    `/api/communication/conversations/${conversationId}/messages/`,
    {
      body,
    },
  );
}

function editMessage(messageId: string, body: string): Promise<Message> {
  return api.patch<Message>(`/api/communication/messages/${messageId}/`, {
    body,
  });
}

function deleteMessage(messageId: string): Promise<Message> {
  return api.delete<Message>(`/api/communication/messages/${messageId}/`);
}

export const communication = {
  listConversations,
  getConversation,
  createDirectConversation,
  createGroupConversation,
  archiveConversation,
  markConversationRead,
  listParticipants,
  addParticipant,
  removeParticipant,
  listMessages,
  sendMessage,
  editMessage,
  deleteMessage,
};

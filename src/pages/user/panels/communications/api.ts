
const API_BASE = import.meta.env.VITE_MAICORE_API_URL ?? "http://127.0.0.1:8000";
const COMM_PREFIX = "/api/communications";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem("maicore_token");
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function isPaginator(v: any): boolean {
  return (
    v &&
    typeof v === "object" &&
    Array.isArray(v.data) &&
    ("current_page" in v || "per_page" in v || "total" in v)
  );
}

/** Pulls a list out of either shape commApi can hand back. */
export function unwrapList<T = any>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

export async function commApi(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(`${API_BASE}${COMM_PREFIX}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    throw new ApiError(json?.message ?? `HTTP ${res.status}`, res.status);
  }

  if (json && typeof json === "object" && !Array.isArray(json)) {
    if (isPaginator(json)) return json;
    if ("data" in json) return json.data;
  }

  return json;
}

export async function uploadAttachment(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}${COMM_PREFIX}/attachments/upload`, {
    method: "POST",
    headers: authHeaders(false),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new ApiError(json?.message ?? `HTTP ${res.status}`, res.status);
  return json.attachment as MessageAttachment;
}

/* ── Types ─────────────────────────────────────────────────────────── */

export type MessageAttachment = {
  id: string;
  url: string;
  file_url: string;
  type: "image" | "video" | "audio" | "document";
  name: string;
  size: number;
};

export type Reaction = { actor_id: string; emoji: string };

export type Message = {
  id: string;
  conversation_id?: string;
  group_id?: string;
  sender_actor_id: string;
  sender_name: string;
  content: string | null;
  content_type: string;
  reply_to_id: string | null;
  reply_to_sender_name: string | null;
  reply_to_content: string | null;
  forwarded_from_id: string | null;
  forwarded: boolean;
  deleted_for_everyone: boolean;
  is_pinned: boolean;
  is_starred: boolean;
  is_edited: boolean;
  edited_at: string | null;
  status?: "sent" | "delivered" | "read";
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
  attachments: MessageAttachment[];
  reactions: Reaction[];
  is_system_message?: boolean;
  system_event?: string | null;
};

export type Conversation = {
  id: string;
  type: "direct";
  status: "active" | "closed";
  container_id: string;
  root_id: string;
  initiator_actor_id: string;
  initiator_name: string;
  recipient_actor_id: string;
  recipient_name: string;
  participants: string[];
  other_actor_id: string;
  last_message_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type GroupParticipant = {
  id: string;
  actor_id: string;
  name: string;
  role: "member" | "admin" | "super_admin";
  online_status: string;
  last_seen_at: string | null;
};

export type Group = {
  id: string;
  type: "group";
  name: string;
  title: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  owner_actor_id: string;
  container_id: string;
  status: string;
  participants: GroupParticipant[];
  participant_ids: string[];
  last_message_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

export type Broadcast = {
  id: string;
  container_id: string;
  root_id: string;
  owner_actor_id: string;
  owner_status: string;
  title: string;
  recipient_mode: "container" | "tree" | "group";
  group_id: string | null;
  body: string;
  channels: string[];
  send_status: "draft" | "queued" | "sending" | "sent" | "failed";
  recipient_count: number;
  delivered_count: number;
  failed_count: number;
  queued_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BroadcastRecipient = {
  id: string;
  broadcast_id: string;
  actor_id: string;
  root_id: string | null;
  status: "pending" | "delivering" | "delivered" | "failed";
  attempts: number;
  channel_results: Record<string, any> | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BroadcastGroup = {
  id: string;
  container_id: string;
  root_id: string;
  name: string;
  description: string | null;
  created_by_actor_id: string;
  member_count: number;
  members?: string[];
  created_at: string;
  updated_at: string;
};

export type Community = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  owner_actor_id: string;
  container_id: string;
  root_id: string;
  status: string;
  is_public: boolean;
  settings: Record<string, unknown> | null;
  members?: { actor_id: string; role: string; status: string }[];
  members_count?: number;
  groups?: { id: string; group_id: string; is_announcement_channel: boolean; group?: Group }[];
  created_at: string;
  updated_at: string;
};
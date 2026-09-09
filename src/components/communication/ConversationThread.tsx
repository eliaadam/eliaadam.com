import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "../context/Authcontext";
import { sdk, type Actor } from "../../lib/sdk";
import type { Message } from "../../lib/sdk/domains/communication";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900";

export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showParticipants, setShowParticipants] = useState(false);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const { data: conversation } = useQuery({
    queryKey: ["communication", "conversation", conversationId],
    queryFn: () => sdk.communication.getConversation(conversationId),
  });

  const { data: participants } = useQuery({
    queryKey: ["communication", "participants", conversationId],
    queryFn: () => sdk.communication.listParticipants(conversationId),
  });

  const { data: actors } = useQuery({
    queryKey: ["actors", "all"],
    queryFn: () => sdk.identity.listActors({ limit: 200 }),
  });

  const { data: messages } = useQuery({
    queryKey: ["communication", "messages", conversationId],
    queryFn: () => sdk.communication.listMessages(conversationId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    sdk.communication
      .markConversationRead(conversationId)
      .catch(() => undefined);
  }, [conversationId]);

  const invalidateMessages = () =>
    queryClient.invalidateQueries({
      queryKey: ["communication", "messages", conversationId],
    });

  const sendMutation = useMutation({
    mutationFn: () => sdk.communication.sendMessage(conversationId, body),
    onSuccess: () => {
      setBody("");
      invalidateMessages();
    },
  });

  const editMutation = useMutation({
    mutationFn: (messageId: string) =>
      sdk.communication.editMessage(messageId, editBody),
    onSuccess: () => {
      setEditingId(null);
      invalidateMessages();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) =>
      sdk.communication.deleteMessage(messageId),
    onSuccess: invalidateMessages,
  });

  const actorName = (actorId: string): string => {
    if (actorId === user?.id) return "You";
    const actor = actors?.find((a: Actor) => a.id === actorId);
    return actor?.display_name ?? actorId;
  };

  const myParticipant = participants?.find((p) => p.actor_id === user?.id);
  const isGroupAdmin =
    conversation?.type === "group" && myParticipant?.role === "admin";

  let title = conversation?.title ?? "Conversation";
  if (conversation?.type === "direct" && participants && actors) {
    const other = participants.find((p) => p.actor_id !== user?.id);
    title = other ? actorName(other.actor_id) : title;
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {conversation?.type === "group" && (
          <button
            type="button"
            onClick={() => setShowParticipants((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
          >
            <Users size={13} />
            {participants?.length ?? 0}
          </button>
        )}
      </div>

      {showParticipants && conversation?.type === "group" && (
        <ParticipantPanel
          conversationId={conversationId}
          isAdmin={Boolean(isGroupAdmin)}
          actorName={actorName}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <ul className="flex flex-col gap-3">
          {messages?.map((m) => (
            <li
              key={m.id}
              className={m.sender_actor_id === user?.id ? "self-end" : ""}
            >
              <MessageBubble
                message={m}
                senderName={actorName(m.sender_actor_id)}
                canEdit={m.sender_actor_id === user?.id}
                canDelete={
                  m.sender_actor_id === user?.id || isGroupAdmin === true
                }
                isEditing={editingId === m.id}
                editBody={editBody}
                onStartEdit={() => {
                  setEditingId(m.id);
                  setEditBody(m.body);
                }}
                onEditBodyChange={setEditBody}
                onSaveEdit={() => editMutation.mutate(m.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteMutation.mutate(m.id)}
              />
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) sendMutation.mutate();
        }}
        className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800"
      >
        <input
          className={inputClass}
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={!body.trim() || sendMutation.isPending}
          className="flex-none rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  senderName,
  canEdit,
  canDelete,
  isEditing,
  editBody,
  onStartEdit,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  message: Message;
  senderName: string;
  canEdit: boolean;
  canDelete: boolean;
  isEditing: boolean;
  editBody: string;
  onStartEdit: () => void;
  onEditBodyChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const isDeleted = message.deleted_at !== null;

  return (
    <div className="group max-w-md rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          {senderName}
          {message.edited_at && !isDeleted && (
            <span className="ml-1 italic text-neutral-400 dark:text-neutral-600">
              (edited)
            </span>
          )}
        </p>
        {!isDeleted && (canEdit || canDelete) && (
          <div className="hidden items-center gap-1.5 group-hover:flex">
            {canEdit && (
              <button
                type="button"
                onClick={onStartEdit}
                aria-label="Edit"
                className="text-neutral-400 hover:text-black dark:hover:text-white"
              >
                <Pencil size={12} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete"
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {isDeleted ? (
        <p className="mt-0.5 text-sm italic text-neutral-400 dark:text-neutral-600">
          This message was deleted
        </p>
      ) : isEditing ? (
        <div className="mt-1 flex items-center gap-1.5">
          <input
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            value={editBody}
            onChange={(e) => onEditBodyChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onSaveEdit}
            className="text-xs font-medium text-black hover:underline dark:text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-neutral-500 hover:underline dark:text-neutral-500"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{message.body}</p>
      )}
    </div>
  );
}

function ParticipantPanel({
  conversationId,
  isAdmin,
  actorName,
}: {
  conversationId: string;
  isAdmin: boolean;
  actorName: (actorId: string) => string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: participants } = useQuery({
    queryKey: ["communication", "participants", conversationId],
    queryFn: () => sdk.communication.listParticipants(conversationId),
  });

  const { data: candidates } = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => sdk.identity.listActors({ search, limit: 10 }),
    enabled: isAdmin && search.trim().length > 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["communication", "participants", conversationId],
    });

  const addMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.communication.addParticipant(conversationId, { actor_id: actorId }),
    onSuccess: () => {
      invalidate();
      setSearch("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.communication.removeParticipant(conversationId, actorId),
    onSuccess: invalidate,
  });

  return (
    <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
      <ul className="flex flex-col gap-1.5">
        {participants?.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <span>
              {actorName(p.actor_id)}
              {p.role === "admin" && (
                <span className="ml-1.5 text-xs text-neutral-500 dark:text-neutral-500">
                  admin
                </span>
              )}
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => removeMutation.mutate(p.actor_id)}
                aria-label="Remove"
                className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <UserMinus size={13} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <div className="relative mt-3">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            className={`${inputClass} pl-8 text-xs`}
            placeholder="Add participant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {candidates && candidates.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              {candidates.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => addMutation.mutate(a.id)}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <UserPlus size={12} />
                    {a.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

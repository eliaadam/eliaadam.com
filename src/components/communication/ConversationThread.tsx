import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Archive,
  AtSign,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  SmilePlus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../context/Authcontext";
import { sdk, type Actor } from "../../lib/sdk";
import type {
  Message,
  Participant,
  ParticipantRole,
} from "../../lib/sdk/domains/communication";
import { useActorName } from "./useActorName";
import { useActorSearch } from "./useActorSearch";
import { Avatar, formatRelativeTime } from "./Avatar";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-600";

const REACTION_CHOICES = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
const PAGE_SIZE = 30;

export function ConversationThread({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showParticipants, setShowParticipants] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  // Reset paging/search state when switching conversations, or the
  // list would silently keep showing an unrelated offset/query.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSearchQuery("");
    setShowSearch(false);
    setReplyTarget(null);
    setEditingId(null);
  }, [conversationId]);

  const { data: conversation } = useQuery({
    queryKey: ["communication", "conversation", conversationId],
    queryFn: () => sdk.communication.getConversation(conversationId),
  });

  const { data: participants } = useQuery({
    queryKey: ["communication", "participants", conversationId],
    queryFn: () => sdk.communication.listParticipants(conversationId),
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["communication", "messages", conversationId, visibleCount],
    queryFn: () =>
      sdk.communication.listMessages(conversationId, { limit: visibleCount }),
    refetchInterval: 5000,
  });

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: [
      "communication",
      "messages",
      conversationId,
      "search",
      searchQuery,
    ],
    queryFn: () =>
      sdk.communication.listMessages(conversationId, {
        q: searchQuery,
        limit: 50,
      }),
    enabled: showSearch && searchQuery.trim().length > 0,
  });

  useEffect(() => {
    sdk.communication
      .markConversationRead(conversationId)
      .catch(() => undefined);
  }, [conversationId]);

  const invalidateMessages = () =>
    queryClient.invalidateQueries({
      queryKey: ["communication", "messages", conversationId],
      exact: false,
    });

  const invalidateConversation = () => {
    queryClient.invalidateQueries({
      queryKey: ["communication", "conversation", conversationId],
    });
    queryClient.invalidateQueries({
      queryKey: ["communication", "conversations"],
    });
  };

  const invalidateParticipants = () =>
    queryClient.invalidateQueries({
      queryKey: ["communication", "participants", conversationId],
    });

  const sendMutation = useMutation({
    mutationFn: (input: {
      body: string;
      parent_message_id?: string;
      mentioned_actor_ids?: string[];
      attachment_asset_ids?: string[];
    }) => sdk.communication.sendMessage(conversationId, input),
    onSuccess: () => {
      setReplyTarget(null);
      invalidateMessages();
    },
  });

  const editMutation = useMutation({
    mutationFn: (vars: { messageId: string; body: string }) =>
      sdk.communication.editMessage(vars.messageId, vars.body),
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

  const pinMutation = useMutation({
    mutationFn: (vars: { messageId: string; pinned: boolean }) =>
      vars.pinned
        ? sdk.communication.unpinMessage(vars.messageId)
        : sdk.communication.pinMessage(vars.messageId),
    onSuccess: invalidateMessages,
  });

  const muteMutation = useMutation({
    mutationFn: () =>
      myParticipant?.muted
        ? sdk.communication.unmuteConversation(conversationId)
        : sdk.communication.muteConversation(conversationId),
    onSuccess: invalidateParticipants,
  });

  const archiveMutation = useMutation({
    mutationFn: () => sdk.communication.archiveConversation(conversationId),
    onSuccess: invalidateConversation,
  });

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) =>
      sdk.communication.updateConversation(conversationId, { title }),
    onSuccess: () => {
      setEditingTitle(false);
      invalidateConversation();
    },
  });

  const myParticipant = participants?.find((p) => p.actor_id === user?.id);
  const isGroupAdmin =
    conversation?.type === "group" && myParticipant?.role === "admin";
  const isModerator =
    conversation?.type === "group" && myParticipant?.role === "moderator";
  const canManageMetadata = conversation?.type === "group" && isGroupAdmin;
  const canArchive = conversation?.type === "direct" || isGroupAdmin;
  const isArchived = conversation?.status === "archived";
  const isBroadcastGroup =
    conversation?.type === "group" && conversation.only_admins_can_post;
  const canPost = !isBroadcastGroup || isGroupAdmin;

  const other = participants?.find((p) => p.actor_id !== user?.id);
  const isSelfDirect =
    conversation?.type === "direct" && participants && !other;
  const otherName = useActorName(
    conversation?.type === "direct"
      ? (other?.actor_id ?? (isSelfDirect ? user?.id : undefined))
      : undefined,
  );

  let title = conversation?.title ?? "Group";
  if (conversation?.type === "direct") {
    title = isSelfDirect
      ? `${otherName ?? "You"} (you)`
      : (otherName ?? "Direct message");
  }

  const avatarSeed = conversation
    ? conversation.type === "group"
      ? conversation.id
      : (other?.actor_id ?? user?.id ?? conversation.id)
    : conversationId;

  const rootMessages = useMemo(
    () => (messages ?? []).filter((m) => !m.parent_message_id),
    [messages],
  );
  const pinned = useMemo(
    () => (messages ?? []).filter((m) => m.pinned_at),
    [messages],
  );
  const hasMore = (messages?.length ?? 0) >= visibleCount;

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="flex-none rounded-md p-1 text-neutral-500 hover:bg-neutral-100 md:hidden dark:hover:bg-neutral-900"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <Avatar name={title} seed={avatarSeed} size={30} />

        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (titleDraft.trim())
                  updateTitleMutation.mutate(titleDraft.trim());
              }}
              className="flex items-center gap-1.5"
            >
              <input
                autoFocus
                className={`${inputClass} py-1 text-sm`}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
              <button
                type="submit"
                aria-label="Save"
                className="text-neutral-500 hover:text-black dark:hover:text-white"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={() => setEditingTitle(false)}
                aria-label="Cancel"
                className="text-neutral-500 hover:text-black dark:hover:text-white"
              >
                <X size={15} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled={!canManageMetadata}
              onClick={() => {
                setTitleDraft(conversation?.title ?? "");
                setEditingTitle(true);
              }}
              className="group flex min-w-0 items-center gap-1.5 text-left"
            >
              <h2 className="truncate text-sm font-semibold">{title}</h2>
              {canManageMetadata && (
                <Pencil
                  size={11}
                  className="flex-none text-neutral-400 opacity-0 group-hover:opacity-100"
                />
              )}
            </button>
          )}
          {conversation?.only_admins_can_post && (
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-500">
              <Megaphone size={10} /> Broadcast — only admins can post
            </span>
          )}
        </div>

        <div className="flex flex-none items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            aria-label="Search messages"
            className={`rounded-md p-1.5 ${showSearch ? "bg-neutral-100 dark:bg-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-900"}`}
          >
            <Search size={15} />
          </button>
          <button
            type="button"
            onClick={() => muteMutation.mutate()}
            aria-label={myParticipant?.muted ? "Unmute" : "Mute"}
            className="rounded-md p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            {myParticipant?.muted ? <BellOff size={15} /> : <Bell size={15} />}
          </button>
          {conversation?.type === "group" && (
            <button
              type="button"
              onClick={() => setShowParticipants((v) => !v)}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              <Users size={14} />
              {participants?.length ?? 0}
            </button>
          )}
          {canArchive && !isArchived && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Archive this conversation?"))
                  archiveMutation.mutate();
              }}
              aria-label="Archive conversation"
              className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <Archive size={15} />
            </button>
          )}
        </div>
      </div>

      {isArchived && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
          This conversation is archived. New messages can't be sent here.
        </div>
      )}

      {showSearch && (
        <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              autoFocus
              className={`${inputClass} pl-8 text-xs`}
              placeholder="Search this conversation…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {showParticipants && conversation?.type === "group" && (
        <ParticipantPanel
          conversationId={conversationId}
          containerId={conversation.container_id}
          isAdmin={Boolean(isGroupAdmin)}
        />
      )}

      {pinned.length > 0 && !showSearch && (
        <PinnedBar
          messages={pinned}
          canUnpin={
            conversation?.type === "direct" || isGroupAdmin || isModerator
          }
          onUnpin={(id) => pinMutation.mutate({ messageId: id, pinned: true })}
        />
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4">
        {showSearch && searchQuery.trim() ? (
          <SearchResults
            results={searchResults}
            loading={searching}
            query={searchQuery}
          />
        ) : (
          <>
            {hasMore && !messagesLoading && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
                >
                  Load earlier messages
                </button>
              </div>
            )}

            {messagesLoading && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 max-w-md animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
                  />
                ))}
              </div>
            )}

            <ul className="flex flex-col gap-3">
              {rootMessages.map((m) => (
                <li
                  key={m.id}
                  className={m.sender_actor_id === user?.id ? "self-end" : ""}
                >
                  <MessageRow
                    message={m}
                    conversationId={conversationId}
                    isMine={m.sender_actor_id === user?.id}
                    canDelete={
                      m.sender_actor_id === user?.id ||
                      isGroupAdmin === true ||
                      isModerator === true
                    }
                    canPin={
                      conversation?.type === "direct" ||
                      isGroupAdmin ||
                      isModerator
                    }
                    isEditing={editingId === m.id}
                    editBody={editBody}
                    onStartEdit={() => {
                      setEditingId(m.id);
                      setEditBody(m.body);
                    }}
                    onEditBodyChange={setEditBody}
                    onSaveEdit={() =>
                      editMutation.mutate({ messageId: m.id, body: editBody })
                    }
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => deleteMutation.mutate(m.id)}
                    onTogglePin={() =>
                      pinMutation.mutate({
                        messageId: m.id,
                        pinned: Boolean(m.pinned_at),
                      })
                    }
                    onReply={() => setReplyTarget(m)}
                  />
                </li>
              ))}
            </ul>

            {!messagesLoading && rootMessages.length === 0 && (
              <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-500">
                No messages yet — say hello.
              </p>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      {!isArchived && !showSearch && (
        <Composer
          conversationId={conversationId}
          participants={participants}
          canPost={Boolean(canPost)}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          onSend={(input) => sendMutation.mutate(input)}
          isSending={sendMutation.isPending}
          error={sendMutation.error?.message}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pinned messages
// ---------------------------------------------------------------------------

function PinnedBar({
  messages,
  canUnpin,
  onUnpin,
}: {
  messages: Message[];
  canUnpin: boolean;
  onUnpin: (messageId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900/50"
      >
        <span className="flex items-center gap-1.5">
          <Pin size={12} />
          {messages.length} pinned message{messages.length === 1 ? "" : "s"}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 px-4 pb-2">
          {messages.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-md bg-neutral-50 px-2.5 py-1.5 text-xs dark:bg-neutral-900/60"
            >
              <span className="truncate text-neutral-600 dark:text-neutral-400">
                {m.body}
              </span>
              {canUnpin && (
                <button
                  type="button"
                  onClick={() => onUnpin(m.id)}
                  aria-label="Unpin"
                  className="flex-none text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <PinOff size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

function SearchResults({
  results,
  loading,
  query,
}: {
  results?: Message[];
  loading: boolean;
  query: string;
}) {
  if (loading) {
    return (
      <p className="p-2 text-sm text-neutral-500 dark:text-neutral-500">
        Searching…
      </p>
    );
  }
  if (!results || results.length === 0) {
    return (
      <p className="p-2 text-sm text-neutral-500 dark:text-neutral-500">
        No messages match "{query}".
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {results.map((m) => (
        <li
          key={m.id}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
        >
          <p className="whitespace-pre-wrap">{m.body}</p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {formatRelativeTime(m.sent_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Message row (+ reactions + reply thread)
// ---------------------------------------------------------------------------

function MessageRow({
  message,
  conversationId,
  isMine,
  canDelete,
  canPin,
  isEditing,
  editBody,
  onStartEdit,
  onEditBodyChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onTogglePin,
  onReply,
}: {
  message: Message;
  conversationId: string;
  isMine: boolean;
  canDelete: boolean;
  canPin: boolean;
  isEditing: boolean;
  editBody: string;
  onStartEdit: () => void;
  onEditBodyChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onReply: () => void;
}) {
  const [showThread, setShowThread] = useState(false);
  const senderName =
    useActorName(message.sender_actor_id) ?? message.sender_actor_id;
  const isDeleted = message.deleted_at !== null;
  const isPinned = Boolean(message.pinned_at);

  return (
    <div className="group max-w-md rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <Avatar name={senderName} seed={message.sender_actor_id} size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              {senderName}
              {message.edited_at && !isDeleted && (
                <span className="ml-1 italic text-neutral-400 dark:text-neutral-600">
                  (edited)
                </span>
              )}
              <span className="ml-1.5 font-normal text-neutral-400 dark:text-neutral-600">
                {formatRelativeTime(message.sent_at)}
              </span>
            </p>

            {!isDeleted && (
              <div className="hidden flex-none items-center gap-1.5 group-hover:flex">
                <button
                  type="button"
                  onClick={onReply}
                  aria-label="Reply"
                  className="text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  <Reply size={12} />
                </button>
                {canPin && (
                  <button
                    type="button"
                    onClick={onTogglePin}
                    aria-label={isPinned ? "Unpin" : "Pin"}
                    className="text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                )}
                {isMine && (
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
                autoFocus
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

          {!isDeleted && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <MessageReactions messageId={message.id} />
              <button
                type="button"
                onClick={() => setShowThread((v) => !v)}
                className="rounded-full px-1.5 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-900"
              >
                {showThread ? "Hide replies" : "Replies"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showThread && (
        <ThreadReplies rootMessage={message} conversationId={conversationId} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

function MessageReactions({ messageId }: { messageId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: reactions } = useQuery({
    queryKey: ["communication", "reactions", messageId],
    queryFn: () => sdk.communication.listReactions(messageId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["communication", "reactions", messageId],
    });

  const addMutation = useMutation({
    mutationFn: (emoji: string) =>
      sdk.communication.addReaction(messageId, emoji),
    onSuccess: () => {
      setPickerOpen(false);
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (emoji: string) =>
      sdk.communication.removeReaction(messageId, emoji),
    onSuccess: invalidate,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions ?? []) {
      const entry = map.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (r.actor_id === user?.id) entry.mine = true;
      map.set(r.emoji, entry);
    }
    return Array.from(map.entries());
  }, [reactions, user?.id]);

  return (
    <div className="relative flex flex-wrap items-center gap-1">
      {grouped.map(([emoji, { count, mine }]) => (
        <button
          key={emoji}
          type="button"
          onClick={() =>
            mine ? removeMutation.mutate(emoji) : addMutation.mutate(emoji)
          }
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
            mine
              ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          }`}
        >
          <span>{emoji}</span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            {count}
          </span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        aria-label="Add reaction"
        className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-900"
      >
        <SmilePlus size={13} />
      </button>

      {pickerOpen && (
        <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-md border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          {REACTION_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addMutation.mutate(emoji)}
              className="rounded p-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Threaded replies (fetched lazily — only when a message's thread is opened)
// ---------------------------------------------------------------------------

function ThreadReplies({
  rootMessage,
  conversationId,
}: {
  rootMessage: Message;
  conversationId: string;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const { data: replies, isLoading } = useQuery({
    queryKey: ["communication", "replies", rootMessage.id],
    queryFn: () => sdk.communication.listReplies(rootMessage.id),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sdk.communication.sendMessage(conversationId, {
        body,
        parent_message_id: rootMessage.id,
      }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({
        queryKey: ["communication", "replies", rootMessage.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["communication", "messages", conversationId],
        exact: false,
      });
    },
  });

  return (
    <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
      {isLoading && (
        <p className="text-xs text-neutral-400">Loading replies…</p>
      )}
      {!isLoading && replies && replies.length === 0 && (
        <p className="text-xs text-neutral-400">No replies yet.</p>
      )}
      <ul className="flex flex-col gap-1.5">
        {replies?.map((r) => (
          <ReplyRow key={r.id} message={r} />
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) sendMutation.mutate();
        }}
        className="mt-1.5 flex items-center gap-1.5"
      >
        <input
          className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Reply in thread…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={!body.trim() || sendMutation.isPending}
          className="flex-none text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
        >
          Reply
        </button>
      </form>
    </div>
  );
}

function ReplyRow({ message }: { message: Message }) {
  const senderName =
    useActorName(message.sender_actor_id) ?? message.sender_actor_id;
  const isDeleted = message.deleted_at !== null;

  return (
    <li className="rounded-md bg-neutral-50 px-2 py-1.5 text-xs dark:bg-neutral-900/60">
      <span className="font-medium text-neutral-600 dark:text-neutral-400">
        {senderName}
      </span>{" "}
      {isDeleted ? (
        <span className="italic text-neutral-400 dark:text-neutral-600">
          deleted
        </span>
      ) : (
        <span className="whitespace-pre-wrap">{message.body}</span>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Composer (main send + reply banner + mentions + attachment ids)
// ---------------------------------------------------------------------------

function Composer({
  participants,
  canPost,
  replyTarget,
  onCancelReply,
  onSend,
  isSending,
  error,
}: {
  conversationId: string;
  participants?: Participant[];
  canPost: boolean;
  replyTarget: Message | null;
  onCancelReply: () => void;
  onSend: (input: {
    body: string;
    parent_message_id?: string;
    mentioned_actor_ids?: string[];
    attachment_asset_ids?: string[];
  }) => void;
  isSending: boolean;
  error?: string;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<Actor[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentsRaw, setAttachmentsRaw] = useState("");

  const mentionCandidates = useMentionCandidates(participants, user?.id);

  const submit = () => {
    if (!body.trim()) return;
    onSend({
      body,
      parent_message_id: replyTarget?.id,
      mentioned_actor_ids: mentioned.length
        ? mentioned.map((a) => a.id)
        : undefined,
      attachment_asset_ids: attachmentsRaw.trim()
        ? attachmentsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    });
    setBody("");
    setMentioned([]);
    setAttachmentsRaw("");
    setShowAttachments(false);
  };

  if (!canPost) {
    return (
      <div className="flex items-center gap-2 border-t border-neutral-200 p-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-500">
        <Megaphone size={13} />
        Only group admins can post in this conversation.
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      {replyTarget && (
        <div className="flex items-center justify-between gap-2 bg-neutral-50 px-3 py-1.5 text-xs dark:bg-neutral-900/60">
          <span className="truncate text-neutral-500 dark:text-neutral-400">
            Replying to <span className="font-medium">{replyTarget.body}</span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex-none text-neutral-400 hover:text-black dark:hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {mentioned.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {mentioned.map((a) => (
            <span
              key={a.id}
              className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            >
              @{a.display_name}
              <button
                type="button"
                onClick={() =>
                  setMentioned((prev) => prev.filter((m) => m.id !== a.id))
                }
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {showAttachments && (
        <div className="px-3 pt-2">
          <input
            className={`${inputClass} text-xs`}
            placeholder="Attachment asset ids, comma separated"
            value={attachmentsRaw}
            onChange={(e) => setAttachmentsRaw(e.target.value)}
          />
        </div>
      )}

      {error && (
        <p className="px-3 pt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex items-center gap-2 p-3"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setMentionOpen((v) => !v)}
            aria-label="Mention someone"
            className="flex-none rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <AtSign size={15} />
          </button>
          {mentionOpen && mentionCandidates.length > 0 && (
            <ul className="absolute bottom-full left-0 z-10 mb-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              {mentionCandidates
                .filter((a) => !mentioned.some((m) => m.id === a.id))
                .map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setMentioned((prev) => [...prev, a]);
                        setMentionOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <Avatar name={a.display_name} seed={a.id} size={18} />
                      {a.display_name}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAttachments((v) => !v)}
          aria-label="Attach reference"
          className={`flex-none rounded-md p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 ${
            showAttachments
              ? "text-blue-600 dark:text-blue-400"
              : "text-neutral-500"
          }`}
        >
          <Paperclip size={15} />
        </button>

        <input
          className={inputClass}
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          disabled={!body.trim() || isSending}
          className="flex-none rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          Send
        </button>
      </form>
    </div>
  );
}

/** Actor objects for mention candidates come from the participant
 * list, resolved by id — there's no bulk actor-lookup endpoint, so
 * this fans out one cached lookup per participant. Built with
 * `useQueries` rather than calling `useQuery` inside a `.map()`,
 * since the number of hooks a component calls can't change between
 * renders (it would as participants are added/removed). */
function useMentionCandidates(
  participants: Participant[] | undefined,
  selfId: string | undefined,
): Actor[] {
  const others = (participants ?? []).filter((p) => p.actor_id !== selfId);

  const results = useQueries({
    queries: others.map((p) => ({
      queryKey: ["actor", p.actor_id],
      queryFn: () => sdk.identity.getActor(p.actor_id),
    })),
  });

  return results.map((r) => r.data).filter((a): a is Actor => Boolean(a));
}

// ---------------------------------------------------------------------------
// Participants panel (add / remove / change role)
// ---------------------------------------------------------------------------

function ParticipantPanel({
  conversationId,
  containerId,
  isAdmin,
}: {
  conversationId: string;
  containerId: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: participants } = useQuery({
    queryKey: ["communication", "participants", conversationId],
    queryFn: () => sdk.communication.listParticipants(conversationId),
  });

  // Search is scoped to the conversation's own container, not the
  // conversation id — `addParticipant` needs an actor who's a member
  // of that container, which `container_id` on the Conversation
  // already tells us without another context lookup.
  const { data: candidates } = useActorSearch(
    isAdmin ? containerId : undefined,
    search,
  );

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

  const roleMutation = useMutation({
    mutationFn: (vars: { actorId: string; role: ParticipantRole }) =>
      sdk.communication.setParticipantRole(
        conversationId,
        vars.actorId,
        vars.role,
      ),
    onSuccess: invalidate,
  });

  const adminCount =
    participants?.filter((p) => p.role === "admin").length ?? 0;

  return (
    <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
      <ul className="flex flex-col gap-1.5">
        {participants?.map((p) => (
          <ParticipantRow
            key={p.id}
            participant={p}
            isAdmin={isAdmin}
            isLastAdmin={p.role === "admin" && adminCount <= 1}
            onChangeRole={(role) =>
              roleMutation.mutate({ actorId: p.actor_id, role })
            }
            onRemove={() => removeMutation.mutate(p.actor_id)}
          />
        ))}
      </ul>

      {roleMutation.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {roleMutation.error.message}
        </p>
      )}
      {removeMutation.isError && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {removeMutation.error.message}
        </p>
      )}

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

function ParticipantRow({
  participant,
  isAdmin,
  isLastAdmin,
  onChangeRole,
  onRemove,
}: {
  participant: Participant;
  isAdmin: boolean;
  isLastAdmin: boolean;
  onChangeRole: (role: ParticipantRole) => void;
  onRemove: () => void;
}) {
  const name = useActorName(participant.actor_id) ?? participant.actor_id;

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={name} seed={participant.actor_id} size={20} />
        <span className="truncate">{name}</span>
      </span>

      <span className="flex flex-none items-center gap-2">
        {isAdmin ? (
          <select
            value={participant.role}
            disabled={isLastAdmin}
            onChange={(e) => onChangeRole(e.target.value as ParticipantRole)}
            title={
              isLastAdmin ? "The group needs at least one admin" : undefined
            }
            className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-xs disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="member">Member</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          participant.role !== "member" && (
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              {participant.role}
            </span>
          )
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isLastAdmin}
            aria-label="Remove"
            title={
              isLastAdmin ? "The group needs at least one admin" : "Remove"
            }
            className="text-neutral-400 hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
          >
            <UserMinus size={13} />
          </button>
        )}
      </span>
    </li>
  );
}

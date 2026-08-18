import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commApi, unwrapList, type Conversation } from "./api";
import MessageThread from "./MessageThread";
import MemberPicker from "./MemberPicker";
import {
  Avatar,
  ChatBubbleIcon,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PlusIcon,
  SearchInput,
  formatRelativeTime,
  useDebouncedValue,
} from "./commShared";

export default function ChatsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const canSend = permissions.includes("system.communications.dm.send");

  const [openId, setOpenId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);

  const q = useQuery({
    queryKey: ["comm", "conversations", containerId],
    queryFn: () =>
      commApi("GET", `/conversations?container_id=${containerId}&per_page=50`),
  });
  const conversations = unwrapList<Conversation>(q.data);

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const at = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bt = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bt - at;
      }),
    [conversations],
  );

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((c) =>
      (c.recipient_name ?? c.initiator_name ?? "").toLowerCase().includes(term),
    );
  }, [sorted, debouncedQuery]);

  const start = useMutation({
    mutationFn: (recipientActorId: string) =>
      commApi("POST", "/conversations", {
        recipient_actor_id: recipientActorId,
        container_id: containerId,
      }),
    onSuccess: (conv: Conversation) => {
      setStarting(false);
      setStartError(null);
      qc.invalidateQueries({ queryKey: ["comm", "conversations", containerId] });
      if (conv?.id) setOpenId(conv.id);
    },
    onError: (e: Error) => setStartError(e.message),
  });

  if (openId) {
    const conv = conversations.find((c) => c.id === openId);
    return (
      <MessageThread
        title={conv?.recipient_name ?? conv?.initiator_name ?? "Conversation"}
        messagesPath={`/conversations/${openId}/messages`}
        sendPath={`/conversations/${openId}/messages`}
        readPath={`/conversations/${openId}/read`}
        reactPathPrefix="/messages/dm"
        queryKey={["comm", "dm-messages", openId]}
        canSend={canSend}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search chats…" />
        </div>
        {canSend && (
          <button
            onClick={() => setStarting(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            <PlusIcon />
            New chat
          </button>
        )}
      </div>

      {starting && (
        <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {startError && <ErrorBanner message={startError} />}
          <MemberPicker
            containerId={containerId}
            onPick={(actorId) => start.mutate(actorId)}
            onCancel={() => {
              setStarting(false);
              setStartError(null);
            }}
          />
        </div>
      )}

      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorBanner message="Couldn't load conversations." onRetry={() => q.refetch()} />
      ) : filtered.length === 0 && debouncedQuery ? (
        <EmptyState
          icon={<ChatBubbleIcon />}
          title="No matches"
          description={`Nothing matches "${debouncedQuery}".`}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ChatBubbleIcon />}
          title="No conversations yet"
          description="Start a direct message with anyone in this container."
          action={
            canSend && (
              <button
                onClick={() => setStarting(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                + New chat
              </button>
            )
          }
        />
      ) : (
        <ConversationList items={filtered} onOpen={setOpenId} />
      )}
    </div>
  );
}

function ConversationList({
  items,
  onOpen,
}: {
  items: Conversation[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {items.map((c, i) => {
        const name = c.recipient_name ?? c.initiator_name ?? "Conversation";
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className={`w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
              i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""
            }`}
          >
            <Avatar name={name} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-black dark:text-white truncate">
                  {name}
                </span>
                {c.last_message_at && (
                  <span className="shrink-0 text-[10px] text-neutral-400">
                    {formatRelativeTime(c.last_message_at)}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

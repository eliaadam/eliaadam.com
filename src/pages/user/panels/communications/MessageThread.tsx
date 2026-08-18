import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commApi, unwrapList, type Message } from "./api";
import {
  Avatar,
  ChatBubbleIcon,
  EmptyState,
  ErrorBanner,
  getCurrentActorId,
} from "./commShared";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉"];

export default function MessageThread({
  title,
  subtitle,
  messagesPath, // e.g. `/conversations/${id}/messages` or `/groups/${id}/messages`
  sendPath,
  readPath, // e.g. `/conversations/${id}/read` or `/groups/${id}/read`
  reactPathPrefix, // e.g. `/messages/dm` or `/messages/group`
  queryKey,
  canSend,
  onBack,
}: {
  title: string;
  subtitle?: string;
  messagesPath: string;
  sendPath: string;
  readPath?: string;
  reactPathPrefix?: "/messages/dm" | "/messages/group";
  queryKey: (string | undefined)[];
  canSend: boolean;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);
  const currentActorId = useMemo(() => getCurrentActorId(), []);

  const separator = messagesPath.includes("?") ? "&" : "?";

  const q = useQuery({
    queryKey: [...queryKey, page],
    queryFn: () =>
      commApi("GET", `${messagesPath}${separator}per_page=50&page=${page}`),
    refetchInterval: page === 1 ? 8000 : false, // only poll the latest page
  });

  const messages: Message[] = unwrapList<Message>(q.data);
  // messages come newest-first from the API; show oldest-first
  const ordered = [...messages].reverse();
  const hasMore =
    q.data && typeof q.data === "object" && "current_page" in q.data
      ? q.data.current_page < q.data.last_page
      : false;

  useEffect(() => {
    if (page === 1) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ordered.length, page]);

  useEffect(() => {
    // Mark read once per thread open, not on every poll.
    if (readPath && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      commApi("POST", readPath).catch(() => {
        /* best-effort — not worth surfacing to the user */
      });
    }
  }, [readPath]);

  const send = useMutation({
    mutationFn: () =>
      commApi("POST", sendPath, { content: draft, content_type: "text" }),
    onSuccess: () => {
      setDraft("");
      setError(null);
      setPage(1);
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleStar = useMutation({
    mutationFn: (messageId: string) =>
      commApi("POST", `${reactPathPrefix}/${messageId}/star`),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const react = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      commApi("POST", `${reactPathPrefix}/${messageId}/react`, { emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return (
    <div className="flex flex-col h-[540px] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onBack}
          aria-label="Back"
          className="text-neutral-400 hover:text-black dark:hover:text-white text-sm"
        >
          ←
        </button>
        <Avatar name={title} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black dark:text-white m-0 truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-neutral-400 m-0 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {hasMore && page === 1 && (
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={q.isFetching}
            className="w-full text-center text-[11px] text-neutral-400 hover:text-black dark:hover:text-white py-1 disabled:opacity-50"
          >
            {q.isFetching && page > 1 ? "Loading…" : "Load earlier messages"}
          </button>
        )}

        {q.isLoading ? (
          <MessageSkeleton />
        ) : q.isError ? (
          <ErrorBanner
            message="Couldn't load messages."
            onRetry={() => q.refetch()}
          />
        ) : ordered.length === 0 ? (
          <EmptyState
            icon={<ChatBubbleIcon />}
            title="No messages yet"
            description="Say something to get things started."
          />
        ) : (
          ordered.map((m) => {
            // ASSUMPTION: Message has a `sender_actor_id` field. If your
            // Message type names it differently (e.g. sender_id), update
            // this line — it's the only place ownership is decided.
            const isOwn =
              currentActorId != null && m.sender_actor_id === currentActorId;

            return (
              <div key={m.id} className="group">
                {m.reply_to_id && !m.is_system_message && (
                  <div
                    className={`border-l-2 border-neutral-200 dark:border-neutral-800 mb-1 ${
                      isOwn ? "mr-9 pr-2 text-right ml-auto" : "ml-9 pl-2"
                    }`}
                  >
                    <p className="text-[10px] text-neutral-400 m-0 truncate">
                      ↳ {m.reply_to_sender_name}:{" "}
                      {m.reply_to_content ?? "attachment"}
                    </p>
                  </div>
                )}

                {m.is_system_message ? (
                  <p className="text-[11px] text-neutral-400 text-center italic">
                    {m.content ?? m.system_event}
                  </p>
                ) : (
                  <div
                    className={`flex items-start gap-2 ${
                      isOwn ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar name={isOwn ? "You" : m.sender_name} size="sm" />
                    <div
                      className={`flex-1 min-w-0 flex flex-col ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`flex items-baseline gap-2 ${
                          isOwn ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span className="text-xs font-semibold text-black dark:text-white">
                          {isOwn ? "You" : m.sender_name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        {m.is_edited && (
                          <span className="text-[10px] text-neutral-400">
                            (edited)
                          </span>
                        )}
                        {m.is_starred && (
                          <span className="text-[10px]">⭐</span>
                        )}
                      </div>

                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                          isOwn
                            ? "bg-black text-white dark:bg-white dark:text-black rounded-br-sm"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-bl-sm"
                        }`}
                      >
                        {m.deleted_for_everyone ? (
                          <span className="italic opacity-70">
                            This message was deleted
                          </span>
                        ) : (
                          m.content
                        )}
                      </div>

                      {m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {m.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={a.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-neutral-500 underline"
                            >
                              {a.name}
                            </a>
                          ))}
                        </div>
                      )}

                      {m.reactions.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {Object.entries(
                            m.reactions.reduce<Record<string, number>>(
                              (acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                                return acc;
                              },
                              {},
                            ),
                          ).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900"
                            >
                              {emoji} {count}
                            </span>
                          ))}
                        </div>
                      )}

                      {reactPathPrefix && !m.deleted_for_everyone && (
                        <div
                          className={`hidden group-hover:flex gap-1 mt-1 ${
                            isOwn ? "flex-row-reverse" : ""
                          }`}
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() =>
                                react.mutate({ messageId: m.id, emoji })
                              }
                              className="text-xs opacity-60 hover:opacity-100"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => toggleStar.mutate(m.id)}
                            className="text-xs opacity-60 hover:opacity-100"
                          >
                            {m.is_starred ? "★" : "☆"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {canSend ? (
        <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) send.mutate();
                }
              }}
              placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
            <button
              onClick={() => draft.trim() && send.mutate()}
              disabled={send.isPending || !draft.trim()}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              {send.isPending ? "…" : "Send"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <p className="text-[11px] text-neutral-400 m-0">
            You have read access to this conversation but cannot send messages.
          </p>
        </div>
      )}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-hidden="true">
      {[60, 40, 75].map((w, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div
              className="h-3 rounded bg-neutral-200 dark:bg-neutral-800"
              style={{ width: `${w}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellOff,
  Megaphone,
  MessageSquarePlus,
  Search,
  Users,
} from "lucide-react";
import { sdk, type Actor, type Conversation } from "../../lib/sdk";
import { useAuth } from "../context/Authcontext";
import { useContainer } from "../context/ContainerContext";
import { useActorName } from "./useActorName";
import { useActorSearch } from "./useActorSearch";
import { Avatar, formatRelativeTime } from "./Avatar";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-600";

type Tab = "active" | "archived";

export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}) {
  const { currentContainerId } = useContainer();
  const [mode, setMode] = useState<"list" | "new-direct" | "new-group">("list");
  const [tab, setTab] = useState<Tab>("active");
  const [filter, setFilter] = useState("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["communication", "conversations", currentContainerId],
    queryFn: () => sdk.communication.listConversations(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  const visible = useMemo(() => {
    const byTab = conversations?.filter((c) => c.status === tab) ?? [];
    const query = filter.trim().toLowerCase();
    // NOTE: only filters group titles — filtering direct conversations
    // by the other person's name would mean resolving every row's
    // name up front (one lookup per row) just to type-ahead search.
    if (!query) return byTab;
    return byTab.filter(
      (c) => c.type === "direct" || (c.title ?? "").toLowerCase().includes(query),
    );
  }, [conversations, tab, filter]);

  const archivedCount = conversations?.filter((c) => c.status === "archived").length ?? 0;

  if (!currentContainerId) {
    return (
      <p className="p-4 text-sm text-neutral-500 dark:text-neutral-500">
        Select a container first.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setMode(mode === "new-direct" ? "list" : "new-direct")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
            mode === "new-direct"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
              : "border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          }`}
        >
          <MessageSquarePlus size={14} />
          New message
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "new-group" ? "list" : "new-group")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
            mode === "new-group"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
              : "border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          }`}
        >
          <Users size={14} />
          New group
        </button>
      </div>

      {mode === "new-direct" && (
        <NewDirectForm
          containerId={currentContainerId}
          onCreated={(c) => {
            onSelect(c.id);
            setMode("list");
          }}
        />
      )}
      {mode === "new-group" && (
        <NewGroupForm
          containerId={currentContainerId}
          onCreated={(c) => {
            onSelect(c.id);
            setMode("list");
          }}
        />
      )}

      {mode === "list" && (
        <>
          <div className="flex items-center gap-1 border-b border-neutral-200 px-3 pt-2 dark:border-neutral-800">
            {(["active", "archived"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-2 pb-2 text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300"
                }`}
              >
                {t}
                {t === "archived" && archivedCount > 0 && ` (${archivedCount})`}
              </button>
            ))}
          </div>

          <div className="relative border-b border-neutral-200 p-2 dark:border-neutral-800">
            <Search
              size={13}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              className={`${inputClass} pl-8 text-xs`}
              placeholder="Search group names…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
              />
            ))}
          </div>
        )}
        {!isLoading && visible.length === 0 && (
          <p className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-500">
            {tab === "archived" ? "No archived conversations." : "No conversations yet."}
          </p>
        )}
        <ul className="flex flex-col">
          {visible.map((c) => (
            <li key={c.id}>
              <ConversationRow
                conversation={c}
                selected={c.id === selectedId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { user } = useAuth();

  const { data: participants } = useQuery({
    queryKey: ["communication", "participants", conversation.id],
    queryFn: () => sdk.communication.listParticipants(conversation.id),
  });

  const other = participants?.find((p) => p.actor_id !== user?.id);
  const isSelfDirect = conversation.type === "direct" && participants && !other;
  const nameLookupId = other?.actor_id ?? (isSelfDirect ? user?.id : undefined);
  const resolvedName = useActorName(conversation.type === "direct" ? nameLookupId : undefined);

  const mine = participants?.find((p) => p.actor_id === user?.id);

  let label = conversation.title ?? "Group";
  if (conversation.type === "direct") {
    label = isSelfDirect
      ? `${resolvedName ?? "You"} (you)`
      : resolvedName ?? "Direct message";
  }

  const avatarSeed = conversation.type === "group" ? conversation.id : nameLookupId ?? conversation.id;
  const unread = conversation.unread_count > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={[
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "bg-neutral-100 dark:bg-neutral-900"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
      ].join(" ")}
    >
      <Avatar name={label} seed={avatarSeed} size={34} />

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {conversation.type === "group" && (
            <Users size={12} className="flex-none text-neutral-400" />
          )}
          <span
            className={`truncate ${unread ? "font-semibold" : "font-medium"}`}
          >
            {label}
          </span>
          {conversation.only_admins_can_post && (
            <Megaphone size={12} className="flex-none text-neutral-400" aria-label="Broadcast only" />
          )}
          {mine?.muted && (
            <BellOff size={12} className="flex-none text-neutral-400" aria-label="Muted" />
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-500">
          {formatRelativeTime(conversation.updated_at)}
        </span>
      </span>

      {unread && (
        <span className="flex-none rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
        </span>
      )}
    </button>
  );
}

function NewDirectForm({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: (conversation: Conversation) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: actors } = useActorSearch(containerId, search);

  const mutation = useMutation({
    mutationFn: (otherActorId: string) =>
      sdk.communication.createDirectConversation({
        container_id: containerId,
        other_actor_id: otherActorId,
      }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({
        queryKey: ["communication", "conversations"],
      });
      onCreated(conversation);
    },
  });

  return (
    <div className="border-b border-neutral-200 p-3 dark:border-neutral-800">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          autoFocus
          className={`${inputClass} pl-8`}
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {mutation.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {mutation.error.message}
        </p>
      )}
      {actors && actors.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {actors.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => mutation.mutate(a.id)}
                disabled={mutation.isPending}
                className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-60 dark:hover:bg-neutral-900"
              >
                <Avatar name={a.display_name} seed={a.id} size={24} />
                {a.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewGroupForm({
  containerId,
  onCreated,
}: {
  containerId: string;
  onCreated: (conversation: Conversation) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [onlyAdminsCanPost, setOnlyAdminsCanPost] = useState(false);
  const [selected, setSelected] = useState<Actor[]>([]);

  const { data: actors } = useActorSearch(containerId, search);

  const mutation = useMutation({
    mutationFn: () =>
      sdk.communication.createGroupConversation({
        container_id: containerId,
        title,
        participant_actor_ids: selected.map((a) => a.id),
        only_admins_can_post: onlyAdminsCanPost,
      }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({
        queryKey: ["communication", "conversations"],
      });
      onCreated(conversation);
    },
  });

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
      <input
        autoFocus
        className={inputClass}
        placeholder="Group name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={onlyAdminsCanPost}
          onChange={(e) => setOnlyAdminsCanPost(e.target.checked)}
          className="size-3.5 rounded border-neutral-300 dark:border-neutral-700"
        />
        Only admins can post (broadcast group)
      </label>

      <div className="flex flex-wrap gap-1.5">
        {selected.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800"
          >
            {a.display_name}
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => prev.filter((s) => s.id !== a.id))
              }
              className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
              aria-label={`Remove ${a.display_name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          className={`${inputClass} pl-8`}
          placeholder="Add people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {actors && actors.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {actors
            .filter((a) => !selected.some((s) => s.id === a.id))
            .map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected((prev) => [...prev, a]);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <Avatar name={a.display_name} seed={a.id} size={24} />
                  {a.display_name}
                </button>
              </li>
            ))}
        </ul>
      )}
      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {mutation.error.message}
        </p>
      )}
      <button
        type="button"
        disabled={!title || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="self-start rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {mutation.isPending ? "Creating…" : "Create group"}
      </button>
    </div>
  );
}

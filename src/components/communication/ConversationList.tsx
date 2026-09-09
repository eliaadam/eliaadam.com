import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Search, Users } from "lucide-react";
import { sdk, type Actor, type Conversation } from "../../lib/sdk";
import { useAuth } from "../context/Authcontext";
import { useContainer } from "../context/ContainerContext";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900";

export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}) {
  const { currentContainerId } = useContainer();
  const [mode, setMode] = useState<"list" | "new-direct" | "new-group">("list");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["communication", "conversations", currentContainerId],
    queryFn: () => sdk.communication.listConversations(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <MessageSquarePlus size={14} />
          New message
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "new-group" ? "list" : "new-group")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
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
        {conversations && conversations.length === 0 && (
          <p className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-500">
            No conversations yet.
          </p>
        )}
        <ul className="flex flex-col">
          {conversations?.map((c) => (
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

  // FIX: was resolving names via a paginated `listActors({limit:200})`
  // scan — unreliable past 200 actors, AND structurally blind to a
  // self-DM (see below). `getActor(id)` is a direct, reliable lookup
  // by id regardless of how many actors exist; react-query caches it
  // per id so this doesn't refetch on every render.
  const other = participants?.find((p) => p.actor_id !== user?.id);
  const isSelfDirect = conversation.type === "direct" && participants && !other;
  const nameLookupId = other?.actor_id ?? (isSelfDirect ? user?.id : undefined);

  const { data: nameActor } = useQuery({
    queryKey: ["actor", nameLookupId],
    queryFn: () => sdk.identity.getActor(nameLookupId!),
    enabled: conversation.type === "direct" && Boolean(nameLookupId),
  });

  let label = conversation.title ?? "Group";
  if (conversation.type === "direct") {
    if (isSelfDirect) {
      // FIX: no participant has a DIFFERENT actor_id in a self-DM —
      // that's not a resolution failure, it's the expected shape.
      // Show your own name, not the generic fallback.
      label = nameActor ? `${nameActor.display_name} (you)` : "You";
    } else {
      label = nameActor?.display_name ?? "Direct message";
    }
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={[
        "flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "bg-neutral-100 dark:bg-neutral-900"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50",
      ].join(" ")}
    >
      {conversation.type === "group" && (
        <Users size={14} className="flex-none text-neutral-400" />
      )}
      <span className="truncate font-medium">{label}</span>
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

  const { data: actors } = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => sdk.identity.listActors({
      search, limit: 10,
      containerId: ""
    }),
    enabled: search.trim().length > 1,
  });

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
          className={`${inputClass} pl-8`}
          placeholder="Search people…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {actors && actors.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {actors.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => mutation.mutate(a.id)}
                disabled={mutation.isPending}
                className="block w-full px-2 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
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
  const [selected, setSelected] = useState<Actor[]>([]);

  const { data: actors } = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => sdk.identity.listActors({
      search, limit: 10,
      containerId: ""
    }),
    enabled: search.trim().length > 1,
  });

  const mutation = useMutation({
    mutationFn: () =>
      sdk.communication.createGroupConversation({
        container_id: containerId,
        title,
        participant_actor_ids: selected.map((a) => a.id),
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
        className={inputClass}
        placeholder="Group name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
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
                  className="block w-full px-2 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  {a.display_name}
                </button>
              </li>
            ))}
        </ul>
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

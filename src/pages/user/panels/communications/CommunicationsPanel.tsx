import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commApi, unwrapList, type Conversation, type Group } from "./api";
import MessageThread from "./MessageThread";
 
import BroadcastsPanel from "./BroadcastsPanel";
import CommunitiesPanel from "./CommunitiesPanel";
import MemberPicker from "./MemberPicker";

type SubTab = "chats" | "groups" | "broadcasts" | "communities";

export default function CommunicationsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (code: string) => permissions.includes(code);

  useEffect(() => {
    localStorage.setItem("maicore_container_id", containerId);
  }, [containerId]);

  const tabs: { key: SubTab; label: string; show: boolean }[] = [
    {
      key: "chats",
      label: "Chats",
      show: can("system.communications.dm.send"),
    },
    {
      key: "groups",
      label: "Groups",
      show:
        can("system.communications.group.create") ||
        can("system.communications.group.message.send"),
    },
    {
      key: "broadcasts",
      label: "Broadcasts",
      show:
        can("system.communications.broadcast.send") ||
        can("system.communications.broadcast.create") ||
        can("system.communications.broadcast.view"),
    },
    {
      key: "communities",
      label: "Communities",
      show:
        can("system.communications.community.create") ||
        can("system.communications.community.manage"),
    },
  ];

  const visible = tabs.filter((t) => t.show);
  const [active, setActive] = useState<SubTab | null>(visible[0]?.key ?? null);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        Communications is enabled here, but you hold no messaging permissions.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {visible.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                on
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {active === "chats" && (
        <ChatsSurface containerId={containerId} permissions={permissions} />
      )}
      {active === "groups" && (
        <GroupsSurface containerId={containerId} permissions={permissions} />
      )}
      {active === "broadcasts" && (
        <BroadcastsPanel containerId={containerId} permissions={permissions} />
      )}
      {active === "communities" && (
        <CommunitiesPanel containerId={containerId} permissions={permissions} />
      )}
    </div>
  );
}

/* ── CHATS (direct messages) ──────────────────────────────────────── */

function ChatsSurface({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["comm", "conversations", containerId],
    queryFn: () =>
      commApi("GET", `/conversations?container_id=${containerId}&per_page=50`),
  });
  const conversations = unwrapList<Conversation>(q.data);

  const start = useMutation({
    mutationFn: (recipientActorId: string) =>
      commApi("POST", "/conversations", {
        recipient_actor_id: recipientActorId,
        container_id: containerId,
      }),
    onSuccess: (conv: Conversation) => {
      setStarting(false);
      setError(null);
      qc.invalidateQueries({
        queryKey: ["comm", "conversations", containerId],
      });
      if (conv?.id) setOpenId(conv.id);
    },
    onError: (e: Error) => setError(e.message),
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
        canSend={permissions.includes("system.communications.dm.send")}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        {!starting ? (
          <button
            onClick={() => setStarting(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            + New chat
          </button>
        ) : (
          <>
            {error && (
              <p className="text-[11px] text-amber-600 mb-2 m-0">{error}</p>
            )}
            <MemberPicker
              containerId={containerId}
              onPick={(actorId) => start.mutate(actorId)}
              onCancel={() => {
                setStarting(false);
                setError(null);
              }}
            />
          </>
        )}
      </div>

      <ConversationList
        loading={q.isLoading}
        items={conversations}
        onOpen={setOpenId}
      />
    </div>
  );
}

function ConversationList({
  loading,
  items,
  onOpen,
}: {
  loading: boolean;
  items: Conversation[];
  onOpen: (id: string) => void;
}) {
  if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (items.length === 0)
    return (
      <p className="text-sm text-neutral-400">
        No conversations yet in this container.
      </p>
    );

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {items.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onOpen(c.id)}
          className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
            i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black dark:text-white">
              {c.recipient_name ?? c.initiator_name ?? "Conversation"}
            </span>
            {c.last_message_at && (
              <span className="text-[10px] text-neutral-400">
                {new Date(c.last_message_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── GROUPS ───────────────────────────────────────────────────────── */

function GroupsSurface({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const can = (c: string) => permissions.includes(c);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["comm", "groups", containerId],
    queryFn: () => commApi("GET", "/groups"),
  });
  const groups = unwrapList<Group>(q.data);

  const create = useMutation({
    mutationFn: () =>
      commApi("POST", "/groups", {
        name: name.trim(),
        container_id: containerId,
      }),
    onSuccess: (created: Group) => {
      setCreating(false);
      setName("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["comm", "groups", containerId] });
      // Same reasoning as broadcasts/communities: a freshly created group
      // is one you're about to add members to, so open it immediately.
      if (created?.id) setOpenId(created.id);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (openId) {
    const g = groups.find((x) => x.id === openId);
    if (!g) return null;
    return (
      <div>
        <MessageThread
          title={g.name}
          subtitle={`${g.participants.length} members`}
          messagesPath={`/groups/${openId}/messages`}
          sendPath={`/groups/${openId}/messages`}
          readPath={`/groups/${openId}/read`}
          reactPathPrefix="/messages/group"
          queryKey={["comm", "group-messages", openId]}
          canSend={permissions.includes(
            "system.communications.group.message.send",
          )}
          onBack={() => setOpenId(null)}
        />
        <GroupMembersPanel
          group={g}
          containerId={containerId}
          permissions={permissions}
          onChanged={() =>
            qc.invalidateQueries({ queryKey: ["comm", "groups", containerId] })
          }
        />
      </div>
    );
  }

  return (
    <div>
      {can("system.communications.group.create") && (
        <div className="mb-4">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
            >
              + New group
            </button>
          ) : (
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) create.mutate();
                }}
                placeholder="Group name"
                className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
              />
              <button
                onClick={() => name.trim() && create.mutate()}
                disabled={create.isPending || !name.trim()}
                className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-3 py-2 text-xs text-neutral-500"
              >
                Cancel
              </button>
            </div>
          )}
          {error && (
            <p className="text-[11px] text-amber-600 mt-2 m-0">{error}</p>
          )}
        </div>
      )}

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-neutral-400">No groups yet.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {groups.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setOpenId(g.id)}
              className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              <span className="text-sm font-medium text-black dark:text-white">
                {g.name}
              </span>
              <span className="text-[11px] text-neutral-400 ml-2">
                {g.participants.length} members
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupMembersPanel({
  group,
  containerId,
  permissions,
  onChanged,
}: {
  group: Group;
  containerId: string;
  permissions: string[];
  onChanged: () => void;
}) {
  const can = (c: string) => permissions.includes(c);
  const canManage = can("system.communications.group.participant.manage");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addParticipant = useMutation({
    mutationFn: (actorId: string) =>
      commApi("POST", `/groups/${group.id}/participants`, {
        actor_id: actorId,
      }),
    onSuccess: () => {
      setAdding(false);
      setError(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });
  const removeParticipant = useMutation({
    mutationFn: (actorId: string) =>
      commApi("DELETE", `/groups/${group.id}/participants/${actorId}`),
    onSuccess: onChanged,
    onError: (e: Error) => setError(e.message),
  });
  const promote = useMutation({
    mutationFn: (actorId: string) =>
      commApi("POST", `/groups/${group.id}/participants/${actorId}/promote`),
    onSuccess: onChanged,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 m-0">
          Members ({group.participants.length})
        </p>
        {canManage && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="text-xs text-neutral-500 underline"
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-amber-600 mb-2 m-0">{error}</p>}
      {adding && (
        <div className="mb-2">
          <MemberPicker
            containerId={containerId}
            onPick={(actorId) => addParticipant.mutate(actorId)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {group.participants.map((p) => (
          <div
            key={p.actor_id}
            className="flex items-center justify-between text-xs"
          >
            <span>
              {p.name} <span className="text-neutral-400">· {p.role}</span>
            </span>
            {canManage && p.role !== "super_admin" && (
              <div className="flex gap-2">
                {p.role === "member" && (
                  <button
                    onClick={() => promote.mutate(p.actor_id)}
                    className="text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    Promote
                  </button>
                )}
                <button
                  onClick={() => removeParticipant.mutate(p.actor_id)}
                  className="text-red-500"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

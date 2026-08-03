import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  commApi,
  unwrapList,
  type Broadcast,
  type BroadcastRecipient,
  type BroadcastGroup,
} from "./api";
import { fetchMembers } from "./MemberPicker";
import MemberPicker from "./MemberPicker";

/*
 * Broadcasts are a one-shot send, not a chat thread: creating one queues
 * durable, per-recipient delivery immediately (see BroadcastService::send).
 * Recipients are resolved automatically from recipient_mode — there is no
 * "add a recipient after the fact" the way groups have participants. Curated
 * recipient lists are managed as broadcast groups, separately from the send
 * itself.
 *
 * This is now structured the same way CommunicationsPanel structures its
 * own sub-tabs: a flat tab bar (Sent / Compose / Groups), each tab always
 * showing its full content — no collapsible "+ New broadcast" panel that
 * itself contains a collapsible "manage groups" panel that itself contains
 * a collapsible "+ new group" form. Composing and managing groups are
 * siblings, not nested inside each other.
 */

type BroadcastTab = "sent" | "compose" | "groups";

export default function BroadcastsPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const canSend = permissions.includes("system.communications.broadcast.send");

  const TABS: { key: BroadcastTab; label: string; show: boolean }[] = [
    { key: "sent", label: "Sent", show: true },
    { key: "compose", label: "Compose", show: canSend },
    { key: "groups", label: "Groups", show: canSend },
  ];
  const visible = TABS.filter((t) => t.show);

  const [tab, setTab] = useState<BroadcastTab>(visible[0]?.key ?? "sent");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      {visible.length > 1 && (
        <div className="flex gap-1 mb-4">
          {visible.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setOpenId(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                tab === t.key
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "sent" &&
        (openId ? (
          <BroadcastDetail
            id={openId}
            containerId={containerId}
            onBack={() => setOpenId(null)}
          />
        ) : (
          <SentList containerId={containerId} onOpen={setOpenId} />
        ))}

      {tab === "compose" && canSend && (
        <BroadcastComposer
          containerId={containerId}
          onManageGroups={() => setTab("groups")}
          onDone={(created) => {
            qc.invalidateQueries({
              queryKey: ["comm", "broadcasts", containerId],
            });
            // Sending is the whole point — go straight to watching it
            // deliver instead of making them find it in the Sent list.
            setTab("sent");
            if (created?.id) setOpenId(created.id);
          }}
        />
      )}

      {tab === "groups" && canSend && (
        <BroadcastGroupManager containerId={containerId} />
      )}
    </div>
  );
}

function SentList({
  containerId,
  onOpen,
}: {
  containerId: string;
  onOpen: (id: string) => void;
}) {
  const q = useQuery({
    queryKey: ["comm", "broadcasts", containerId],
    queryFn: () => commApi("GET", `/broadcasts?container_id=${containerId}`),
  });
  const broadcasts = unwrapList<Broadcast>(q.data);

  if (q.isLoading) return <p className="text-sm text-neutral-400">Loading…</p>;
  if (broadcasts.length === 0)
    return <p className="text-sm text-neutral-400">No broadcasts yet.</p>;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {broadcasts.map((b, i) => (
        <button
          key={b.id}
          onClick={() => onOpen(b.id)}
          className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
            i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-black dark:text-white">
              {b.title}
            </span>
            <StatusPill status={b.send_status} />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
            <span className="capitalize">{b.recipient_mode}</span>
            <span>
              {b.delivered_count}/{b.recipient_count} delivered
            </span>
            {b.failed_count > 0 && (
              <span className="text-red-500">{b.failed_count} failed</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

const RECIPIENT_MODES: {
  key: "container" | "tree" | "group";
  label: string;
}[] = [
  { key: "container", label: "This container" },
  { key: "tree", label: "Container + sub-containers" },
  { key: "group", label: "A curated group" },
];

function BroadcastComposer({
  containerId,
  onDone,
  onManageGroups,
}: {
  containerId: string;
  onDone: (created?: Broadcast) => void;
  onManageGroups: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"container" | "tree" | "group">("container");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const groupsQ = useQuery({
    queryKey: ["comm", "broadcast-groups", containerId],
    queryFn: () =>
      commApi("GET", `/broadcast-groups?container_id=${containerId}`),
    enabled: mode === "group",
  });
  const groups = unwrapList<BroadcastGroup>(groupsQ.data);

  const send = useMutation({
    mutationFn: () =>
      commApi("POST", "/broadcasts", {
        container_id: containerId,
        title: title.trim(),
        body: body.trim(),
        recipient_mode: mode,
        group_id: mode === "group" ? groupId : undefined,
        channels: ["email"],
      }),
    onSuccess: (created: Broadcast) => onDone(created),
    onError: (e: Error) => setError(e.message),
  });

  const canSend = title.trim() && body.trim() && (mode !== "group" || groupId);

  return (
    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
      {error && <p className="text-[11px] text-amber-600 m-0">{error}</p>}

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Broadcast title"
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message body"
        rows={3}
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      />

      <div>
        <label className="text-xs text-neutral-500 block mb-1.5">Send to</label>
        <div className="flex gap-1.5 flex-wrap">
          {RECIPIENT_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-2.5 py-1.5 text-xs rounded-md border transition ${
                mode === m.key
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-black dark:hover:border-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "group" && (
        <div className="flex items-center gap-2">
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          >
            <option value="">
              {groupsQ.isLoading
                ? "Loading groups…"
                : groups.length === 0
                  ? "No groups yet — create one"
                  : "Select a recipient group…"}
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.member_count})
              </option>
            ))}
          </select>
          <button
            onClick={onManageGroups}
            className="text-xs text-neutral-500 underline whitespace-nowrap"
          >
            Manage groups
          </button>
        </div>
      )}

      <p className="text-[11px] text-neutral-400 m-0">Delivered via email.</p>

      <div className="flex justify-end">
        <button
          onClick={() => send.mutate()}
          disabled={!canSend || send.isPending}
          className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {send.isPending ? "Sending…" : "Send broadcast"}
        </button>
      </div>
    </div>
  );
}

function BroadcastGroupManager({ containerId }: { containerId: string }) {
  const [name, setName] = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["comm", "broadcast-groups", containerId],
    queryFn: () =>
      commApi("GET", `/broadcast-groups?container_id=${containerId}`),
  });
  const groups = unwrapList<BroadcastGroup>(q.data);

  const create = useMutation({
    mutationFn: () =>
      commApi("POST", "/broadcast-groups", {
        container_id: containerId,
        name: name.trim(),
      }),
    onSuccess: () => {
      setName("");
      q.refetch();
    },
  });
  const addMember = useMutation({
    mutationFn: ({ groupId, actorId }: { groupId: string; actorId: string }) =>
      commApi("POST", `/broadcast-groups/${groupId}/members`, {
        container_id: containerId,
        actor_id: actorId,
      }),
    onSuccess: () => {
      setPicking(null);
      q.refetch();
    },
  });
  const removeGroup = useMutation({
    mutationFn: (groupId: string) =>
      commApi("DELETE", `/broadcast-groups/${groupId}`, {
        container_id: containerId,
      }),
    onSuccess: () => q.refetch(),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) create.mutate();
          }}
          placeholder="New recipient group name"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <button
          onClick={() => name.trim() && create.mutate()}
          disabled={!name.trim() || create.isPending}
          className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          Create
        </button>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No recipient groups yet. Create one above, then pick it when you
          compose a broadcast.
        </p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {groups.map((g, i) => (
            <div
              key={g.id}
              className={`px-4 py-3 ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-black dark:text-white">
                  {g.name}{" "}
                  <span className="text-neutral-400 text-xs">
                    · {g.member_count} member{g.member_count === 1 ? "" : "s"}
                  </span>
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPicking(picking === g.id ? null : g.id)}
                    className="text-xs text-neutral-500 hover:text-black dark:hover:text-white underline"
                  >
                    {picking === g.id ? "Cancel" : "+ member"}
                  </button>
                  <button
                    onClick={() => removeGroup.mutate(g.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {picking === g.id && (
                <div className="mt-2">
                  <MemberPicker
                    containerId={containerId}
                    onPick={(actorId) =>
                      addMember.mutate({ groupId: g.id, actorId })
                    }
                    onCancel={() => setPicking(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastDetail({
  id,
  containerId,
  onBack,
}: {
  id: string;
  containerId: string;
  onBack: () => void;
}) {
  const q = useQuery({
    queryKey: ["comm", "broadcast", id],
    queryFn: () => commApi("GET", `/broadcasts/${id}`),
  });
  const broadcast: Broadcast | undefined = q.data;

  const recipQ = useQuery({
    queryKey: ["comm", "broadcast-recipients", id],
    queryFn: () => commApi("GET", `/broadcasts/${id}/recipients`),
    refetchInterval: 4000,
  });
  const recipients = unwrapList<BroadcastRecipient>(recipQ.data);

  // Best-effort name resolution — the recipients endpoint only has actor
  // ids, so we cross-reference the same members list MemberPicker uses.
  const membersQ = useQuery({
    queryKey: ["members", containerId],
    queryFn: () => fetchMembers(containerId),
  });
  const nameOf = (actorId: string) =>
    membersQ.data?.find((m) => m.actor_id === actorId)?.display_name ?? actorId;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onBack}
          className="text-neutral-400 hover:text-black dark:hover:text-white text-sm"
        >
          ←
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-black dark:text-white m-0 truncate">
            {broadcast?.title ?? "Broadcast"}
          </p>
          {broadcast && <StatusPill status={broadcast.send_status} />}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {q.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : broadcast ? (
          <>
            <p className="text-sm whitespace-pre-wrap m-0">{broadcast.body}</p>
            <div className="flex gap-4 text-xs text-neutral-400">
              <span>{broadcast.recipient_count} recipients</span>
              <span>{broadcast.delivered_count} delivered</span>
              {broadcast.failed_count > 0 && (
                <span className="text-red-500">
                  {broadcast.failed_count} failed
                </span>
              )}
            </div>
          </>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-neutral-500 mb-2">
            Delivery status
          </p>
          {recipQ.isLoading ? (
            <p className="text-xs text-neutral-400">Loading…</p>
          ) : recipients.length === 0 ? (
            <p className="text-xs text-neutral-400">No recipients recorded.</p>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-64 overflow-y-auto">
              {recipients.map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between px-3 py-2 text-xs ${
                    i > 0
                      ? "border-t border-neutral-200 dark:border-neutral-800"
                      : ""
                  }`}
                >
                  <span className="truncate">{nameOf(r.actor_id)}</span>
                  <RecipientStatusPill status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Broadcast["send_status"] }) {
  const color =
    status === "sent"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed"
        ? "bg-red-100 text-red-700"
        : status === "queued" || status === "sending"
          ? "bg-amber-100 text-amber-700"
          : "bg-neutral-100 text-neutral-500";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      {status}
    </span>
  );
}

function RecipientStatusPill({
  status,
}: {
  status: BroadcastRecipient["status"];
}) {
  const color =
    status === "delivered"
      ? "text-emerald-600"
      : status === "failed"
        ? "text-red-600"
        : status === "delivering"
          ? "text-amber-600"
          : "text-neutral-400";
  return <span className={`font-medium ${color}`}>{status}</span>;
}

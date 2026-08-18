import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
 * This is structured the same way CommunicationsPanel structures its own
 * sub-tabs: a flat tab bar (Sent / Compose / Groups), each tab always
 * showing its full content. Composing and managing groups are siblings,
 * not nested inside each other.
 *
 * UX additions in this revision:
 *  - a lightweight toast system so mutation success/failure is always
 *    visible instead of failing silently
 *  - two-step confirmation for destructive/high-blast-radius actions
 *    (delete group, send to "container + sub-containers")
 *  - the Sent list polls itself while anything is queued/sending, and
 *    supports searching/filtering once the list grows
 *  - char-limited, counted title/body fields so validation happens while
 *    typing rather than after a failed submit
 *  - skeleton placeholders instead of bare "Loading…" text
 *  - an unsaved-draft guard when leaving Compose with unsent content
 */

const TITLE_MAX = 150;
const BODY_MAX = 5000;

type BroadcastTab = "sent" | "compose" | "groups";

// ---------------------------------------------------------------------------
// Toasts — minimal, local, no external deps. Provided once at the panel root
// and consumed by any nested mutation site via useToast().
// ---------------------------------------------------------------------------

type Toast = { id: string; kind: "success" | "error"; message: string };
const ToastContext = createContext<
  (kind: Toast["kind"], message: string) => void
>(() => {});
const useToast = () => useContext(ToastContext);

function ToastHost({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-72"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={`px-3 py-2 rounded-lg text-xs font-medium shadow-lg cursor-pointer border ${
            t.kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-300"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

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
  const [composeDirty, setComposeDirty] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (kind: Toast["kind"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  const dismissToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const requestTabChange = (next: BroadcastTab) => {
    if (tab === "compose" && next !== "compose" && composeDirty) {
      const ok = window.confirm(
        "You have an unsent broadcast draft. Leave without sending?",
      );
      if (!ok) return;
    }
    setTab(next);
    setOpenId(null);
  };

  return (
    <ToastContext.Provider value={addToast}>
      <div>
        {visible.length > 1 && (
          <div
            className="flex gap-1 mb-4"
            role="tablist"
            aria-label="Broadcast views"
          >
            {visible.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => requestTabChange(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  tab === t.key
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {t.label}
                {t.key === "compose" && composeDirty && (
                  <span
                    className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle"
                    title="Unsent draft"
                  />
                )}
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
            onManageGroups={() => requestTabChange("groups")}
            onDirtyChange={setComposeDirty}
            onDone={(created) => {
              qc.invalidateQueries({
                queryKey: ["comm", "broadcasts", containerId],
              });
              setComposeDirty(false);
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

        <ToastHost toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Sent list
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ["all", "queued", "sending", "sent", "failed"] as const;

function SentList({
  containerId,
  onOpen,
}: {
  containerId: string;
  onOpen: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("all");

  const q = useQuery({
    queryKey: ["comm", "broadcasts", containerId],
    queryFn: () => commApi("GET", `/broadcasts?container_id=${containerId}`),
    // Keep polling while anything is in flight so status pills and delivery
    // counts update without the user having to switch tabs and back.
    refetchInterval: (query) => {
      const list = unwrapList<Broadcast>(query.state.data);
      const hasActive = list.some(
        (b) => b.send_status === "queued" || b.send_status === "sending",
      );
      return hasActive ? 4000 : false;
    },
  });
  const all = unwrapList<Broadcast>(q.data);

  const filtered = useMemo(() => {
    return all.filter((b) => {
      if (statusFilter !== "all" && b.send_status !== statusFilter)
        return false;
      if (
        search.trim() &&
        !b.title.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [all, search, statusFilter]);

  if (q.isLoading) return <SentListSkeleton />;

  if (q.isError)
    return (
      <div className="text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
        <span>Couldn't load broadcasts.</span>
        <button onClick={() => q.refetch()} className="text-xs underline">
          Retry
        </button>
      </div>
    );

  if (all.length === 0)
    return (
      <div className="text-center py-10">
        <p className="text-sm text-neutral-400 m-0">No broadcasts yet.</p>
        <p className="text-xs text-neutral-400 m-0 mt-1">
          Sent broadcasts and their delivery status will show up here.
        </p>
      </div>
    );

  return (
    <div className="space-y-3">
      {all.length > 5 && (
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            aria-label="Search broadcasts"
            className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])
            }
            aria-label="Filter by status"
            className="text-xs px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white capitalize"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No broadcasts match your filters.
        </p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {filtered.map((b, i) => (
            <button
              key={b.id}
              onClick={() => onOpen(b.id)}
              className={`w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
                i > 0
                  ? "border-t border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black dark:text-white truncate">
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
              {b.recipient_count > 0 && (
                <div className="mt-1.5 h-1 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      b.failed_count > 0 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (b.delivered_count / b.recipient_count) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SentListSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-pulse">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`px-4 py-3 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
        >
          <div className="h-3.5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800 mb-2" />
          <div className="h-2.5 w-2/3 rounded bg-neutral-100 dark:bg-neutral-900" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

const RECIPIENT_MODES: {
  key: "container" | "tree" | "group";
  label: string;
  broad?: boolean;
}[] = [
  { key: "container", label: "This container" },
  { key: "tree", label: "Container + sub-containers", broad: true },
  { key: "group", label: "A curated group" },
];

function BroadcastComposer({
  containerId,
  onDone,
  onManageGroups,
  onDirtyChange,
}: {
  containerId: string;
  onDone: (created?: Broadcast) => void;
  onManageGroups: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"container" | "tree" | "group">("container");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Requires an explicit second click before a wide-reach send actually fires.
  const [confirmingBroadSend, setConfirmingBroadSend] = useState(false);

  useEffect(() => {
    onDirtyChange(title.trim().length > 0 || body.trim().length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

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
    onSuccess: (created: Broadcast) => {
      toast("success", `"${title.trim()}" is sending.`);
      setTitle("");
      setBody("");
      setConfirmingBroadSend(false);
      onDone(created);
    },
    onError: (e: Error) => {
      setError(e.message);
      toast("error", "Couldn't send the broadcast. Try again.");
    },
  });

  const overLimit = title.length > TITLE_MAX || body.length > BODY_MAX;
  const canSend =
    title.trim() &&
    body.trim() &&
    !overLimit &&
    (mode !== "group" || groupId) &&
    !send.isPending;

  const handleSendClick = () => {
    const selectedMode = RECIPIENT_MODES.find((m) => m.key === mode);
    if (selectedMode?.broad && !confirmingBroadSend) {
      setConfirmingBroadSend(true);
      return;
    }
    send.mutate();
  };

  return (
    <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
      {error && (
        <p className="text-[11px] text-amber-600 m-0" role="alert">
          {error}
        </p>
      )}

      <div>
        <input
          autoFocus
          value={title}
          maxLength={TITLE_MAX + 20}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Broadcast title"
          aria-label="Broadcast title"
          className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-neutral-950 text-black dark:text-white ${
            title.length > TITLE_MAX
              ? "border-red-400 dark:border-red-700"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
        />
        <div className="flex justify-end mt-0.5">
          <span
            className={`text-[10px] ${title.length > TITLE_MAX ? "text-red-500" : "text-neutral-400"}`}
          >
            {title.length}/{TITLE_MAX}
          </span>
        </div>
      </div>

      <div>
        <textarea
          value={body}
          maxLength={BODY_MAX + 200}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message body"
          aria-label="Broadcast message body"
          rows={4}
          className={`w-full px-3 py-2 text-sm rounded-md border bg-white dark:bg-neutral-950 text-black dark:text-white ${
            body.length > BODY_MAX
              ? "border-red-400 dark:border-red-700"
              : "border-neutral-200 dark:border-neutral-800"
          }`}
        />
        <div className="flex justify-end mt-0.5">
          <span
            className={`text-[10px] ${body.length > BODY_MAX ? "text-red-500" : "text-neutral-400"}`}
          >
            {body.length}/{BODY_MAX}
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-500 block mb-1.5">Send to</label>
        <div className="flex gap-1.5 flex-wrap">
          {RECIPIENT_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key);
                setConfirmingBroadSend(false);
              }}
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
            aria-label="Recipient group"
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

      {confirmingBroadSend && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
          <p className="text-[11px] text-amber-800 dark:text-amber-300 m-0">
            This sends to every sub-container under this one. Everyone in the
            tree gets it — there's no undo once delivery starts.
          </p>
          <button
            onClick={() => setConfirmingBroadSend(false)}
            className="text-[11px] text-amber-700 dark:text-amber-400 underline whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSendClick}
          disabled={!canSend}
          aria-busy={send.isPending}
          className={`px-3 py-2 text-xs font-semibold rounded-md disabled:opacity-40 ${
            confirmingBroadSend
              ? "bg-amber-600 text-white"
              : "bg-black text-white dark:bg-white dark:text-black"
          }`}
        >
          {send.isPending
            ? "Sending…"
            : confirmingBroadSend
              ? "Confirm — send to entire tree"
              : "Send broadcast"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group manager
// ---------------------------------------------------------------------------

function BroadcastGroupManager({ containerId }: { containerId: string }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimer = useRef<number | null>(null);

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
      toast("success", `Group "${name.trim()}" created.`);
      setName("");
      q.refetch();
    },
    onError: () => toast("error", "Couldn't create the group. Try again."),
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
    onError: () => toast("error", "Couldn't add that member. Try again."),
  });

  const removeGroup = useMutation({
    mutationFn: (groupId: string) =>
      commApi("DELETE", `/broadcast-groups/${groupId}`, {
        container_id: containerId,
      }),
    onSuccess: (_data, groupId) => {
      const deleted = groups.find((g) => g.id === groupId);
      toast("success", `Deleted "${deleted?.name ?? "group"}".`);
      setConfirmDeleteId(null);
      q.refetch();
    },
    onError: () => {
      toast("error", "Couldn't delete the group. Try again.");
      setConfirmDeleteId(null);
    },
  });

  // A click elsewhere (or 4s of inaction) cancels a pending delete
  // confirmation so it never lingers armed by accident.
  const armDeleteConfirm = (groupId: string) => {
    setConfirmDeleteId(groupId);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    confirmTimer.current = window.setTimeout(() => {
      setConfirmDeleteId((cur) => (cur === groupId ? null : cur));
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    };
  }, []);

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
          aria-label="New recipient group name"
          className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
        />
        <button
          onClick={() => name.trim() && create.mutate()}
          disabled={!name.trim() || create.isPending}
          aria-busy={create.isPending}
          className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
        >
          {create.isPending ? "Creating…" : "Create"}
        </button>
      </div>

      {q.isLoading ? (
        <GroupListSkeleton />
      ) : q.isError ? (
        <div className="text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>Couldn't load groups.</span>
          <button onClick={() => q.refetch()} className="text-xs underline">
            Retry
          </button>
        </div>
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPicking(picking === g.id ? null : g.id)}
                    className="text-xs text-neutral-500 hover:text-black dark:hover:text-white underline"
                  >
                    {picking === g.id ? "Cancel" : "+ member"}
                  </button>
                  {confirmDeleteId === g.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Delete?</span>
                      <button
                        onClick={() => removeGroup.mutate(g.id)}
                        disabled={removeGroup.isPending}
                        aria-busy={removeGroup.isPending}
                        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
                      >
                        {removeGroup.isPending ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-neutral-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => armDeleteConfirm(g.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
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

function GroupListSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-pulse">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`px-4 py-3 ${i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""}`}
        >
          <div className="h-3.5 w-1/4 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

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
    refetchInterval: (query) => {
      const b = query.state.data as Broadcast | undefined;
      return b?.send_status === "queued" || b?.send_status === "sending"
        ? 4000
        : false;
    },
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

  const [recipientFilter, setRecipientFilter] = useState<
    "all" | BroadcastRecipient["status"]
  >("all");
  const visibleRecipients =
    recipientFilter === "all"
      ? recipients
      : recipients.filter((r) => r.status === recipientFilter);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onBack}
          aria-label="Back to sent list"
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
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-900" />
            <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-900" />
          </div>
        ) : q.isError ? (
          <div className="text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>Couldn't load this broadcast.</span>
            <button onClick={() => q.refetch()} className="text-xs underline">
              Retry
            </button>
          </div>
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
            {broadcast.recipient_count > 0 && (
              <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    broadcast.failed_count > 0
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (broadcast.delivered_count / broadcast.recipient_count) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            )}
          </>
        ) : null}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-neutral-500 m-0">
              Delivery status
            </p>
            {recipients.length > 5 && (
              <select
                value={recipientFilter}
                onChange={(e) =>
                  setRecipientFilter(
                    e.target.value as "all" | BroadcastRecipient["status"],
                  )
                }
                aria-label="Filter recipients by status"
                className="text-[11px] px-1.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
              >
                <option value="all">All</option>
                <option value="delivered">Delivered</option>
                <option value="delivering">Delivering</option>
                <option value="failed">Failed</option>
              </select>
            )}
          </div>
          {recipQ.isLoading ? (
            <div className="animate-pulse space-y-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-900"
                />
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-xs text-neutral-400">No recipients recorded.</p>
          ) : visibleRecipients.length === 0 ? (
            <p className="text-xs text-neutral-400">
              No recipients match this filter.
            </p>
          ) : (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-64 overflow-y-auto">
              {visibleRecipients.map((r, i) => (
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

// ---------------------------------------------------------------------------
// Pills
// ---------------------------------------------------------------------------

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

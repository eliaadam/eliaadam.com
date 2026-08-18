import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { commApi, unwrapList, type Group } from "./api";
import MessageThread from "./MessageThread";
import MemberPicker from "./MemberPicker";
import {
  Avatar,
  EmptyState,
  ErrorBanner,
  ListSkeleton,
  PlusIcon,
  SearchInput,
  UsersIcon,
  useDebouncedValue,
} from "./commShared";

export default function GroupsPanel({
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
  const [createError, setCreateError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);

  const q = useQuery({
    queryKey: ["comm", "groups", containerId],
    queryFn: () => commApi("GET", "/groups"),
  });
  const groups = unwrapList<Group>(q.data);

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(term));
  }, [groups, debouncedQuery]);

  const create = useMutation({
    mutationFn: () =>
      commApi("POST", "/groups", { name: name.trim(), container_id: containerId }),
    onSuccess: (created: Group) => {
      setCreating(false);
      setName("");
      setCreateError(null);
      qc.invalidateQueries({ queryKey: ["comm", "groups", containerId] });
      if (created?.id) setOpenId(created.id);
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  if (openId) {
    const g = groups.find((x) => x.id === openId);
    if (!g) return null;
    return (
      <div>
        <MessageThread
          title={g.name}
          subtitle={`${g.participants.length} member${g.participants.length === 1 ? "" : "s"}`}
          messagesPath={`/groups/${openId}/messages`}
          sendPath={`/groups/${openId}/messages`}
          readPath={`/groups/${openId}/read`}
          reactPathPrefix="/messages/group"
          queryKey={["comm", "group-messages", openId]}
          canSend={permissions.includes("system.communications.group.message.send")}
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
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search groups…" />
        </div>
        {can("system.communications.group.create") && (
          <button
            onClick={() => setCreating(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition"
          >
            <PlusIcon />
            New group
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
          {createError && <ErrorBanner message={createError} />}
          <div className="flex gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) create.mutate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Group name"
              className="flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
            />
            <button
              onClick={() => name.trim() && create.mutate()}
              disabled={create.isPending || !name.trim()}
              className="px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setCreateError(null);
              }}
              className="px-3 py-2 text-xs text-neutral-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorBanner message="Couldn't load groups." onRetry={() => q.refetch()} />
      ) : filtered.length === 0 && debouncedQuery ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No matches"
          description={`Nothing matches "${debouncedQuery}".`}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon />}
          title="No groups yet"
          description="Bring people together in a shared conversation."
          action={
            can("system.communications.group.create") && (
              <button
                onClick={() => setCreating(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
              >
                + New group
              </button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {filtered.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setOpenId(g.id)}
              className={`w-full flex items-center gap-3 text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
                i > 0 ? "border-t border-neutral-200 dark:border-neutral-800" : ""
              }`}
            >
              <Avatar name={g.name} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-black dark:text-white truncate block">
                  {g.name}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {g.participants.length} member{g.participants.length === 1 ? "" : "s"}
                </span>
              </div>
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
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const addParticipant = useMutation({
    mutationFn: (actorId: string) =>
      commApi("POST", `/groups/${group.id}/participants`, { actor_id: actorId }),
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
    onSuccess: () => {
      setConfirmRemoveId(null);
      onChanged();
    },
    onError: (e: Error) => setError(e.message),
  });
  const promote = useMutation({
    mutationFn: (actorId: string) =>
      commApi("POST", `/groups/${group.id}/participants/${actorId}/promote`),
    onSuccess: onChanged,
    onError: (e: Error) => setError(e.message),
  });

  const sortedParticipants = useMemo(() => {
    const rank = (r: string) => (r === "super_admin" ? 0 : r === "admin" ? 1 : 2);
    return [...group.participants].sort((a, b) => rank(a.role) - rank(b.role));
  }, [group.participants]);

  return (
    <div className="mt-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 m-0">
          Members ({group.participants.length})
        </p>
        {canManage && (
          <button
            onClick={() => setAdding((v) => !v)}
            className="text-xs text-neutral-500 hover:text-black dark:hover:text-white underline"
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>
      {error && <ErrorBanner message={error} />}
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
        {sortedParticipants.map((p) => (
          <div key={p.actor_id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={p.name} size="sm" />
              <span className="text-xs text-black dark:text-white truncate">{p.name}</span>
              {p.role !== "member" && (
                <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">
                  {p.role.replace("_", " ")}
                </span>
              )}
            </div>
            {canManage && p.role !== "super_admin" && (
              <div className="flex items-center gap-2 shrink-0">
                {p.role === "member" && (
                  <button
                    onClick={() => promote.mutate(p.actor_id)}
                    disabled={promote.isPending}
                    className="text-[11px] text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    Promote
                  </button>
                )}
                {confirmRemoveId === p.actor_id ? (
                  <span className="flex items-center gap-1">
                    <button
                      onClick={() => removeParticipant.mutate(p.actor_id)}
                      disabled={removeParticipant.isPending}
                      className="text-[11px] font-semibold text-red-500"
                    >
                      Confirm?
                    </button>
                    <button
                      onClick={() => setConfirmRemoveId(null)}
                      className="text-[11px] text-neutral-400"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(p.actor_id)}
                    className="text-[11px] text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

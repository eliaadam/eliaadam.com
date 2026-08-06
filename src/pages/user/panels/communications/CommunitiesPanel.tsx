import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commApi, unwrapList, type Community } from "./api";
import MemberPicker from "./MemberPicker";
 

/*
 * UX changes from the original inline version:
 *  - Creating a community drops you straight into it instead of leaving you
 *    to find it in the list and click it — you were about to look at it
 *    anyway (add members, check groups, etc).
 *  - Public communities get a one-click "Join" right on the list row, so
 *    joining doesn't require opening the detail view first.
 */

export default function CommunitiesPanel({
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
  const [isPublic, setIsPublic] = useState(false);

  const q = useQuery({
    queryKey: ["comm", "communities"],
    // Public discovery is not container-scoped server-side (listPublic() has
    // no container filter) — this lists every public community, not just
    // this container's. There's currently no "communities I'm a member of"
    // endpoint to show private ones you already belong to.
    queryFn: () => commApi("GET", "/communities?per_page=25"),
  });
  const communities = unwrapList<Community>(q.data);

  const create = useMutation({
    mutationFn: () =>
      commApi("POST", "/communities", {
        name: name.trim(),
        container_id: containerId,
        is_public: isPublic,
      }),
    onSuccess: (created: Community) => {
      setCreating(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["comm", "communities"] });
      // You just made this — go straight in rather than making them find it.
      if (created?.id) setOpenId(created.id);
    },
  });

  if (openId) {
    return (
      <CommunityDetail
        id={openId}
        containerId={containerId}
        permissions={permissions}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div>
      {can("system.communications.community.create") && (
        <div className="mb-4">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
            >
              + New community
            </button>
          ) : (
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) create.mutate();
                  }}
                  placeholder="Community name"
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
              <label className="flex items-center gap-2 text-[11px] text-neutral-500">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Discoverable / public
              </label>
            </div>
          )}
        </div>
      )}

      {q.isLoading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : communities.length === 0 ? (
        <p className="text-sm text-neutral-400">No communities yet.</p>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {communities.map((c, i) => (
            <CommunityRow
              key={c.id}
              community={c}
              isFirst={i === 0}
              onOpen={() => setOpenId(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityRow({
  community: c,
  isFirst,
  onOpen,
}: {
  community: Community;
  isFirst: boolean;
  onOpen: () => void;
}) {
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const join = useMutation({
    mutationFn: () => commApi("POST", `/communities/${c.id}/join`),
    onSuccess: () => setJoined(true),
    onError: (e: Error) => setJoinError(e.message),
  });

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition ${
        isFirst ? "" : "border-t border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left"
        title={joinError ?? undefined}
      >
        <span className="text-sm font-medium text-black dark:text-white">
          {c.name}
        </span>
        {c.is_public && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 ml-2">
            public
          </span>
        )}
        {typeof c.members_count === "number" && (
          <span className="text-[11px] text-neutral-400 ml-2">
            {c.members_count} members
          </span>
        )}
      </button>

      {c.is_public && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            join.mutate();
          }}
          disabled={join.isPending || joined}
          className="shrink-0 text-[11px] px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-black dark:hover:border-white disabled:opacity-50"
        >
          {joined ? "Joined ✓" : join.isPending ? "Joining…" : "Join"}
        </button>
      )}
    </div>
  );
}

function CommunityDetail({
  id,
  containerId,
  permissions,
  onBack,
}: {
  id: string;
  containerId: string;
  permissions: string[];
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const can = (c: string) => permissions.includes(c);
  const [addingMember, setAddingMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["comm", "community", id],
    queryFn: () => commApi("GET", `/communities/${id}`),
  });
  const community: Community | undefined = q.data;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["comm", "community", id] });

  const join = useMutation({
    mutationFn: () => commApi("POST", `/communities/${id}/join`),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });
  const addMember = useMutation({
    mutationFn: (actorId: string) =>
      commApi("POST", `/communities/${id}/members`, { actor_id: actorId }),
    onSuccess: () => {
      setAddingMember(false);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={onBack}
          className="text-neutral-400 hover:text-black dark:hover:text-white text-sm"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-black dark:text-white m-0 truncate">
          {community?.name ?? "Community"}
        </p>
        {community?.is_public && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500">
            public
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {error && <p className="text-[11px] text-amber-600 m-0">{error}</p>}

        {q.isLoading ? (
          <p className="text-sm text-neutral-400">Loading…</p>
        ) : community ? (
          <>
            {community.description && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 m-0">
                {community.description}
              </p>
            )}

            {community.is_public && (
              <button
                onClick={() => join.mutate()}
                disabled={join.isPending}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                {join.isPending ? "Joining…" : "Join community"}
              </button>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-neutral-500 m-0">
                  Members ({community.members?.length ?? 0})
                </p>
                {can("system.communications.community.member.manage") && (
                  <button
                    onClick={() => setAddingMember((v) => !v)}
                    className="text-xs text-neutral-500 underline"
                  >
                    {addingMember ? "Cancel" : "+ Add"}
                  </button>
                )}
              </div>
              {addingMember && (
                <div className="mb-2">
                  <MemberPicker
                    containerId={containerId}
                    onPick={(actorId) => addMember.mutate(actorId)}
                    onCancel={() => setAddingMember(false)}
                  />
                </div>
              )}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(community.members ?? []).map((m) => (
                  <div
                    key={m.actor_id}
                    className="text-xs text-neutral-600 dark:text-neutral-400"
                  >
                    {m.actor_id}{" "}
                    <span className="text-neutral-400">· {m.role}</span>
                  </div>
                ))}
              </div>
            </div>

            {community.groups && community.groups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-2">
                  Groups in this community
                </p>
                <div className="space-y-1">
                  {community.groups.map((cg) => (
                    <div
                      key={cg.id}
                      className="text-xs text-neutral-600 dark:text-neutral-400"
                    >
                      {cg.group?.name ?? cg.group_id}
                      {cg.is_announcement_channel && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900">
                          announcements
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  ContentGroup,
  ContentItem,
} from "../../../lib/sdk/domains/content";
import {
  cardClass,
  errorMessage,
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./ui";

/** Flat list in, nested tree out — the backend only ever returns a
 * flat list of groups with parent_group_id pointers; building the
 * tree for display is this component's job, not the API's. */
function buildTree(groups: ContentGroup[]): Map<string | null, ContentGroup[]> {
  const byParent = new Map<string | null, ContentGroup[]>();
  for (const g of groups) {
    const key = g.parent_group_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(g);
  }
  for (const list of byParent.values())
    list.sort((a, b) => a.position - b.position);
  return byParent;
}

export function GroupsTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: allGroups, isLoading } = useQuery({
    queryKey: ["content-groups", containerId],
    queryFn: () => sdk.content.groups(containerId).list(),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [parentGroupId, setParentGroupId] = useState("");

  const tree = useMemo(() => buildTree(allGroups ?? []), [allGroups]);
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-groups", containerId],
    });
  const create = useMutation({
    mutationFn: () =>
      sdk.content
        .groups(containerId)
        .create({
          name: name.trim(),
          parent_group_id: parentGroupId || undefined,
        }),
    onSuccess: (g) => {
      setName("");
      invalidate();
      setSelected(g.id);
    },
  });

  function renderNode(group: ContentGroup, depth: number) {
    const children = tree.get(group.id) ?? [];
    return (
      <div key={group.id}>
        <button
          type="button"
          onClick={() => setSelected(group.id)}
          style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
          className={`block w-full border-b border-neutral-100 py-2 pr-3 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === group.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
        >
          {depth > 0 && (
            <span className="mr-1 text-neutral-300 dark:text-neutral-700">
              └
            </span>
          )}
          {group.name}
          {group.slug && (
            <span className="ml-2 font-mono text-xs text-neutral-400">
              /{group.slug}
            </span>
          )}
        </button>
        {children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
      <div>
        <div className={cardClass}>
          {isLoading && (
            <p className="p-3 text-sm text-neutral-500">Loading…</p>
          )}
          {allGroups?.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">No groups yet.</p>
          )}
          {(tree.get(null) ?? []).map((g) => renderNode(g, 0))}
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New group</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Getting Started, Season 2…"
              />
            </div>
            <div>
              <label className={labelClass}>Parent group (optional)</label>
              <select
                className={inputClass}
                value={parentGroupId}
                onChange={(e) => setParentGroupId(e.target.value)}
              >
                <option value="">None — root group</option>
                {allGroups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`w-full ${primaryButtonClass}`}
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create group"}
            </button>
            {create.isError && (
              <p className={errorTextClass}>
                {errorMessage(create.error, "Couldn't create the group.")}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {selected && (
          <GroupDetail
            containerId={containerId}
            groupId={selected}
            allGroups={allGroups ?? []}
            onDeleted={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

function GroupDetail({
  containerId,
  groupId,
  allGroups,
  onDeleted,
}: {
  containerId: string;
  groupId: string;
  allGroups: ContentGroup[];
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: group } = useQuery({
    queryKey: ["content-group", containerId, groupId],
    queryFn: () => sdk.content.groups(containerId).get(groupId),
  });
  const { data: members } = useQuery({
    queryKey: ["content-group-members", containerId, groupId],
    queryFn: () => sdk.content.groups(containerId).members(groupId),
  });
  const { data: allContent } = useQuery({
    queryKey: ["content-list", containerId, ""],
    queryFn: () => sdk.content.content(containerId).list(),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentGroupId, setParentGroupId] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);
  const [contentId, setContentId] = useState("");

  if (group && loaded !== group.id) {
    setName(group.name);
    setSlug(group.slug ?? "");
    setDescription(group.description);
    setParentGroupId(group.parent_group_id ?? "");
    setLoaded(group.id);
  }

  const invalidateGroups = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-groups", containerId],
    });
  const invalidateMembers = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-group-members", containerId, groupId],
    });

  const save = useMutation({
    mutationFn: () =>
      sdk.content.groups(containerId).update(groupId, {
        name: name.trim(),
        slug: slug.trim() || null,
        description,
        parent_group_id: parentGroupId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["content-group", containerId, groupId],
      });
      invalidateGroups();
    },
  });
  const remove = useMutation({
    mutationFn: () => sdk.content.groups(containerId).delete(groupId),
    onSuccess: () => {
      invalidateGroups();
      onDeleted();
    },
  });
  const addMember = useMutation({
    mutationFn: () =>
      sdk.content
        .groups(containerId)
        .addMember(groupId, contentId, members?.length ?? 0),
    onSuccess: () => {
      setContentId("");
      invalidateMembers();
    },
  });
  const removeMember = useMutation({
    mutationFn: (cid: string) =>
      sdk.content.groups(containerId).removeMember(groupId, cid),
    onSuccess: invalidateMembers,
  });

  if (!group) return <p className="text-sm text-neutral-500">Loading…</p>;

  const availableContent = (allContent ?? []).filter(
    (c: ContentItem) => !members?.some((m) => m.content_id === c.id),
  );
  const otherGroups = allGroups.filter((g) => g.id !== groupId);

  return (
    <div className="space-y-4">
      <div className={`${cardClass} space-y-2.5 p-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Group details</h3>
          <button
            type="button"
            className={errorTextClass + " hover:underline"}
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Delete group
          </button>
        </div>
        {remove.isError && (
          <p className={errorTextClass}>
            {errorMessage(
              remove.error,
              "Couldn't delete — it may still have child groups.",
            )}
          </p>
        )}
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Slug (for a public group page)</label>
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="season-2"
            />
          </div>
          <div>
            <label className={labelClass}>Parent group</label>
            <select
              className={inputClass}
              value={parentGroupId}
              onChange={(e) => setParentGroupId(e.target.value)}
            >
              <option value="">None — root group</option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={`${inputClass} min-h-[3rem]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!name.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        {save.isError && (
          <p className={errorTextClass}>
            {errorMessage(
              save.error,
              "Couldn't save — check this doesn't create a cycle.",
            )}
          </p>
        )}
      </div>

      <div className={cardClass}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Content</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {members?.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                  No content in this group yet.
                </td>
              </tr>
            )}
            {members?.map((m) => (
              <tr
                key={m.membership_id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
              >
                <td className="px-3 py-2 text-neutral-500">{m.position}</td>
                <td className="px-3 py-2">{m.title}</td>
                <td className="px-3 py-2 text-neutral-500">
                  {m.status}
                  {m.visibility === "public" && m.status === "published"
                    ? " · public"
                    : ""}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.content_id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-end gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex-1">
            <label className={labelClass}>Add content</label>
            <select
              className={inputClass}
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
            >
              <option value="">Choose content…</option>
              {availableContent.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!contentId || addMember.isPending}
            onClick={() => addMember.mutate()}
          >
            Add
          </button>
        </div>
        {addMember.isError && (
          <p className={`px-3 pb-3 ${errorTextClass}`}>
            {errorMessage(addMember.error, "Couldn't add that content.")}
          </p>
        )}
      </div>
    </div>
  );
}

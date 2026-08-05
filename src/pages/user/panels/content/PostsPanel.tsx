import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi as api } from "./content-api";
import LinkIcon from "./LinkIcon";
import { renderMarkdown } from "./markdown";

type Post = {
  id: string; post_type: string; title: string; excerpt: string | null;
  body_markdown: string | null; cover_image_url: string | null; status: string;
  monetizable: boolean; price: number; currency: string;
  links?: { id: string; label: string; url: string; type: string; icon: string; description: string | null }[];
};
type Link = { id: string; label: string; type: string; icon: string };

const POST_TYPES = ["article", "blog", "news", "paper", "announcement"];

/** Posts — list, write (markdown + media + links), publish. */
export default function PostsPanel({ containerId, permissions }: { containerId: string; permissions: string[] }) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const canManage = can("system.content.post.manage");
  const canPublish = can("system.content.post.publish");

  const posts = useQuery({ queryKey: ["content", "posts", containerId], queryFn: () => api("GET", `/containers/${containerId}/posts`) });
  const list: Post[] = Array.isArray(posts.data) ? posts.data : [];

  if (editing) {
    return <PostEditor containerId={containerId} postId={editing === "new" ? null : editing} canPublish={canPublish}
      onClose={() => setEditing(null)}
      onSaved={() => { qc.invalidateQueries({ queryKey: ["content", "posts", containerId] }); }} />;
  }

  return (
    <div className="p-4 space-y-4">
      {canManage && (
        <button onClick={() => setEditing("new")} className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black">+ New post</button>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {posts.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">No posts yet. Write your first article, news item, or paper.</div>
        ) : (
          list.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {p.title}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{p.post_type}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.status === "published" ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}>{p.status}</span>
                  {p.monetizable && <span className="text-[10px] text-green-600">for sale</span>}
                </div>
                {p.excerpt && <div className="text-[11px] text-neutral-400 mt-0.5">{p.excerpt}</div>}
              </div>
              {canManage && <button onClick={() => setEditing(p.id)} className="px-2 py-1 text-[11px] rounded border border-neutral-300 dark:border-neutral-700">Edit</button>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PostEditor({ containerId, postId, canPublish, onClose, onSaved }: { containerId: string; postId: string | null; canPublish: boolean; onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const isNew = postId === null;

  const existing = useQuery({
    queryKey: ["content", "post", containerId, postId],
    queryFn: () => api("GET", `/containers/${containerId}/posts/${postId}`),
    enabled: !isNew,
  });
  const links = useQuery({ queryKey: ["content", "links", containerId], queryFn: () => api("GET", `/containers/${containerId}/links`) });

  const p: Partial<Post> = existing.data ?? {};
  const [title, setTitle] = useState(p.title ?? "");
  const [postType, setPostType] = useState(p.post_type ?? "article");
  const [excerpt, setExcerpt] = useState(p.excerpt ?? "");
  const [body, setBody] = useState(p.body_markdown ?? "");
  const [cover, setCover] = useState(p.cover_image_url ?? "");
  const [monetizable, setMonetizable] = useState(p.monetizable ?? false);
  const [price, setPrice] = useState(String((p.price ?? 0) / 100));
  const [linkIds, setLinkIds] = useState<string[]>((p.links ?? []).map((l) => l.id));
  const [preview, setPreview] = useState(false);

  // Re-init from loaded data once.
  const loaded = !isNew && existing.isSuccess;
  useState(() => {
    if (loaded && p.title) {
      setTitle(p.title ?? ""); setPostType(p.post_type ?? "article"); setExcerpt(p.excerpt ?? "");
      setBody(p.body_markdown ?? ""); setCover(p.cover_image_url ?? ""); setMonetizable(p.monetizable ?? false);
      setPrice(String((p.price ?? 0) / 100)); setLinkIds((p.links ?? []).map((l) => l.id));
    }
  });

  const linkList: Link[] = Array.isArray(links.data) ? links.data : [];

  const payload = () => ({
    title: title.trim(), post_type: postType, excerpt: excerpt.trim() || null,
    body_markdown: body, cover_image_url: cover.trim() || null,
    monetizable, price: Math.round(parseFloat(price || "0") * 100), link_ids: linkIds,
  });

  const save = useMutation({
    mutationFn: () => isNew
      ? api("POST", `/containers/${containerId}/posts`, payload())
      : api("PATCH", `/containers/${containerId}/posts/${postId}`, payload()),
    onSuccess: (data: any) => { onSaved(); if (isNew && data?.id) { /* stay in editor */ } },
  });

  const publish = useMutation({
    mutationFn: (id: string) => api("POST", `/containers/${containerId}/posts/${id}/publish`),
    onSuccess: () => { onSaved(); qc.invalidateQueries({ queryKey: ["content", "post", containerId, postId] }); },
  });

  const toggleLink = (id: string) => setLinkIds(linkIds.includes(id) ? linkIds.filter((x) => x !== id) : [...linkIds, id]);
  const input = "px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="p-4 space-y-3 max-w-3xl">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs text-neutral-500">← Back</button>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)} className="px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700">{preview ? "Edit" : "Preview"}</button>
          <button onClick={() => save.mutate()} disabled={!title.trim() || save.isPending} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40">{save.isPending ? "Saving…" : "Save"}</button>
          {!isNew && canPublish && p.status !== "published" && (
            <button onClick={() => publish.mutate(postId!)} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white">Publish</button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={`${input} flex-1`} />
        <select value={postType} onChange={(e) => setPostType(e.target.value)} className={input}>
          {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Excerpt (short summary)" className={`${input} w-full`} />
      <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Cover image URL (optional)" className={`${input} w-full`} />

      {preview ? (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-4 prose prose-sm dark:prose-invert max-w-none">
          {cover && <img src={cover} alt="" className="rounded-md mb-3 max-h-56 object-cover" />}
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        </div>
      ) : (
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write in markdown…  ![alt](https://image-url)  embeds media by URL." rows={16} className={`${input} w-full font-mono text-xs`} />
      )}

      {/* Attach links from the library */}
      <div>
        <div className="text-[11px] font-medium text-neutral-500 mb-1">Attached links</div>
        <div className="flex flex-wrap gap-1.5">
          {linkList.length === 0 ? (
            <span className="text-[11px] text-neutral-400">No links in the library yet — add some in the Links tab.</span>
          ) : linkList.map((l) => (
            <button key={l.id} type="button" onClick={() => toggleLink(l.id)}
              className={`text-[11px] px-2 py-1 rounded-full border flex items-center gap-1 ${linkIds.includes(l.id) ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}>
              <LinkIcon name={l.icon} size={12} />{l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sale settings */}
      <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
        <input type="checkbox" checked={monetizable} onChange={(e) => setMonetizable(e.target.checked)} />
        Sell this on the marketplace
      </label>
      {monetizable && (
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder="Price" className={`${input} w-40`} />
      )}
      {save.isError && <div className="text-xs text-red-600">{(save.error as any)?.message}</div>}
    </div>
  );
}

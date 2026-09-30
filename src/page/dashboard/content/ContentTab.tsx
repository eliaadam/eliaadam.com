import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import type {
  ContentFormat,
  ContentItem,
  ContentStatus,
  ContentType,
  ContentVisibility,
  MediaKind,
} from "../../../lib/sdk/domains/content";
import {
  badgeClass,
  cardClass,
  errorMessage,
  errorTextClass,
  formatDateTime,
  inputClass,
  labelClass,
  pillTabClass,
  primaryButtonClass,
  secondaryButtonClass,
  StatusBadge,
} from "./ui";

type SubTab =
  | "edit"
  | "blocks"
  | "media"
  | "links"
  | "embeds"
  | "references"
  | "versions";

export function ContentTab({ containerId }: { containerId: string }) {
  const queryClient = useQueryClient();
  const { data: types } = useQuery({
    queryKey: ["content-types", containerId],
    queryFn: () => sdk.content.contentTypes(containerId).list(true),
  });
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const { data: items, isLoading } = useQuery({
    queryKey: ["content-list", containerId, statusFilter],
    queryFn: () =>
      sdk.content
        .content(containerId)
        .list(statusFilter ? { status: statusFilter } : undefined),
  });
  const [selected, setSelected] = useState<string | null>(null);

  const [contentTypeId, setContentTypeId] = useState("");
  const [title, setTitle] = useState("");
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: ["content-list", containerId] });
  const create = useMutation({
    mutationFn: () =>
      sdk.content
        .content(containerId)
        .create({ content_type_id: contentTypeId, title: title.trim() }),
    onSuccess: (c) => {
      setTitle("");
      invalidateList();
      setSelected(c.id);
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div>
        <select
          className={inputClass}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ContentStatus | "")
          }
        >
          <option value="">All statuses</option>
          {(
            ["draft", "in_review", "published", "archived"] as ContentStatus[]
          ).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <div className={`mt-2 ${cardClass}`}>
          {isLoading && (
            <p className="p-3 text-sm text-neutral-500">Loading…</p>
          )}
          {items?.length === 0 && (
            <p className="p-3 text-sm text-neutral-500">No content yet.</p>
          )}
          {items?.map((c: ContentItem) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`block w-full border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-900/60 ${selected === c.id ? "bg-neutral-50 dark:bg-neutral-900/60" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{c.title}</span>
                <StatusBadge status={c.status} />
              </div>
              {c.slug && (
                <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-neutral-500">
                  {c.status === "published" && c.visibility === "public" && (
                    <span title="Has a live public link">🔗</span>
                  )}
                  /{c.slug}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className={`mt-4 ${cardClass} p-4`}>
          <h3 className="text-sm font-semibold">New content</h3>
          <div className="mt-3 space-y-2.5">
            <div>
              <label className={labelClass}>Content type</label>
              <select
                className={inputClass}
                value={contentTypeId}
                onChange={(e) => setContentTypeId(e.target.value)}
              >
                <option value="">Choose a type…</option>
                {types?.map((t: ContentType) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`w-full ${primaryButtonClass}`}
              disabled={!contentTypeId || !title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create content"}
            </button>
            {create.isError && (
              <p className={errorTextClass}>
                {errorMessage(create.error, "Couldn't create this content.")}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        {selected && (
          <ContentDetail
            containerId={containerId}
            contentId={selected}
            types={types ?? []}
            onListChanged={invalidateList}
          />
        )}
      </div>
    </div>
  );
}

function ContentDetail({
  containerId,
  contentId,
  types,
  onListChanged,
}: {
  containerId: string;
  contentId: string;
  types: ContentType[];
  onListChanged: () => void;
}) {
  const [sub, setSub] = useState<SubTab>("edit");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["edit", "Edit"],
            ["blocks", "Blocks"],
            ["media", "Media"],
            ["links", "Links"],
            ["embeds", "Embeds"],
            ["references", "References"],
            ["versions", "Versions"],
          ] as [SubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={pillTabClass(sub === key)}
            onClick={() => setSub(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {sub === "edit" && (
          <EditPanel
            containerId={containerId}
            contentId={contentId}
            types={types}
            onListChanged={onListChanged}
          />
        )}
        {sub === "blocks" && (
          <BlocksPanel containerId={containerId} contentId={contentId} />
        )}
        {sub === "media" && (
          <MediaPanel containerId={containerId} contentId={contentId} />
        )}
        {sub === "links" && (
          <LinksPanel containerId={containerId} contentId={contentId} />
        )}
        {sub === "embeds" && (
          <EmbedsPanel containerId={containerId} contentId={contentId} />
        )}
        {sub === "references" && (
          <ReferencesPanel containerId={containerId} contentId={contentId} />
        )}
        {sub === "versions" && (
          <VersionsPanel containerId={containerId} contentId={contentId} />
        )}
      </div>
    </div>
  );
}

// -- Public link -----------------------------------------------------------------------------

function PublicLinkBanner({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // link is still selectable text, so this isn't fatal.
    }
  };

  return (
    <div className={`${cardClass} flex items-center justify-between gap-3 p-3`}>
      <div className="min-w-0">
        <div className={labelClass}>Public link</div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {url}
        </a>
      </div>
      <button type="button" className={secondaryButtonClass} onClick={copy}>
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}

// -- Edit + lifecycle ---------------------------------------------------------------------

function EditPanel({
  containerId,
  contentId,
  types,
  onListChanged,
}: {
  containerId: string;
  contentId: string;
  types: ContentType[];
  onListChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: c } = useQuery({
    queryKey: ["content-item", containerId, contentId],
    queryFn: () => sdk.content.content(containerId).get(contentId),
  });
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [format, setFormat] = useState<ContentFormat>("markdown");
  const [visibility, setVisibility] = useState<ContentVisibility>("container");
  const [slug, setSlug] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (c && !loaded) {
    setTitle(c.title);
    setSummary(c.summary);
    setBody(c.body);
    setFormat(c.format);
    setVisibility(c.visibility);
    setSlug(c.slug ?? "");
    setLoaded(true);
  }

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["content-item", containerId, contentId],
    });
    onListChanged();
  };
  const save = useMutation({
    mutationFn: () =>
      sdk.content.content(containerId).update(contentId, {
        title: title.trim(),
        summary,
        body,
        format,
        visibility,
        slug: slug.trim() || undefined,
        content_type_id: c?.content_type_id,
      }),
    onSuccess: invalidate,
  });
  const submitForReview = useMutation({
    mutationFn: () =>
      sdk.content.content(containerId).submitForReview(contentId),
    onSuccess: invalidate,
  });
  const sendBack = useMutation({
    mutationFn: () => sdk.content.content(containerId).sendBack(contentId),
    onSuccess: invalidate,
  });
  const publish = useMutation({
    mutationFn: () => sdk.content.content(containerId).publish(contentId),
    onSuccess: invalidate,
  });
  const unpublish = useMutation({
    mutationFn: () => sdk.content.content(containerId).unpublish(contentId),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: () => sdk.content.content(containerId).archive(contentId),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: () => sdk.content.content(containerId).restore(contentId),
    onSuccess: invalidate,
  });

  if (!c) return <p className="text-sm text-neutral-500">Loading…</p>;

  const publicUrl =
    c.status === "published" && c.visibility === "public" && c.slug
      ? `${window.location.origin}/c/${containerId}/${c.slug}`
      : null;

  return (
    <div className="space-y-4">
      {publicUrl && <PublicLinkBanner url={publicUrl} />}
      <div
        className={`${cardClass} flex flex-wrap items-center justify-between gap-2 p-3`}
      >
        <StatusBadge status={c.status} />
        <div className="flex flex-wrap gap-1.5">
          {c.status === "draft" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={submitForReview.isPending}
              onClick={() => submitForReview.mutate()}
            >
              Submit for review
            </button>
          )}
          {c.status === "in_review" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={sendBack.isPending}
              onClick={() => sendBack.mutate()}
            >
              Send back to draft
            </button>
          )}
          {(c.status === "draft" ||
            c.status === "in_review" ||
            c.status === "published") && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={publish.isPending}
              onClick={() => publish.mutate()}
            >
              {c.status === "published" ? "Publish new edits" : "Publish"}
            </button>
          )}
          {c.status === "published" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={unpublish.isPending}
              onClick={() => unpublish.mutate()}
            >
              Unpublish
            </button>
          )}
          {c.status !== "archived" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={archive.isPending}
              onClick={() => archive.mutate()}
            >
              Archive
            </button>
          )}
          {c.status === "archived" && (
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={restore.isPending}
              onClick={() => restore.mutate()}
            >
              Restore to draft
            </button>
          )}
        </div>
      </div>
      {(publish.isError ||
        submitForReview.isError ||
        sendBack.isError ||
        unpublish.isError ||
        archive.isError ||
        restore.isError) && (
        <p className={errorTextClass}>
          {errorMessage(
            publish.error ??
              submitForReview.error ??
              sendBack.error ??
              unpublish.error ??
              archive.error ??
              restore.error,
            "That action didn't go through.",
          )}
        </p>
      )}

      <div className={`${cardClass} space-y-2.5 p-4`}>
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>
              Slug{" "}
              {c.status === "published" && (
                <span className="text-neutral-400">(required to publish)</span>
              )}
            </label>
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-article-title"
            />
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select
              className={inputClass}
              value={format}
              onChange={(e) => setFormat(e.target.value as ContentFormat)}
            >
              {(
                [
                  "markdown",
                  "html",
                  "rich_text",
                  "structured",
                  "plain_text",
                  "custom",
                ] as ContentFormat[]
              ).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Visibility</label>
          <select
            className={inputClass}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as ContentVisibility)}
          >
            <option value="private">Private — only you</option>
            <option value="container">
              Container — anyone with view access
            </option>
            <option value="public">
              Public — world-readable once published
            </option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Summary</label>
          <textarea
            className={`${inputClass} min-h-[3rem]`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Body ({format})</label>
          <textarea
            className={`${inputClass} min-h-[16rem] font-mono text-xs`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <p className="text-xs text-neutral-500">
          Editing never changes what's publicly visible — only "Publish" does
          that.
        </p>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!title.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving…" : "Save draft"}
        </button>
        {save.isError && (
          <p className={errorTextClass}>
            {errorMessage(save.error, "Couldn't save.")}
          </p>
        )}
      </div>
    </div>
  );
}

// -- Blocks --------------------------------------------------------------------------------

function BlocksPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const { data: blocks } = useQuery({
    queryKey: ["content-blocks", containerId, contentId],
    queryFn: () => sdk.content.blocks(containerId).list(contentId),
  });
  const [blockType, setBlockType] = useState("paragraph");
  const [payloadText, setPayloadText] = useState('{"text": ""}');
  const [payloadError, setPayloadError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-blocks", containerId, contentId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.content.blocks(containerId).add(contentId, {
        position: blocks?.length ?? 0,
        block_type: blockType.trim(),
        payload: JSON.parse(payloadText),
      }),
    onSuccess: () => {
      setPayloadText('{"text": ""}');
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.content.blocks(containerId).remove(id),
    onSuccess: invalidate,
  });

  const onAdd = () => {
    setPayloadError(null);
    try {
      JSON.parse(payloadText);
    } catch {
      setPayloadError("Payload must be valid JSON.");
      return;
    }
    add.mutate();
  };

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Payload</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {blocks?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                No blocks yet.
              </td>
            </tr>
          )}
          {blocks?.map((b) => (
            <tr
              key={b.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 text-neutral-500">{b.position}</td>
              <td className="px-3 py-2 font-mono text-xs">{b.block_type}</td>
              <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-neutral-500">
                {JSON.stringify(b.payload)}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(b.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-end gap-2">
          <div className="w-40">
            <label className={labelClass}>Block type</label>
            <input
              className={inputClass}
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              placeholder="paragraph, heading, quote…"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Payload (JSON)</label>
          <textarea
            className={`${inputClass} min-h-[4rem] font-mono text-xs`}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!blockType.trim() || add.isPending}
          onClick={onAdd}
        >
          Add block
        </button>
        {(payloadError || add.isError) && (
          <p className={errorTextClass}>
            {payloadError ??
              errorMessage(add.error, "Couldn't add that block.")}
          </p>
        )}
      </div>
    </div>
  );
}

// -- Media ------------------------------------------------------------------------------------

function MediaPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const { data: mediaItems } = useQuery({
    queryKey: ["content-media", containerId, contentId],
    queryFn: () => sdk.content.media(containerId).list(contentId),
  });
  const [documentId, setDocumentId] = useState("");
  const [kind, setKind] = useState<MediaKind>("image");
  const [caption, setCaption] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-media", containerId, contentId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.content.media(containerId).add(contentId, {
        document_id: documentId.trim(),
        kind,
        caption: caption.trim() || undefined,
      }),
    onSuccess: () => {
      setDocumentId("");
      setCaption("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.content.media(containerId).remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Document</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Caption</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {mediaItems?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={4}>
                No media attached yet.
              </td>
            </tr>
          )}
          {mediaItems?.map((m) => (
            <tr
              key={m.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 font-mono text-xs">{m.document_id}</td>
              <td className="px-3 py-2 capitalize">{m.kind}</td>
              <td className="px-3 py-2">{m.caption}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(m.id)}
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
          <label className={labelClass}>
            Document id (from domains.document)
          </label>
          <input
            className={inputClass}
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          />
        </div>
        <div className="w-28">
          <label className={labelClass}>Kind</label>
          <select
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value as MediaKind)}
          >
            {(["image", "video", "audio", "document"] as MediaKind[]).map(
              (k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex-1">
          <label className={labelClass}>Caption</label>
          <input
            className={inputClass}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!documentId.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </button>
      </div>
      {add.isError && (
        <p className={`px-3 pb-3 ${errorTextClass}`}>
          {errorMessage(add.error, "Couldn't attach that media.")}
        </p>
      )}
    </div>
  );
}

// -- Links ------------------------------------------------------------------------------------

function LinksPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const { data: linkItems } = useQuery({
    queryKey: ["content-links", containerId, contentId],
    queryFn: () => sdk.content.links(containerId).list(contentId),
  });
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-links", containerId, contentId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.content
        .links(containerId)
        .add(contentId, { url: url.trim(), label: label.trim() || undefined }),
    onSuccess: () => {
      setUrl("");
      setLabel("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.content.links(containerId).remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Label</th>
            <th className="px-3 py-2 font-medium">URL</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {linkItems?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={3}>
                No links yet.
              </td>
            </tr>
          )}
          {linkItems?.map((l) => (
            <tr
              key={l.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2">{l.label || "—"}</td>
              <td className="max-w-xs truncate px-3 py-2 text-neutral-600 dark:text-neutral-400">
                {l.url}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(l.id)}
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
          <label className={labelClass}>URL</label>
          <input
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Label</label>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!url.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </button>
      </div>
      {add.isError && (
        <p className={`px-3 pb-3 ${errorTextClass}`}>
          {errorMessage(add.error, "Couldn't add that link.")}
        </p>
      )}
    </div>
  );
}

// -- Embeds -----------------------------------------------------------------------------------

function EmbedsPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const { data: embedItems } = useQuery({
    queryKey: ["content-embeds", containerId, contentId],
    queryFn: () => sdk.content.embeds(containerId).list(contentId),
  });
  const [embedType, setEmbedType] = useState("youtube");
  const [dataText, setDataText] = useState('{"url": ""}');
  const [dataError, setDataError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-embeds", containerId, contentId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.content.embeds(containerId).add(contentId, {
        embed_type: embedType.trim(),
        embed_data: JSON.parse(dataText),
      }),
    onSuccess: () => {
      setDataText('{"url": ""}');
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => sdk.content.embeds(containerId).remove(id),
    onSuccess: invalidate,
  });

  const onAdd = () => {
    setDataError(null);
    try {
      JSON.parse(dataText);
    } catch {
      setDataError("embed_data must be valid JSON.");
      return;
    }
    add.mutate();
  };

  return (
    <div className={cardClass}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {embedItems?.length === 0 && (
            <tr>
              <td className="px-3 py-3 text-neutral-500" colSpan={3}>
                No embeds yet.
              </td>
            </tr>
          )}
          {embedItems?.map((e) => (
            <tr
              key={e.id}
              className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
            >
              <td className="px-3 py-2 font-mono text-xs">{e.embed_type}</td>
              <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-neutral-500">
                {JSON.stringify(e.embed_data)}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(e.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <div className="w-40">
          <label className={labelClass}>Embed type</label>
          <input
            className={inputClass}
            value={embedType}
            onChange={(e) => setEmbedType(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Data (JSON)</label>
          <textarea
            className={`${inputClass} min-h-[4rem] font-mono text-xs`}
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!embedType.trim() || add.isPending}
          onClick={onAdd}
        >
          Add embed
        </button>
        {(dataError || add.isError) && (
          <p className={errorTextClass}>
            {dataError ?? errorMessage(add.error, "Couldn't add that embed.")}
          </p>
        )}
      </div>
    </div>
  );
}

// -- Content references -----------------------------------------------------------------------------

function ReferencesPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const queryClient = useQueryClient();
  const { data: from } = useQuery({
    queryKey: ["content-refs-from", containerId, contentId],
    queryFn: () =>
      sdk.content.contentReferences(containerId).listFrom(contentId),
  });
  const { data: to } = useQuery({
    queryKey: ["content-refs-to", containerId, contentId],
    queryFn: () => sdk.content.contentReferences(containerId).listTo(contentId),
  });
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState("related");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["content-refs-from", containerId, contentId],
    });
  const add = useMutation({
    mutationFn: () =>
      sdk.content
        .contentReferences(containerId)
        .add(contentId, targetId.trim(), relationType.trim() || "related"),
    onSuccess: () => {
      setTargetId("");
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.content.contentReferences(containerId).remove(id),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">References from this content</h3>
        <div className="mt-2 space-y-1">
          {from?.length === 0 && (
            <p className="text-sm text-neutral-500">None yet.</p>
          )}
          {from?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800"
            >
              <span>
                <span className={badgeClass}>{r.relation_type}</span>{" "}
                <span className="ml-2 font-mono text-xs">
                  {r.to_content_id}
                </span>
              </span>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={remove.isPending}
                onClick={() => remove.mutate(r.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className={labelClass}>Target content id</label>
            <input
              className={inputClass}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className={labelClass}>Relation</label>
            <input
              className={inputClass}
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={!targetId.trim() || add.isPending}
            onClick={() => add.mutate()}
          >
            Add
          </button>
        </div>
        {add.isError && (
          <p className={`mt-1.5 ${errorTextClass}`}>
            {errorMessage(add.error, "Couldn't add that reference.")}
          </p>
        )}
      </div>
      <div className={`${cardClass} p-4`}>
        <h3 className="text-sm font-semibold">Referenced by</h3>
        <div className="mt-2 space-y-1">
          {to?.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nothing references this content yet.
            </p>
          )}
          {to?.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm dark:border-neutral-800"
            >
              <span className={badgeClass}>{r.relation_type}</span>{" "}
              <span className="ml-2 font-mono text-xs">
                {r.from_content_id}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Versions -----------------------------------------------------------------------------------

function VersionsPanel({
  containerId,
  contentId,
}: {
  containerId: string;
  contentId: string;
}) {
  const { data: versions, isLoading } = useQuery({
    queryKey: ["content-versions", containerId, contentId],
    queryFn: () => sdk.content.content(containerId).versions(contentId),
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={cardClass}>
      {isLoading && <p className="p-3 text-sm text-neutral-500">Loading…</p>}
      {versions?.length === 0 && (
        <p className="p-3 text-sm text-neutral-500">
          Never published — no version history yet.
        </p>
      )}
      {versions?.map((v) => (
        <div
          key={v.id}
          className="border-b border-neutral-100 p-3 last:border-0 dark:border-neutral-900"
        >
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() =>
              setExpanded(
                expanded === v.version_number ? null : v.version_number,
              )
            }
          >
            <span className="text-sm font-medium">
              Version {v.version_number} — {v.title}
            </span>
            <span className="text-xs text-neutral-500">
              {formatDateTime(v.published_at)}
            </span>
          </button>
          {expanded === v.version_number && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
              {v.body}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

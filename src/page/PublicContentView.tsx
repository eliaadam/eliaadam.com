import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { ContentRenderer } from "../components/content/ContentRenderer";
import type { ContentBlock, EmbedReference } from "../lib/sdk/domains/content";
import { ApiError } from "../lib/query/Api";
import { sdk } from "../lib/sdk";

/**
 * Genuinely public — no auth, no container membership, no permission
 * check anywhere in this path. Matches PublicFormFill's own pattern:
 * sits outside <ProtectedRoute> entirely in the router. Hits only
 * core.content's public endpoint, which never returns draft state —
 * whatever this renders is exactly the latest published snapshot.
 */
export function PublicContentView() {
  const { containerId, slug } = useParams<{ containerId: string; slug: string }>();

  const { data: content, isLoading, isError, error } = useQuery({
    queryKey: ["public-content", containerId, slug],
    queryFn: () => sdk.content.getPublic(containerId!, slug!),
    enabled: !!containerId && !!slug,
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-neutral-500">Loading…</div>;
  }

  if (isError || !content) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {error instanceof ApiError ? error.message : "This content isn't published, or doesn't exist."}
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{content.title}</h1>
      {content.summary && <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">{content.summary}</p>}
      {content.published_at && (
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
          Published{" "}
          {new Date(content.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      )}
      <div className="mt-8">
        <ContentRenderer format={content.format} body={content.body} />
      </div>

      {content.blocks.length > 0 && (
        <div className="mt-8 space-y-4">
          {content.blocks
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((b) => <BlockView key={b.id} block={b} />)}
        </div>
      )}

      {content.media.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Media</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {content.media
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((m) => (
                <div key={m.id} className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                  <div className="text-xs font-medium uppercase text-neutral-400">{m.kind}</div>
                  {m.caption && <div className="mt-1">{m.caption}</div>}
                  <div className="mt-1 truncate font-mono text-xs text-neutral-400" title={m.document_id}>
                    {m.document_id}
                  </div>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Showing media metadata only — actual file rendering needs domains.document's file-serving URL wired in.
          </p>
        </section>
      )}

      {content.links.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Links</h2>
          <ul className="mt-3 space-y-1.5">
            {content.links
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                    {l.label || l.url}
                  </a>
                </li>
              ))}
          </ul>
        </section>
      )}

      {content.embeds.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Embedded</h2>
          {content.embeds
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((e) => <EmbedView key={e.id} embed={e} />)}
        </section>
      )}

      {content.references.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Related</h2>
          <ul className="mt-3 space-y-1.5">
            {content.references.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="mr-2 text-xs text-neutral-400">{r.relation_type}</span>
                {r.to_slug ? (
                  <a href={`/c/${containerId}/${r.to_slug}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {r.to_title ?? r.to_slug}
                  </a>
                ) : (
                  <span className="text-neutral-400">{r.to_title ?? "(not publicly available)"}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function BlockView({ block }: { block: ContentBlock }) {
  const payload = block.payload as Record<string, unknown>;
  const text = typeof payload.text === "string" ? payload.text : undefined;

  if (block.block_type === "heading" && text) {
    const level = typeof payload.level === "number" ? Math.min(6, Math.max(1, payload.level)) : 2;
    const Tag = `h${level}` as keyof JSX.IntrinsicElements;
    return <Tag className="font-semibold tracking-tight">{text}</Tag>;
  }
  if (block.block_type === "quote" && text) {
    return <blockquote className="border-l-2 border-neutral-300 pl-4 italic text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">{text}</blockquote>;
  }
  if (block.block_type === "code" && text) {
    return <pre className="overflow-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100">{text}</pre>;
  }
  if (block.block_type === "paragraph" && text) {
    return <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>;
  }
  return <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-900">{JSON.stringify(block.payload)}</pre>;
}

function EmbedView({ embed }: { embed: EmbedReference }) {
  const data = embed.embed_data as Record<string, unknown>;
  const url = typeof data.url === "string" ? data.url : undefined;

  if (embed.embed_type === "youtube" && url) {
    const idMatch = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
    if (idMatch) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md">
          <iframe
            src={`https://www.youtube.com/embed/${idMatch[1]}`} className="h-full w-full" allowFullScreen
            title="Embedded YouTube video"
          />
        </div>
      );
    }
  }
  return (
    <div className="rounded-md border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      <div className="font-medium uppercase text-neutral-400">{embed.embed_type}</div>
      <pre className="mt-1 whitespace-pre-wrap text-neutral-500">{JSON.stringify(embed.embed_data)}</pre>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentFormat } from "../../lib/sdk/domains/content";

/**
 * Renders a published content body according to its `format`.
 * Deliberately a single switch point: today only "markdown" has a
 * real renderer; every other format falls back to a plain, readable
 * display of the raw body rather than a blank page. Adding HTML,
 * rich_text, structured (block-based), or truly interactive/embedded
 * content later means adding a new case here — this page and the
 * public route it sits behind don't need to change.
 */

interface ContentRendererProps {
  format: ContentFormat;
  body: string;
}

export function ContentRenderer({ format, body }: ContentRendererProps) {
  switch (format) {
    case "markdown":
      return <MarkdownBody body={body} />;
    case "plain_text":
      return <PlainTextBody body={body} />;
    default:
      return <UnsupportedFormatBody format={format} body={body} />;
  }
}

function MarkdownBody({ body }: { body: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}

function PlainTextBody({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap text-base leading-relaxed text-neutral-800 dark:text-neutral-200">
      {body}
    </p>
  );
}

function UnsupportedFormatBody({
  format,
  body,
}: {
  format: ContentFormat;
  body: string;
}) {
  return (
    <div>
      <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        Rendering for "{format}" content isn't implemented yet — showing the raw
        source below.
      </p>
      <pre className="mt-3 whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        {body}
      </pre>
    </div>
  );
}

/**
 * Minimal, dependency-free markdown → HTML renderer for post bodies.
 *
 * Supports the common subset plus URL media embedding (the "embed media by URL"
 * requirement): images via ![alt](url), and bare video/audio/YouTube URLs on
 * their own line become players/iframes. HTML is escaped first, so this is safe
 * to inject via dangerouslySetInnerHTML. For richer needs later, swap this for
 * markdown-it/marked + DOMPurify.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  // images: ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) =>
    `<img src="${url}" alt="${alt}" class="rounded-md my-2 max-w-full" />`);
  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text, url) =>
    `<a href="${url}" target="_blank" rel="noreferrer" class="text-blue-600 underline">${text}</a>`);
  // bold / italic / code
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.9em]">$1</code>');
  return s;
}

/** A bare media URL alone on a line → an embedded player/iframe. */
function mediaEmbed(line: string): string | null {
  const url = line.trim();
  if (!/^https?:\/\/\S+$/.test(url)) return null;

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) {
    return `<div class="aspect-video my-3"><iframe class="w-full h-full rounded-md" src="https://www.youtube.com/embed/${yt[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  }
  if (/\.(mp4|webm|ogg)$/i.test(url)) {
    return `<video controls class="w-full rounded-md my-3" src="${url}"></video>`;
  }
  if (/\.(mp3|wav|m4a)$/i.test(url)) {
    return `<audio controls class="w-full my-3" src="${url}"></audio>`;
  }
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(url)) {
    return `<img src="${url}" alt="" class="rounded-md my-2 max-w-full" />`;
  }
  return null;
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = escapeHtml(md).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let codeBuf: string[] = [];

  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  for (const raw of lines) {
    // fenced code blocks
    if (raw.trim().startsWith("```")) {
      if (inCode) {
        out.push(`<pre class="p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 overflow-auto text-xs my-2"><code>${codeBuf.join("\n")}</code></pre>`);
        codeBuf = []; inCode = false;
      } else {
        closeList(); inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf.push(raw); continue; }

    const line = raw.trimEnd();

    if (line.trim() === "") { closeList(); continue; }

    // media embed (bare URL on its own line)
    const embed = mediaEmbed(line);
    if (embed) { closeList(); out.push(embed); continue; }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length + 1; // h2..h5
      out.push(`<h${level} class="font-semibold mt-4 mb-2">${inline(h[2])}</h${level}>`);
      continue;
    }

    // blockquote
    if (line.startsWith("&gt; ")) {
      closeList();
      out.push(`<blockquote class="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 my-2 text-neutral-600 dark:text-neutral-400">${inline(line.slice(5))}</blockquote>`);
      continue;
    }

    // list items
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="list-disc pl-5 my-2 space-y-1">'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    // paragraph
    closeList();
    out.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`);
  }
  closeList();
  if (inCode && codeBuf.length) {
    out.push(`<pre class="p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 overflow-auto text-xs my-2"><code>${codeBuf.join("\n")}</code></pre>`);
  }
  return out.join("\n");
}

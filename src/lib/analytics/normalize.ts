/**
 * Mirrors the server's normalisation (domain/normalize.py) so almost nothing needs correcting on arrival — but the
 * server re-applies it anyway, so a stale or hostile client still can't smuggle an id, a search term or a token
 * into the store. Routes are reduced to their SHAPE: ids become :id, queries and fragments disappear.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LONG_HEX_RE = /^[0-9a-f]{16,}$/i;
const TOKENISH_RE = /^[A-Za-z0-9_]{8,}$/; // no hyphens: hyphenated strings are slugs, not tokens
const SCHEME_HOST_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]*/;
const MAX_SEGMENTS = 8;
const MAX_ROUTE = 200;
const MAX_SEGMENT = 40;

function normalizeSegment(seg: string): string {
  if (UUID_RE.test(seg)) return ":id";
  if (/^\d+$/.test(seg) && seg.length >= 4) return ":id";
  if (LONG_HEX_RE.test(seg)) return ":id";
  if (seg.includes("@")) return ":id";
  if (TOKENISH_RE.test(seg) && /\d/.test(seg) && /[A-Za-z]/.test(seg)) return ":id"; // an invitation code, a token
  if (seg.length > MAX_SEGMENT) return ":id";
  return seg;
}

export function normalizeRoute(raw: string): string {
  let s = (raw ?? "").trim().replace(SCHEME_HOST_RE, "");
  s = s.split("#", 1)[0]!.split("?", 1)[0]!;
  const segments = s.split("/").filter(Boolean).map(normalizeSegment).slice(0, MAX_SEGMENTS);
  return `/${segments.join("/")}`.slice(0, MAX_ROUTE);
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const UUID_ANYWHERE_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const LONG_NUMBER_RE = /\d{4,}/g;
const URL_QUERY_RE = /\?[^\s"']*/g;
const MAX_MESSAGE = 120;

/** An error message with anything id-like or contact-like removed. Not a guarantee a message holds no name — which is
 * why API errors (whose text comes from server-side messages that can name people) are never reported as messages. */
export function sanitizeMessage(raw: string): string {
  return (raw ?? "")
    .replace(EMAIL_RE, "[email]").replace(UUID_ANYWHERE_RE, "[id]").replace(URL_QUERY_RE, "").replace(LONG_NUMBER_RE, "[n]")
    .replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE);
}

/** FNV-1a, 32-bit, as 8 hex characters: a stable grouping key for "the same error", with no readable content. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** "app.faith.people.new-person" style ids only; anything else is dropped (the click still counts, unnamed). */
export const COMPONENT_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9][a-z0-9_-]*){1,5}$/;
export function validComponent(id: string | null | undefined): string | undefined {
  return id && id.length <= 80 && COMPONENT_RE.test(id) ? id : undefined;
}

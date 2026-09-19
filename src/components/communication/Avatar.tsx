const PALETTE = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-600",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "?";
}

/** Deterministic color + initials avatar — no upload/asset dependency,
 * so it works for actors and groups alike without another round trip. */
export function Avatar({
  name,
  seed,
  size = 32,
}: {
  name: string;
  seed: string;
  size?: number;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-medium text-white ${colorFor(
        seed,
      )}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}

/** Coarse, human relative time for conversation rows and message
 * timestamps. Falls back to a plain date once it's more than a week
 * old, rather than ever-growing "N days ago" strings. */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";

  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

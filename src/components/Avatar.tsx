import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

// Deterministic palette from the name, so the same actor always gets
// the same fallback color across the app rather than a random one
// per render.
const PALETTE = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generic, presentation-only — takes an already-resolved URL (or
 * null/undefined), never fetches anything itself. Falls back to a
 * deterministic initials badge when there's no URL, OR when the image
 * actually fails to load (a real, worth-handling case: avatar URLs
 * may be presigned/expiring — see the backend's own note on this
 * v1 simplification — so a stale cached URL should degrade
 * gracefully, not show a broken image icon).
 */
export function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgFailed(true)}
        className={`flex-none rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`flex flex-none items-center justify-center rounded-full font-medium text-white ${colorForName(name)} ${sizeClass} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}

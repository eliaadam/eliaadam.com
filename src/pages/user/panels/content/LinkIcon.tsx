import * as Lucide from "lucide-react";

/**
 * Renders a Lucide icon by its kebab-case name (e.g. "file-text" → FileText).
 * Falls back to ExternalLink if the name isn't found. This is how link types map
 * to icons across the content UI.
 */
export default function LinkIcon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  const pascal = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  const Icon = (Lucide as any)[pascal] ?? Lucide.ExternalLink;
  return <Icon size={size} className={className} />;
}

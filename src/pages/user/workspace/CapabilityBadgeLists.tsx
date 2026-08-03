import type { Capability } from "./types";

interface CapabilityBadgeListProps {
  title: string;
  capabilities: Capability[];
  titleFor: (cap: Capability) => string;
  footnote?: string;
}

function CapabilityBadgeList({
  title,
  capabilities,
  titleFor,
  footnote,
}: CapabilityBadgeListProps) {
  if (capabilities.length === 0) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {capabilities.map((cap) => (
          <span
            key={cap.code}
            className="px-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-400"
            title={titleFor(cap)}
          >
            {cap.display_name}
          </span>
        ))}
      </div>
      {footnote && (
        <p className="text-[11px] text-neutral-400 mt-2 mb-0">{footnote}</p>
      )}
    </div>
  );
}

export function NotBuiltList({ capabilities }: { capabilities: Capability[] }) {
  return (
    <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
      <CapabilityBadgeList
        title="Enabled, no interface yet"
        capabilities={capabilities}
        titleFor={(cap) =>
          `${cap.code} — ${cap.permissions.length} permission(s)`
        }
      />
    </div>
  );
}

export function BackendOnlyList({
  capabilities,
}: {
  capabilities: Capability[];
}) {
  if (capabilities.length === 0) return null;
  return (
    <div className="mt-6">
      <CapabilityBadgeList
        title="Running in the background"
        capabilities={capabilities}
        titleFor={(cap) => cap.description ?? cap.code}
        footnote="These have no screen by design — they work through other features."
      />
    </div>
  );
}

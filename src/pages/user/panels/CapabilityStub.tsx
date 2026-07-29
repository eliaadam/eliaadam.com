import type { ReactNode } from "react";

// ─── Shared shell ───────────────────────────────────────────────────────

export default function CapabilityStub({
  title,
  icon,
  blurb,
  permissions,
  buildSteps,
}: {
  title: string;
  icon: string;
  blurb: string;
  permissions: string[];
  buildSteps: ReactNode;
}) {
  return (
    <div>
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl leading-none">{icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
              {title}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0">
              {blurb}
            </p>
          </div>
        </div>

        {/* The permissions ARE real. The Gate evaluated them, the access mode
            was honoured, the roles resolved. Only the product is missing. */}
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Your permissions here ({permissions.length})
          </p>

          {permissions.length === 0 ? (
            <p className="text-xs text-neutral-400 m-0">None.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <span
                  key={p}
                  className="px-2 py-1 text-[11px] font-mono rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wide mb-2">
            Not implemented
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 m-0 mb-3">
            The permissions above are real — the Gate evaluated them and the
            capability is licensed to this container. What does not exist yet is
            the capability itself: no table, no service, no API.
          </p>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {buildSteps}
          </div>
        </div>
      </div>
    </div>
  );
}

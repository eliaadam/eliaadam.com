import type { ShellProps } from "./types";

export function DashboardShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
}: ShellProps) {
  const activeCap = renderable.find((c) => c.code === active);
  const ActiveIcon = activeCap ? iconFor(activeCap) : null;

  return (
    <div>
      <div
        className="grid gap-4 mb-8"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {renderable.map((cap) => {
          const on = cap.code === active;
          const Icon = iconFor(cap);
          return (
            <button
              key={cap.code}
              onClick={() => goToPanel(cap.code)}
              className={`text-left rounded-2xl border transition ${
                on
                  ? "border-black dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600"
              }`}
              style={{ padding: "var(--ux-panel-pad)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={20} />
                <span
                  className="font-semibold text-black dark:text-white"
                  style={{ fontSize: "var(--ux-font-lg)" }}
                >
                  {labelFor(cap)}
                </span>
              </div>
              {cap.description && (
                <p
                  className="text-neutral-500 dark:text-neutral-400 m-0"
                  style={{ fontSize: "var(--ux-font-sm)" }}
                >
                  {cap.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {activeCap && ActiveIcon && (
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 mb-4">
            <ActiveIcon size={24} />
            <h2
              className="font-semibold text-black dark:text-white m-0"
              style={{ fontSize: "var(--ux-font-heading)" }}
            >
              {labelFor(activeCap)}
            </h2>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

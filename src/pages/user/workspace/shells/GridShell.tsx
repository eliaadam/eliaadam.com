import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ShellProps } from "./types";

export function GridShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
  addressBase,
}: ShellProps) {
  const navigate = useNavigate();
  const activeCap = renderable.find((c) => c.code === active);

  if (activeCap) {
    const ActiveIcon = iconFor(activeCap);
    return (
      <div>
        <button
          onClick={() => addressBase && navigate(addressBase)}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
          style={{
            fontSize: "var(--ux-font-lg)",
            minHeight: "var(--ux-tap-min)",
            padding: "0 var(--ux-control-pad-x)",
          }}
        >
          <ArrowLeft size={16} />
          All apps
        </button>
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
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
    >
      {renderable.map((cap) => {
        const Icon = iconFor(cap);
        return (
          <button
            key={cap.code}
            onClick={() => goToPanel(cap.code)}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
            style={{ minHeight: "9rem", padding: "var(--ux-panel-pad)" }}
          >
            <Icon size={40} strokeWidth={1.5} />
            <span
              className="font-semibold text-black dark:text-white text-center"
              style={{ fontSize: "var(--ux-font-lg)" }}
            >
              {labelFor(cap)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { useAutoCenterScroll } from "../../../../hooks/useAutoCenterScroll";
import type { ShellProps } from "./types";

export function TabsShell({
  renderable,
  active,
  goToPanel,
  labelFor,
  iconFor,
  children,
}: ShellProps) {
  const { containerRef, registerItem } = useAutoCenterScroll<HTMLButtonElement>(
    active,
    {
      axis: "horizontal",
      align: "center",
    },
  );

  return (
    <>
      <div
        ref={containerRef}
        className="scroll-hidden flex gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-6 pb-0.5 overflow-x-auto"
      >
        {renderable.map((cap) => {
          const on = cap.code === active;
          const Icon = iconFor(cap);
          return (
            <button
              key={cap.code}
              ref={registerItem(cap.code)}
              onClick={() => goToPanel(cap.code)}
              title={cap.description ?? undefined}
              className={`flex items-center font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                on
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
              style={{
                fontSize: "var(--ux-font-base)",
                padding:
                  "calc(var(--ux-space-unit) * 2.5) var(--ux-control-pad-x)",
              }}
            >
              <Icon size={16} className="mr-1.5 flex-shrink-0" />
              {labelFor(cap)}
              {cap.access_mode === "open_to_members" && (
                <span
                  className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
                  title="Open to every member"
                >
                  open
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </>
  );
}

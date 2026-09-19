// ContainerSwitcher.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useContainer } from "../context/ContainerContext";
import { ContainerAvatar } from "../ui/ContainerAvatar";

// Logo in the header renders at h-7 (mobile) / h-8 (desktop) — every
// container avatar, trigger or list row, matches that footprint exactly
// so the switcher never looks heavier than the brand mark beside it.
const AVATAR_SIZE = "size-7 md:size-8";

export function ContainerSwitcher() {
  const { containers, currentContainerId, currentContainer, switchContainer } =
    useContainer();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    if (open) document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch container"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
      >
        {currentContainer ? (
          <div className={`${AVATAR_SIZE} overflow-hidden rounded-md`}>
            <ContainerAvatar
              containerId={currentContainer.id}
              name={currentContainer.display_name}
              size="sm"
            />
          </div>
        ) : (
          <span className={`${AVATAR_SIZE} rounded-md bg-muted`} />
        )}

        <ChevronDown
          size={14}
          className={[
            "text-muted-foreground transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-surface shadow-xl shadow-black/10 dark:shadow-black/30">
          <p className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Switch container
          </p>

          <div className="max-h-80 overflow-y-auto p-2">
            {containers.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                You're not in any containers yet.
              </p>
            ) : (
              containers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    switchContainer(c.id);
                    setOpen(false);
                  }}
                  aria-current={c.id === currentContainerId}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted",
                    c.id === currentContainerId ? "bg-muted" : "",
                  ].join(" ")}
                >
                  <div
                    className={`${AVATAR_SIZE} shrink-0 overflow-hidden rounded-md`}
                  >
                    <ContainerAvatar
                      containerId={c.id}
                      name={c.display_name}
                      size="sm"
                    />
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {c.display_name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { useContainer } from "../context/ContainerContext";
import { ContainerAvatar } from "../ui/ContainerAvatar";

/**
 * Google app-launcher style — the CURRENT container's avatar + name is
 * always visible (this slot used to show a plain dropdown), clicking
 * it opens a popover grid of every container the actor belongs to,
 * click a tile to switch.
 *
 * Deliberately doesn't navigate itself — `switchContainer()` (in
 * ContainerContext) already does that (redirects to a safe landing
 * route on every switch, see that file's own fix notes) — this
 * component only needs to call it and close the popover.
 */
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
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
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
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900"
      >
        {currentContainer ? (
          <>
            <ContainerAvatar
              containerId={currentContainer.id}
              name={currentContainer.display_name}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {currentContainer.display_name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-neutral-500 dark:text-neutral-500">
            No container selected
          </span>
        )}
        <ChevronsUpDown
          size={14}
          className="flex-none text-neutral-400 dark:text-neutral-600"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          <p className="mb-3 px-1 text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Switch container
          </p>

          {containers.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-neutral-500 dark:text-neutral-500">
              You're not in any containers yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {containers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    switchContainer(c.id);
                    setOpen(false);
                  }}
                  aria-current={c.id === currentContainerId}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 ${
                    c.id === currentContainerId
                      ? "bg-neutral-100 dark:bg-neutral-900"
                      : ""
                  }`}
                >
                  <ContainerAvatar
                    containerId={c.id}
                    name={c.display_name}
                    size="lg"
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-tight">
                    {c.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

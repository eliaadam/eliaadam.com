// ContainerSwitcher.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { useContainer } from "../context/ContainerContext";
import { ContainerAvatar } from "../ui/ContainerAvatar";

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
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
      >
        {currentContainer ? (
          <>
            <ContainerAvatar
              containerId={currentContainer.id}
              name={currentContainer.display_name}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {currentContainer.display_name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">
            No container selected
          </span>
        )}

        <ChevronsUpDown size={14} className="flex-none text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl bg-surface p-4 shadow-xl shadow-black/10 dark:shadow-black/30">
          <p className="mb-3 px-1 text-xs font-medium text-muted-foreground">
            Switch container
          </p>

          {containers.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
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
                  className={[
                    "flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-colors hover:bg-muted",
                    c.id === currentContainerId ? "bg-muted" : "",
                  ].join(" ")}
                >
                  <ContainerAvatar
                    containerId={c.id}
                    name={c.display_name}
                    size="lg"
                  />
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">
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

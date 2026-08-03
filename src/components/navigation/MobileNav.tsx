import { useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { homeNavItems } from "./homeNavItems";
import type { NavItem } from "./types";
import { MobileNavItem } from "./MobileNavItem";

interface MobileNavProps {
  items?: NavItem[];
  footer?: ReactNode;
}

export function MobileNav({ items = homeNavItems, footer }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside([triggerRef, panelRef], () => setOpen(false), open);

  return (
    <div className="lg:hidden relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50"
            aria-hidden
          />
          <div
            ref={panelRef}
            className="absolute left-0 top-full mt-2 z-50 w-72 max-w-[85vw] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-xl overflow-hidden"
          >
            <nav className="p-2 flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto scroll-thin">
              {items.map((item) => (
                <MobileNavItem
                  key={item.key}
                  item={item}
                  onAfterNavigate={() => setOpen(false)}
                />
              ))}
            </nav>
            {footer && (
              <div className="border-t border-neutral-200 dark:border-neutral-800">
                {footer}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

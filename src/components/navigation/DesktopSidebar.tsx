import type { ReactNode } from "react";
import { homeNavItems } from "./homeNavItems";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavItem, SidebarView } from "./types";

interface DesktopSidebarProps {
  items?: NavItem[];
  view?: SidebarView;
  title?: string;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  className?: string;
}

const WIDTH: Record<SidebarView, string> = {
  full: "w-[240px]",
  text: "w-[200px]",
  icons: "w-[64px]",
};

export function DesktopSidebar({
  items = homeNavItems,
  view = "full",
  title,
  footer,
  headerExtra,
  className = "",
}: DesktopSidebarProps) {
  const showTextHeader = view !== "icons" && (title || headerExtra);
  const showIconHeader = view === "icons" && title;

  return (
    <aside
      className={`hidden lg:flex ${WIDTH[view]} flex-shrink-0 bg-white dark:bg-black border-r   flex-col transition-[width] duration-150 ${className}`}
    >
      {showTextHeader && (
        <div className="px-5 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
          {title && (
            <span className="text-base font-bold text-black dark:text-white truncate">
              {title}
            </span>
          )}
          {headerExtra}
        </div>
      )}
      {showIconHeader && (
        <div className="py-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-center">
          <span className="text-base font-bold text-black dark:text-white">
            {title!.charAt(0)}
          </span>
        </div>
      )}

      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto scroll-thin">
        {items.map((item) => (
          <SidebarNavItem key={item.key} item={item} view={view} />
        ))}
      </nav>

      {footer}
    </aside>
  );
}

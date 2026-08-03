import type { ReactNode } from "react";

interface TopAppBarProps {
  mobileNav: ReactNode; // MobileNav trigger + popover, shown lg:hidden
  title?: string;
  desktopExtra?: ReactNode; // e.g. SidebarViewToggle — shown lg:flex only
  actions?: ReactNode; // right-aligned, e.g. UserMenu — shown always
}

export function TopAppBar({
  mobileNav,
  title = "Sonic",
  desktopExtra,
  actions,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 h-14 px-4   dark:border-neutral-800 bg-white dark:bg-black flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {mobileNav}
        <span className="text-base font-bold text-black dark:text-white truncate">
          {title}
        </span>
        {desktopExtra && <div className="hidden lg:flex">{desktopExtra}</div>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
    </header>
  );
}

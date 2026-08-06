interface MobileTopBarProps {
  mobileOpen: boolean;
  onToggle: () => void;
}

export function MobileTopBar({ mobileOpen, onToggle }: MobileTopBarProps) {
  return (
    <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <span className="text-base font-bold text-black dark:text-white">
        HALA
      </span>
      <button
        onClick={onToggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 text-black dark:text-white"
        aria-label="Toggle menu"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>
    </div>
  );
}

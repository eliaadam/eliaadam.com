import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "./navigation";

interface MobileNavItemProps {
  item: NavItem;
  activeTab: string | null;
  depth?: number;
  onSelectTab: (tab: string) => void;
}

function containsActiveTab(item: NavItem, activeTab: string | null): boolean {
  if (item.tab === activeTab) return true;
  return item.children?.some((c) => containsActiveTab(c, activeTab)) ?? false;
}

export function MobileNavItem({
  item,
  activeTab,
  depth = 0,
  onSelectTab,
}: MobileNavItemProps) {
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(() => containsActiveTab(item, activeTab));

  const Icon = item.icon;
  const isActive = item.tab === activeTab;

  const handleClick = () => {
    if (hasChildren) setOpen((v) => !v);
    onSelectTab(item.tab);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2.5 py-2.5 rounded-lg text-sm font-medium text-left transition ${
          isActive
            ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
            : "text-neutral-500 dark:text-neutral-400"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: "12px" }}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span className="truncate flex-1">{item.label}</span>
        {hasChildren && (
          <ChevronDown
            size={16}
            className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {hasChildren && open && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {item.children!.map((child) => (
            <MobileNavItem
              key={child.tab}
              item={child}
              activeTab={activeTab}
              depth={depth + 1}
              onSelectTab={onSelectTab}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "./navigation";
import type { SidebarView } from "./types";

interface SidebarNavItemProps {
  item: NavItem;
  activeTab: string | null;
  view: SidebarView;
  depth?: number;
  onSelectTab: (tab: string) => void;
}

function containsActiveTab(item: NavItem, activeTab: string | null): boolean {
  if (item.tab === activeTab) return true;
  return item.children?.some((c) => containsActiveTab(c, activeTab)) ?? false;
}

export function SidebarNavItem({
  item,
  activeTab,
  view,
  depth = 0,
  onSelectTab,
}: SidebarNavItemProps) {
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(() => containsActiveTab(item, activeTab));

  const Icon = item.icon;
  const isActive = item.tab === activeTab;
  const showLabel = view !== "icons";
  const showIcon = view !== "text";

  const handleClick = () => {
    if (hasChildren && view !== "icons") setOpen((v) => !v);
    onSelectTab(item.tab);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        title={view === "icons" ? item.label : undefined}
        className={`w-full flex items-center gap-2.5 py-2.5 rounded-lg text-sm font-medium text-left transition ${
          isActive
            ? "bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white"
            : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        } ${view === "icons" ? "justify-center px-0" : "px-3"}`}
        style={
          depth > 0 && view !== "icons"
            ? { paddingLeft: `${12 + depth * 16}px` }
            : undefined
        }
      >
        {showIcon && <Icon size={18} className="flex-shrink-0" />}
        {showLabel && <span className="truncate flex-1">{item.label}</span>}
        {hasChildren && showLabel && (
          <ChevronRight
            size={14}
            className={`flex-shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
          />
        )}
      </button>

      {hasChildren && open && view !== "icons" && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {item.children!.map((child) => (
            <SidebarNavItem
              key={child.tab}
              item={child}
              activeTab={activeTab}
              view={view}
              depth={depth + 1}
              onSelectTab={onSelectTab}
            />
          ))}
        </div>
      )}
    </div>
  );
}

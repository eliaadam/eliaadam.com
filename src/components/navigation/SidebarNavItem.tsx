import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { NavItem, SidebarView } from "./types";
import { isNavItemActive, containsActiveDescendant } from "./navLocation";

interface SidebarNavItemProps {
  item: NavItem;
  view: SidebarView;
  depth?: number;
}

export function SidebarNavItem({ item, view, depth = 0 }: SidebarNavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(() =>
    containsActiveDescendant(item, location.pathname, location.search),
  );

  const Icon = item.icon;
  const isActive = isNavItemActive(item, location.pathname, location.search);
  const showLabel = view !== "icons";
  const showIcon = view !== "text";

  const handleClick = () => {
    if (hasChildren && view !== "icons") setOpen((v) => !v);
    navigate(item.to);
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
              key={child.key}
              item={child}
              view={view}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

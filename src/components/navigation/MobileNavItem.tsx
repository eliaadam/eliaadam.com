import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "./types";
import { isNavItemActive, containsActiveDescendant } from "./navLocation";

interface MobileNavItemProps {
  item: NavItem;
  depth?: number;
  onAfterNavigate: () => void;
}

export function MobileNavItem({
  item,
  depth = 0,
  onAfterNavigate,
}: MobileNavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(() =>
    containsActiveDescendant(item, location.pathname, location.search),
  );

  const Icon = item.icon;
  const isActive = isNavItemActive(item, location.pathname, location.search);

  const handleClick = () => {
    if (hasChildren) setOpen((v) => !v);
    navigate(item.to);
    onAfterNavigate();
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
              key={child.key}
              item={child}
              depth={depth + 1}
              onAfterNavigate={onAfterNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

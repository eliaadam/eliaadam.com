import type { LucideIcon } from "lucide-react";

export type SidebarView = "full" | "icons" | "text";

export interface NavItem {
    key: string;
    label: string;
    icon: LucideIcon;
    to: string;
    children?: NavItem[];
}
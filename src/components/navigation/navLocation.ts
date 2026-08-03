import type { NavItem } from "./types";

/** Handles both query-param tabs (/home?tab=x) and plain paths (/admin/actors). */
export function isNavItemActive(item: NavItem, pathname: string, search: string): boolean {
    const [itemPath, itemQuery] = item.to.split("?");

    if (itemQuery) {
        if (pathname !== itemPath) return false;
        const wantedTab = new URLSearchParams(itemQuery).get("tab");
        const currentTab = new URLSearchParams(search).get("tab") ?? "dashboard";
        return wantedTab === currentTab;
    }

    if (itemPath === "/admin") return pathname === "/admin"; // exact only, avoid matching /admin/*
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function containsActiveDescendant(
    item: NavItem,
    pathname: string,
    search: string,
): boolean {
    if (isNavItemActive(item, pathname, search)) return true;
    return item.children?.some((c) => containsActiveDescendant(c, pathname, search)) ?? false;
}
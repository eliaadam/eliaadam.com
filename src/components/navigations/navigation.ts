export interface NavItem {
    tab: string;
    label: string;
    icon: string;
}

export const navItems: NavItem[] = [
    { tab: "dashboard", label: "Dashboard", icon: "📊" },
    { tab: "home", label: "Home", icon: "🏠" },
    { tab: "apps", label: "Apps", icon: "📦" },
    { tab: "invitations", label: "Invitations", icon: "✉️" },
    { tab: "create", label: "Create", icon: "🚀" },
    { tab: "profile", label: "Profile", icon: "👤" },
];
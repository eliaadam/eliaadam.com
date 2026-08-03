import {
    LayoutDashboard,
    Home,
    Package,
    Mail,
    Rocket,
    User,
    type LucideIcon,
} from "lucide-react";

export interface NavItem {
    tab: string;
    label: string;
    icon: LucideIcon;
    children?: NavItem[];
}

export const navItems: NavItem[] = [
    { tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { tab: "home", label: "Home", icon: Home },
    { tab: "apps", label: "Apps", icon: Package },
    { tab: "invitations", label: "Invitations", icon: Mail },
    { tab: "create", label: "Create", icon: Rocket },
    { tab: "profile", label: "Profile", icon: User },
];
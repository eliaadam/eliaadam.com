import { LayoutDashboard, Home, Mail, Rocket, User } from "lucide-react";
import type { NavItem } from "./types";

export const homeNavItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/home?tab=dashboard" },
    { key: "home", label: "Home", icon: Home, to: "/home?tab=home" },
    // { key: "apps", label: "Apps", icon: Package, to: "/home?tab=apps" },
    { key: "invitations", label: "Invitations", icon: Mail, to: "/home?tab=invitations" },
    { key: "create", label: "create", icon: Rocket, to: "/home?tab=create" },
    { key: "profile", label: "Profile", icon: User, to: "/home?tab=profile" },
];
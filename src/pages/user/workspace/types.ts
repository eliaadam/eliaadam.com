import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type Family = { code: string; display_name: string; icon: string | null };

export type Capability = {
    code: string;
    display_name: string;
    description: string | null;
    family: Family | null;
    tier: string | null;
    has_frontend: boolean;
    ux_template: string;
    access_mode: "role_required" | "open_to_members";
    permissions: string[];
    resources: string[];
};

export type Workspace = {
    container: {
        id: string;
        code: string;
        display_name: string;
        tenant_container_id: string;
        is_root: boolean;
        ux_template: string;
        slug?: string | null;
    };
    capabilities: Capability[];
};

export interface PanelComponentProps {
    containerId: string;
    permissions: string[];
    uxTemplate?: string;
}

export interface PanelDefinition {
    label: string;
    icon: LucideIcon;
    order: number;
    slug: string;
    component: ComponentType<PanelComponentProps>;
}
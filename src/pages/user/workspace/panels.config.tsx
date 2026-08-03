/* eslint-disable react-refresh/only-export-components */
import {
  Users,
  MessageSquare,
  Folder,
  FileText,
  ClipboardList,
  Wallet,
  IdCard,
  Settings,
  UserCog,
  Truck,
  Store,
  Package,
  Blocks,
} from "lucide-react";
import DocumentsPanel from "../panels/DocumentsPanel";
import ProjectsPanel from "../panels/ProjectsPanel";
import MembersPanel from "../panels/MembersPanel";
import CommunicationsPanel from "../panels/CommunicationsPanel";
import ContainerManagementPanel from "../panels/ContainerManagementPanel";
import HrWorkspace from "../panels/HrWorkspace";
import PaymentsWorkspace from "../panels/PaymentsWorkspace";
import KycPanel from "../panels/KycPanel";
import LogisticsWorkspace from "../panels/LogisticsWorkspace";
import MarketplaceWorkspace from "../panels/Marketplace/MarketplaceWorkspace";
import InventoryWorkspace from "../panels/Inventory/InventoryWorkspace";
import AppsWorkspace from "../panels/Apps/AppsWorkspace";
import InvoicingPanel from "../panels/InvoicingPanel";

import type { PanelDefinition } from "./types";
import TemplatesWorkspace from "../panels/templates/TemplatesWorkspace";

export const PANELS: Record<string, PanelDefinition> = {
  "system.membership": {
    label: "Members",
    icon: Users,
    order: 0,
    slug: "members",
    component: MembersPanel,
  },
  "system.communications": {
    label: "Communications",
    icon: MessageSquare,
    order: 5,
    slug: "chat",
    component: CommunicationsPanel,
  },
  documents: {
    label: "Documents",
    icon: Folder,
    order: 10,
    slug: "documents",
    component: DocumentsPanel,
  },
  invoice: {
    label: "Invoicing",
    icon: FileText,
    order: 20,
    slug: "invoicing",
    component: InvoicingPanel,
  },
  project: {
    label: "Projects",
    icon: ClipboardList,
    order: 30,
    slug: "projects",
    component: ProjectsPanel,
  },
  payments: {
    label: "Payments",
    icon: Wallet,
    order: 40,
    slug: "payments",
    component: PaymentsWorkspace,
  },
  kyc: {
    label: "KYC",
    icon: IdCard,
    order: 45,
    slug: "kyc",
    component: KycPanel,
  },
  "system.hierarchy": {
    label: "Manage",
    icon: Settings,
    order: 90,
    slug: "manage",
    component: ContainerManagementPanel,
  },
  "system.hr": {
    label: "Human Resources",
    icon: UserCog,
    order: 45,
    slug: "hr",
    component: HrWorkspace,
  },
  "system.logistics": {
    label: "Logistics",
    icon: Truck,
    order: 50,
    slug: "logistics",
    component: LogisticsWorkspace,
  },
  "system.marketplace": {
    label: "Marketplace",
    icon: Store,
    order: 70,
    slug: "marketplace",
    component: MarketplaceWorkspace,
  },
  "system.inventory": {
    label: "Inventory",
    icon: Package,
    order: 60,
    slug: "inventory",
    component: InventoryWorkspace,
  },
  "system.apps": {
    label: "Apps",
    icon: Blocks,
    order: 90,
    slug: "apps",
    component: AppsWorkspace,
  },
  "maicore.templates": {
    label: "Templates",
    icon: FileText,
    order: 55,
    slug: "templates",
    component: TemplatesWorkspace,
  },
};

/** panel slug (from URL) → capability code */
export const PANEL_SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PANELS).map(([code, p]) => [p.slug, code]),
);

/** Fallback icon for capabilities with no PANELS entry (e.g. driven by cap.family). */
export const FALLBACK_ICON = Blocks;

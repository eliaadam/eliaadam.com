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

export const PANELS: Record<string, PanelDefinition> = {
  "maicore.membership": {
    label: "Members",
    icon: Users,
    order: 0,
    slug: "members",
    component: MembersPanel,
  },
  "maicore.communications": {
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
  "maicore.hierarchy": {
    label: "Manage",
    icon: Settings,
    order: 90,
    slug: "manage",
    component: ContainerManagementPanel,
  },
  "maicore.hr": {
    label: "Human Resources",
    icon: UserCog,
    order: 45,
    slug: "hr",
    component: HrWorkspace,
  },
  "maicore.logistics": {
    label: "Logistics",
    icon: Truck,
    order: 50,
    slug: "logistics",
    component: LogisticsWorkspace,
  },
  "maicore.marketplace": {
    label: "Marketplace",
    icon: Store,
    order: 70,
    slug: "marketplace",
    component: MarketplaceWorkspace,
  },
  "maicore.inventory": {
    label: "Inventory",
    icon: Package,
    order: 60,
    slug: "inventory",
    component: InventoryWorkspace,
  },
  "maicore.apps": {
    label: "Apps",
    icon: Blocks,
    order: 90,
    slug: "apps",
    component: AppsWorkspace,
  },
};

/** panel slug (from URL) → capability code */
export const PANEL_SLUG_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(PANELS).map(([code, p]) => [p.slug, code]),
);

/** Fallback icon for capabilities with no PANELS entry (e.g. driven by cap.family). */
export const FALLBACK_ICON = Blocks;

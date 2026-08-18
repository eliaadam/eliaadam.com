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
  LayoutTemplate,
  Newspaper,
  Brain,
} from "lucide-react";
import DocumentsPanel from "../panels/DocumentsPanel";
import ProjectsPanel from "../panels/ProjectsPanel";
import MembersPanel from "../panels/MembersPanel";

import ContainerManagementPanel from "../panels/ContainerManagementPanel";
import HrWorkspace from "../panels/HrWorkspace";
import PaymentsWorkspace from "../panels/payments/PaymentsWorkspace";
import KycPanel from "../panels/KycPanel";
import LogisticsWorkspace from "../panels/LogisticsWorkspace";
import MarketplaceWorkspace from "../panels/Marketplace/MarketplaceWorkspace";
import InventoryWorkspace from "../panels/Inventory/InventoryWorkspace";
import AppsWorkspace from "../panels/Apps/AppsWorkspace";
import InvoicingPanel from "../panels/InvoicingPanel";
import TemplatesWorkspace from "../panels/templates/TemplatesWorkspace";
import ContentWorkspace from "../panels/content/ContentWorkspace";
import BrainstormWorkspace from "../panels/brainstorm/BrainstormWorkspace";

import type { PanelDefinition } from "./types";

import CrmWorkspace from "../panels/crm/CrmWorkspace";

import CommunicationsPanel from "../panels/communications/CommunicationsPanel";

/*
 * One entry per CAPABILITY (keyed by feature code). Orders are unique and
 * ascending so the sidebar sort is deterministic. Procurement is a single
 * capability (system.procurement); its My Tenders / Open Tenders / Contracts
 * tabs live inside ProcurementWorkspace — they are NOT separate capabilities.
 */
export const PANELS: Record<string, PanelDefinition> = {
  "system.membership": {
    label: "Members",
    icon: Users,
    order: 0,
    slug: "members",
    component: MembersPanel,
  },
  "system.crm": {
    label: "CRM",
    icon: Users,
    order: 1,
    slug: "crm",
    component: CrmWorkspace,
  },

  "system.communications": {
    label: "Communications",
    icon: MessageSquare,
    order: 9,
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
    order: 44,
    slug: "kyc",
    component: KycPanel,
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
  "maicore.templates": {
    // NOTE: inconsistent code — rename to system.templates when convenient.
    label: "Templates",
    icon: LayoutTemplate,
    order: 55,
    slug: "templates",
    component: TemplatesWorkspace,
  },
  "system.content": {
    label: "Content",
    icon: Newspaper,
    order: 56,
    slug: "content",
    component: ContentWorkspace,
  },
  "system.brainstorm": {
    label: "Brainstorm",
    icon: Brain,
    order: 57,
    slug: "brainstorm",
    component: BrainstormWorkspace,
  },
  "system.inventory": {
    label: "Inventory",
    icon: Package,
    order: 60,
    slug: "inventory",
    component: InventoryWorkspace,
  },
  "system.marketplace": {
    label: "Marketplace",
    icon: Store,
    order: 70,
    slug: "marketplace",
    component: MarketplaceWorkspace,
  },
  "system.hierarchy": {
    label: "Manage",
    icon: Settings,
    order: 90,
    slug: "manage",
    component: ContainerManagementPanel,
  },
  "system.apps": {
    label: "Apps",
    icon: Blocks,
    order: 91,
    slug: "apps",
    component: AppsWorkspace,
  },
};

/** panel slug (from URL) → capability code. Guards against duplicate slugs. */
export const PANEL_SLUG_TO_CODE: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [code, p] of Object.entries(PANELS)) {
    if (map[p.slug]) {
      // Surfaces a collision in dev instead of silently overwriting.
      console.warn(
        `Duplicate panel slug "${p.slug}" (${map[p.slug]} vs ${code}).`,
      );
      continue;
    }
    map[p.slug] = code;
  }
  return map;
})();

/** Fallback icon for capabilities with no PANELS entry (e.g. driven by cap.family). */
export const FALLBACK_ICON = Blocks;

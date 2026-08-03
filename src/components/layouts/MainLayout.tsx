import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { DesktopSidebar } from "../navigation/DesktopSidebar";
import { MobileNav } from "../navigation/MobileNav";
import { useSidebarView } from "../../hooks/useSidebarView";
import { SidebarViewToggle } from "../navigation/SidebarViewToggle";
import { TopAppBar } from "../navigation/TopAppBar";

import type { NavItem } from "../navigation/types";

interface MainLayoutProps {
  items?: NavItem[];
  title?: string;
  actions?: ReactNode; // right side of TopAppBar, e.g. <UserMenu />
  sidebarFooter?: ReactNode; // optional footer inside DesktopSidebar
  mobileFooter?: ReactNode; // optional footer inside MobileNav popover
  showViewToggle?: boolean; // default true
  children?: ReactNode; // defaults to <Outlet /> for route usage
}

export function MainLayout({
  items,
  title = "Maicore",
  actions,
  sidebarFooter,
  mobileFooter,
  showViewToggle = true,
  children,
}: MainLayoutProps) {
  const [sidebarView, setSidebarView] = useSidebarView();

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black">
      <TopAppBar
        title={title}
        mobileNav={<MobileNav items={items} footer={mobileFooter} />}
        desktopExtra={
          showViewToggle ? (
            <SidebarViewToggle view={sidebarView} onChange={setSidebarView} />
          ) : undefined
        }
        actions={actions}
      />

      <div className="flex flex-1 min-h-0">
        <DesktopSidebar
          items={items}
          view={sidebarView}
          footer={sidebarFooter}
        />

        <main className="flex-1 bg-neutral-50 dark:bg-neutral-950 overflow-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

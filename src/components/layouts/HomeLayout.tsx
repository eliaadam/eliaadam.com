import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { DesktopSidebar } from "../navigation/DesktopSidebar";
import { MobileNav } from "../navigation/MobileNav";

import { useSidebarView } from "../../hooks/useSidebarView";
import { SidebarViewToggle } from "../navigation/SidebarViewToggle";
import { TopAppBar } from "../navigation/TopAppBar";
import { UserMenu } from "../navigation/UserMenu";

export function HomeLayout() {
  const { actor, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarView, setSidebarView] = useSidebarView();

  const params = new URLSearchParams(location.search);
  const activeTab =
    location.pathname === "/home" ? (params.get("tab") ?? "dashboard") : null;

  const goToTab = (tab: string) => navigate(`/home?tab=${tab}`);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black">
      <TopAppBar
        mobileNav={<MobileNav activeTab={activeTab} onSelectTab={goToTab} />}
        desktopExtra={
          <SidebarViewToggle view={sidebarView} onChange={setSidebarView} />
        }
        actions={<UserMenu actor={actor} isAdmin={isAdmin} onLogout={logout} />}
      />

      <div className="flex flex-1 min-h-0">
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={goToTab}
          view={sidebarView}
        />

        <main className="flex-1 bg-neutral-50 dark:bg-neutral-950   rounded-xl overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

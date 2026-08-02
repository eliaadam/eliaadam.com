import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { DesktopSidebar } from "../ui/DesktopSidebar";
import { MobileDrawer } from "../ui/MobileDrawer";
import { MobileTopBar } from "../ui/MobileTopBar";

export function HomeLayout() {
  const { actor, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const activeTab =
    location.pathname === "/home" ? (params.get("tab") ?? "dashboard") : null;

  const goToTab = (tab: string) => {
    navigate(`/home?tab=${tab}`);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black">
      <MobileTopBar
        mobileOpen={mobileOpen}
        onToggle={() => setMobileOpen((v) => !v)}
      />

      {mobileOpen && (
        <MobileDrawer
          activeTab={activeTab}
          isAdmin={isAdmin}
          onSelectTab={goToTab}
          onClose={() => setMobileOpen(false)}
          onLogout={logout}
        />
      )}

      <DesktopSidebar
        activeTab={activeTab}
        isAdmin={isAdmin}
        actor={actor}
        onSelectTab={goToTab}
        onLogout={logout}
      />

      <main className="flex-1 bg-neutral-50 dark:bg-neutral-950 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

import DashboardSection from "../components/home/DashboardSection";
import HomeSection from "../components/home/HomeSection";
import ProfileSection from "../components/home/ProfileSection";
import InvitationsSection from "../components/home/InvitationsSection";
import CreateSection from "../components/home/CreateSection";

export default function HomePage() {
  const { actor, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "dashboard";

  if (isLoading || !actor) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      {tab === "dashboard" && <DashboardSection />}
      {tab === "home" && <HomeSection />}
      {/*tab === "apps" && <AppsSection />*/}
      {tab === "invitations" && <InvitationsSection />}
      {tab === "create" && <CreateSection />}
      {tab === "profile" && <ProfileSection />}
    </div>
  );
}

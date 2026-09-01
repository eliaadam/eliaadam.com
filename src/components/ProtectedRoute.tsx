import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/Authcontext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Wait for the /me revalidation to settle before deciding — otherwise a
  // stale cached user would flash the dashboard even if its token was
  // already revoked server-side.
  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <Navigate to="/signin" replace state={{ from: location.pathname }} />
    );
  }

  return <>{children}</>;
}

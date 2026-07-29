import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AdminGuard() {
  const { isAuthenticated, isLoading, isAdmin, isAdminLoading } = useAuth();

  if (isLoading || (isAuthenticated && isAdminLoading)) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white animate-spin" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Verifying access…
        </p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;

  return <Outlet />;
}

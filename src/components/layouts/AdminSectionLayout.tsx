import { useAuth } from "../../hooks/useAuth";
import { MainLayout } from "./MainLayout";
import { UserMenu } from "../navigation/UserMenu";
import { adminNavItems } from "../navigation/adminNavigation";

export function AdminSectionLayout() {
  const { actor, isAdmin, logout } = useAuth();

  return (
    <MainLayout
      items={adminNavItems}
      title="Sonic Admin"
      actions={<UserMenu actor={actor} isAdmin={isAdmin} onLogout={logout} />}
    />
  );
}

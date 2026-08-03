import { useAuth } from "../../hooks/useAuth";
import { MainLayout } from "./MainLayout";
import { UserMenu } from "../navigation/UserMenu";
import { homeNavItems } from "../navigation/homeNavItems";

export function HomeSectionLayout() {
  const { actor, isAdmin, logout } = useAuth();

  return (
    <MainLayout
      items={homeNavItems}
      title="Hala"
      actions={<UserMenu actor={actor} isAdmin={isAdmin} onLogout={logout} />}
    />
  );
}

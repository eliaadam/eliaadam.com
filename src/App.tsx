import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard, GuestGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";
import ContainerKindManagementPage from "./pages/admin/ContainerKindManagementPage";
import ContainerTemplateManagementPage from "./pages/admin/ContainerTemplateManagementPage";
import HierarchyTemplateManagementPage from "./pages/admin/HierarchyTemplateManagementPage";

const ContainerWorkspacePage = lazy(
  () => import("./pages/user/ContainerWorkspacePage"),
);

const RolePermissionManagementPage = lazy(
  () => import("./pages/admin/RolePermissionManagementPage"),
);

import HomePage from "./pages/HomePage";
import AuditExplorer from "./pages/admin/AuditExplorer";
import SystemSpace from "./pages/admin/SystemSpace";
import PublicPayPage from "./pages/PublicPayPage";
import { PaymentSettingsPage } from "./pages/user/PaymentSettingsPage";
import { KycReviewPage } from "./pages/admin/KycReviewPage";
import { PayoutsAdminPage } from "./pages/admin/PayoutsAdminPage";
import { InstantiationRulesPage } from "./pages/admin/InstantiationRulesPage";
import { SubscriptionPlansPage } from "./pages/admin/SubscriptionPlansPage";
import { VouchersPage } from "./pages/admin/VouchersPage";
import { SubscriptionsAdminPage } from "./pages/admin/SubscriptionsAdminPage";
import { QuestionnairesPage } from "./pages/user/panels/QuestionnairesPage";
import { InstantiationRequestsPage } from "./pages/user/panels/InstantiationRequestsPage";
import LoginPage from "./pages/LoginPage";
import ContainerManagementPage from "./pages/admin/containers/ContainerManagementPage";
import { HomeSectionLayout } from "./components/layouts/HomeSectionLayout";
import { AdminSectionLayout } from "./components/layouts/AdminSectionLayout";
import CapabilityRegistryWorkspace from "./pages/admin/registry/CapabilityRegistryWorkspace";
import Home from "./pages/Home";

const PublicSlugPage = lazy(() => import("./pages/PublicSlugPage"));

const SignupPage = lazy(() => import("./pages/SignupPage"));

const AdminOverviewPage = lazy(() => import("./pages/admin/AdminOverviewPage"));
const ActorManagementPage = lazy(
  () => import("./pages/admin/ActorManagementPage"),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function PageLoader() {
  return (
    <div style={styles.loader}>
      <div style={styles.spinner} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Guest routes */}
            <Route path="/" element={<Home />} />
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
            {/* PUBLIC — pay a link with no account. Keep it out of every guard. */}
            <Route path="/pay/:slug" element={<PublicPayPage />} />
            {/* Authenticated routes (inside MainLayout) */}
            <Route element={<AuthGuard />}>
              <Route element={<HomeSectionLayout />}>
                <Route path="/home" element={<HomePage />} />

                <Route
                  path="/u/workspace/:containerId"
                  element={<ContainerWorkspacePage />}
                />
                <Route
                  path="/u/workspace/:containerId/:panel"
                  element={<ContainerWorkspacePage />}
                />
                <Route
                  path="/:slug/:panel"
                  element={<ContainerWorkspacePage />}
                />
              </Route>
            </Route>

            {/* Admin routes — requires auth + system.admin */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminSectionLayout />}>
                <Route
                  path="/admin/roles"
                  element={<RolePermissionManagementPage />}
                />
                <Route
                  path="/admin/questionnaires"
                  element={<QuestionnairesPage />}
                />
                <Route
                  path="/admin/instantiation-requests"
                  element={<InstantiationRequestsPage />}
                />
                <Route path="/admin" element={<AdminOverviewPage />} />
                <Route path="/admin/actors" element={<ActorManagementPage />} />
                <Route
                  path="/admin/containers"
                  element={<ContainerManagementPage />}
                />
                <Route
                  path="/admin/container-kinds"
                  element={<ContainerKindManagementPage />}
                />
                <Route
                  path="/admin/container-templates"
                  element={<ContainerTemplateManagementPage />}
                />
                <Route
                  path="/admin/hierarchy-templates"
                  element={<HierarchyTemplateManagementPage />}
                />
                <Route
                  path="/admin/payment-settings"
                  element={<PaymentSettingsPage />}
                />

                <Route
                  path="/admin/registry"
                  element={<CapabilityRegistryWorkspace />}
                />
                <Route path="/admin/audit" element={<AuditExplorer />} />
                <Route path="/admin/systemspace" element={<SystemSpace />} />
                <Route path="/admin/payouts" element={<PayoutsAdminPage />} />
                <Route path="/admin/kyc-review" element={<KycReviewPage />} />
                <Route
                  path="/admin/subscription-plans"
                  element={<SubscriptionPlansPage />}
                />
                <Route path="/admin/vouchers" element={<VouchersPage />} />
                <Route
                  path="/admin/subscriptions"
                  element={<SubscriptionsAdminPage />}
                />
                <Route
                  path="/admin/instantiation-grants"
                  element={<InstantiationRulesPage />}
                />
              </Route>
            </Route>

            <Route path="/:slug" element={<PublicSlugPage />} />
            <Route path="/pay/:slug" element={<PublicPayPage />} />

            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
};

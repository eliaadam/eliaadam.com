import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard, GuestGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/AdminGuard";
import { AdminLayout } from "./components/AdminLayout";
import ContainerManagementPage from "./pages/admin/ContainerManagementPage";
import ContainerKindManagementPage from "./pages/admin/ContainerKindManagementPage";
import ContainerTemplateManagementPage from "./pages/admin/ContainerTemplateManagementPage";
import HierarchyTemplateManagementPage from "./pages/admin/HierarchyTemplateManagementPage";

const ContainerWorkspacePage = lazy(
  () => import("./pages/user/ContainerWorkspacePage"),
);

import { HomeLayout } from "./components/HomeLayout";

const RolePermissionManagementPage = lazy(
  () => import("./pages/admin/RolePermissionManagementPage"),
);

import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";

import AuditExplorer from "./pages/admin/AuditExplorer";
import SystemSpace from "./pages/admin/SystemSpace";
import PublicPayPage from "./pages/PublicPayPage";
import { PaymentSettingsPage } from "./pages/user/PaymentSettingsPage";
import { KycReviewPage } from "./pages/admin/KycReviewPage";
import { PayoutsAdminPage } from "./pages/admin/PayoutsAdminPage";
import CapabilityRegistryWorkspace from "./pages/admin/CapabilityRegistryWorkspace";
import { InstantiationRulesPage } from "./pages/admin/InstantiationRulesPage";
import { SubscriptionPlansPage } from "./pages/admin/SubscriptionPlansPage";
import { VouchersPage } from "./pages/admin/VouchersPage";
import { SubscriptionsAdminPage } from "./pages/admin/SubscriptionsAdminPage";
import { QuestionnairesPage } from "./pages/user/panels/QuestionnairesPage";
import { InstantiationRequestsPage } from "./pages/user/panels/InstantiationRequestsPage";
const PublicSlugPage = lazy(() => import("./pages/PublicSlugPage"));

const LoginPage = lazy(() => import("./pages/LoginPage"));
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
            <Route path="/" element={<LandingPage />} />
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Authenticated routes (inside HomeLayout) */}
            <Route element={<AuthGuard />}>
              <Route element={<HomeLayout />}>
                <Route path="/home" element={<HomePage />} />

                {/* Workspace by internal id — for containers WITHOUT a slug,
                    and the entry the "Open in workspace" button uses before the
                    workspace canonicalises itself to a slug when one exists. */}
                <Route
                  path="/u/workspace/:containerId"
                  element={<ContainerWorkspacePage />}
                />
                <Route
                  path="/u/workspace/:containerId/:panel"
                  element={<ContainerWorkspacePage />}
                />

                {/* Workspace by vanity slug — SAME guard + layout as the id
                    route, so /acme/members renders identically to the uuid path.
                    This is the authenticated workspace, just at a pretty
                    address. (The bare-slug public stub below stays outside the
                    layout on purpose.) */}
                <Route
                  path="/:slug/:panel"
                  element={<ContainerWorkspacePage />}
                />
              </Route>
            </Route>

            {/* Admin routes — requires auth + system.admin */}
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
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

            {/* Public vanity landing — bare (no app chrome), it's a public page.
                MUST come after all fixed routes and after /:slug/:panel above,
                so it only catches a single bare segment nothing else claimed. */}
            <Route path="/:slug" element={<PublicSlugPage />} />
            <Route path="/pay/:slug" element={<PublicPayPage />} />
            {/* Catch-all */}
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

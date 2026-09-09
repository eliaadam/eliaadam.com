import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./components/context/Authcontext";
import { ContainerProvider } from "./components/context/ContainerContext";
import { ThemeProvider } from "./components/context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/Dashboardlayout";
import { Home } from "./page/Home";
import { Signin } from "./page/Signin";
import { Signup } from "./page/Signup";
import { PublicFormFill } from "./page/PublicFormFill";
import { Profile } from "./page/dashboard/Profile";
import { Containers } from "./page/dashboard/Containers";
import { ContainerMembers } from "./page/dashboard/ContainerMembers";
import { JoinRequests } from "./page/dashboard/JoinRequests";
import { ContainerSettings } from "./page/dashboard/ContainerSettings";
import { CapabilityPlaceholder } from "./page/dashboard/CapabilityPlaceholder";
import { Actors } from "./page/dashboard/admin/Actors";
import { AdminHub } from "./page/dashboard/admin/AdminHub";
import { ContainerHierarchy } from "./page/dashboard/admin/ContainerHierarchy";
import { AllContainers } from "./page/dashboard/admin/AllContainers";
import { LicenseContainer } from "./page/dashboard/admin/LicenseContainer";
import { Provisioning } from "./page/dashboard/admin/Provisioning";
import { Templates } from "./page/dashboard/Templates";
import { InstantiationRequests } from "./page/dashboard/InstantiationRequests";
import { Invitations } from "./page/dashboard/Invitations";
import { MyInstantiationRequests } from "./page/dashboard/MyInstantiationRequests";
import { Forms } from "./page/dashboard/Forms";
import { FormEditor } from "./page/dashboard/FormEditor";
import { FormResponses } from "./page/dashboard/FormResponses";
import { FormFill } from "./page/dashboard/FormFill";
import { Communication } from "./page/dashboard/Communication";
import { Payment } from "./page/dashboard/Payment";
import { Subscription } from "./page/dashboard/Subscription";
import { MySubscriptions } from "./page/dashboard/MySubscriptions";
import { Marketplace } from "./page/dashboard/Marketplace";
import { MyPurchases } from "./page/dashboard/MyPurchases";
import { PaymentWalletDetail } from "./page/dashboard/PaymentWalletDetail";
import { PaymentIntentDetail } from "./page/dashboard/PaymentIntentDetail";
import { queryClient } from "./lib/query/Queryclient";

/**
 * Pure router + provider wiring. Every actual page/component lives in
 * its own file under `page/` or `components/` — this file's only job
 * is composing them into routes. `Home` and `CapabilityPlaceholder`
 * used to be defined inline here; both are now `page/Home.tsx` and
 * `page/dashboard/CapabilityPlaceholder.tsx`.
 *
 * FIX: `<ContainerProvider>` and `<BrowserRouter>` were previously
 * nested the other way around (ContainerProvider outside the
 * Router) — `ContainerProvider`'s own `switchContainer()` needs
 * `useNavigate()` to redirect away from a capability-specific page
 * when the user switches containers (see ContainerContext.tsx's own
 * fix notes), and that hook throws immediately if called outside a
 * Router. Swapped so `<BrowserRouter>` is the direct parent of
 * `<ContainerProvider>` instead. `<AuthProvider>` stays OUTSIDE both,
 * unchanged — `ContainerProvider` also calls `useAuth()` internally,
 * so it still needs `AuthProvider` as an ancestor regardless of where
 * the Router sits relative to it.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ContainerProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/signup" element={<Signup />} />
                {/* Genuinely public — no auth, outside ProtectedRoute
                    entirely. Matches "anonymous responses allowed" at
                    the platform level. */}
                <Route path="/f/:formId" element={<PublicFormFill />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Containers />} />
                  <Route path="profile" element={<Profile />} />
                  <Route
                    path="containers/:containerId/members"
                    element={<ContainerMembers />}
                  />
                  <Route
                    path="containers/:containerId/join-requests"
                    element={<JoinRequests />}
                  />
                  <Route
                    path="containers/:containerId/settings"
                    element={<ContainerSettings />}
                  />
                  <Route path="templates" element={<Templates />} />
                  <Route
                    path="templates/:templateCode/requests"
                    element={<InstantiationRequests />}
                  />
                  <Route path="invitations" element={<Invitations />} />
                  <Route
                    path="my-instantiation-requests"
                    element={<MyInstantiationRequests />}
                  />
                  {/* Static "form" route takes priority over the
                      dynamic :capabilityRoute catch-all below — React
                      Router ranks a literal segment above a param
                      segment regardless of declaration order. This is
                      also exactly the route
                      capabilities/core/form's manifest navigation()
                      points CapabilityNavLink at once core.form is
                      licensed, so the sidebar link and this route
                      agree without needing to touch
                      CapabilityPlaceholder at all. */}
                  <Route path="form" element={<Forms />} />
                  <Route path="form/:formId" element={<FormEditor />} />
                  <Route path="form/:formId/fill" element={<FormFill />} />
                  <Route
                    path="form/:formId/responses"
                    element={<FormResponses />}
                  />
                  {/* Static "communication" route, same priority
                      reasoning as "form" above — takes precedence over
                      the dynamic :capabilityRoute catch-all regardless
                      of declaration order. Matches the manifest's own
                      navigation().route exactly. */}
                  <Route path="communication" element={<Communication />} />
                  <Route
                    path="communication/:conversationId"
                    element={<Communication />}
                  />
                  {/* Static "payment" route, same priority reasoning
                      as "form"/"communication" above. Matches the
                      manifest's own navigation().route exactly. */}
                  <Route path="payment" element={<Payment />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route
                    path="my-subscriptions"
                    element={<MySubscriptions />}
                  />
                  <Route path="marketplace" element={<Marketplace />} />
                  <Route path="my-purchases" element={<MyPurchases />} />
                  <Route
                    path="payment/wallets/:walletId"
                    element={<PaymentWalletDetail />}
                  />
                  <Route
                    path="payment/:intentId"
                    element={<PaymentIntentDetail />}
                  />
                  <Route path="admin/hub" element={<AdminHub />} />
                  <Route path="admin/actors" element={<Actors />} />
                  <Route
                    path="admin/containers"
                    element={<ContainerHierarchy />}
                  />
                  <Route
                    path="admin/all-containers"
                    element={<AllContainers />}
                  />
                  <Route
                    path="admin/license-container"
                    element={<LicenseContainer />}
                  />
                  <Route path="admin/provisioning" element={<Provisioning />} />
                  <Route
                    path=":capabilityRoute"
                    element={<CapabilityPlaceholder />}
                  />
                </Route>
              </Routes>
            </ContainerProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
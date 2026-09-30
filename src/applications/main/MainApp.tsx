import "../../lib/registries/registrations";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../../components/context/Authcontext";
import { ContainerProvider } from "../../components/context/ContainerContext";
import { ThemeProvider } from "../../components/context/ThemeContext";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { DashboardLayout } from "../../components/layout/Dashboardlayout";
import { Signin } from "../../page/Signin";
import { Signup } from "../../page/Signup";
import { PublicFormFill } from "../../page/PublicFormFill";
import { Profile } from "../../page/dashboard/Profile";
import { Containers } from "../../page/dashboard/Containers";
import { ContainerMembers } from "../../page/dashboard/ContainerMembers";
import { JoinRequests } from "../../page/dashboard/JoinRequests";
import { ContainerSettings } from "../../page/dashboard/ContainerSettings";
import { CapabilityPlaceholder } from "../../page/dashboard/CapabilityPlaceholder";
import { Actors } from "../../page/dashboard/admin/Actors";
import { AdminHub } from "../../page/dashboard/admin/AdminHub";
import { ContainerHierarchy } from "../../page/dashboard/admin/ContainerHierarchy";
import { AllContainers } from "../../page/dashboard/admin/AllContainers";
import { LicenseContainer } from "../../page/dashboard/admin/LicenseContainer";
import { Provisioning } from "../../page/dashboard/admin/Provisioning";
import { Templates } from "../../page/dashboard/Templates";
import { InstantiationRequests } from "../../page/dashboard/InstantiationRequests";
import { Invitations } from "../../page/dashboard/Invitations";
import { MyInstantiationRequests } from "../../page/dashboard/MyInstantiationRequests";
import { Forms } from "../../page/dashboard/Forms";
import { FormEditor } from "../../page/dashboard/FormEditor";
import { FormResponses } from "../../page/dashboard/FormResponses";
import { FormFill } from "../../page/dashboard/FormFill";
import { Communication } from "../../page/dashboard/Communication";
import { Inventory } from "../../page/dashboard/Inventory";
import { PaymentGateway } from "../../page/dashboard/PaymentGateway";
import { Subscription } from "../../page/dashboard/Subscription";
import { MySubscriptions } from "../../page/dashboard/MySubscriptions";
import { MyPurchases } from "../../page/dashboard/MyPurchases";
import { queryClient } from "../../lib/query/Queryclient";
import HomePage from "../../page/home/HomePage";
import { Payment } from "../../page/payment/Payment";
import { PaymentWalletDetail } from "../../page/payment/PaymentWalletDetail";
import { Events } from "../../page/dashboard/Events";
import { AccountCreationDoc } from "../../page/docs/AccountCreationDoc";
import { AuthenticationDoc } from "../../page/docs/AuthenticationDoc";
import { CollectionDoc } from "../../page/docs/CollectionDoc";
import { ContainerInstantiationDoc } from "../../page/docs/ContainerInstantiationDoc";
import { CredentialsDoc } from "../../page/docs/CredentialsDoc";
import { DocsLayout } from "../../page/docs/DocsLayout";
import { IdempotencyDoc } from "../../page/docs/IdempotencyDoc";
import { PayoutsDoc } from "../../page/docs/PayoutsDoc";
import { Marketplace } from "../../page/dashboard/Marketplace";
import { PaymentReporting } from "../../page/dashboard/PaymentReporting";
import { PaymentReportingWalletDetail } from "../../page/dashboard/PaymentReportingWalletDetail";
import { SubscribeToPlan } from "../../page/dashboard/SubscribeToPlan";
import { PaymentGatewayApprovals } from "../../page/dashboard/admin/PaymentGatewayApprovals";
import { PaymentGatewaySettings } from "../../page/dashboard/admin/PaymentGatewaySettings";
import { FulfillmentDashboard } from "../../page/dashboard/FulfillmentDashboard";
import { MyFulfillments } from "../../page/dashboard/MyFulfillments";
import { LogisticsDashboard } from "../../page/dashboard/LogisticsDashboard";
import { Carriers } from "../../page/dashboard/Carriers";
import { MyOrders } from "../../page/dashboard/MyOrders";
import { Cart } from "../../page/dashboard/Cart";
import { CartProvider } from "../../context/CartContext";
import { MyTasks } from "../../page/dashboard/MyTasks";
import { ProjectsDashboard } from "../../page/dashboard/ProjectsDashboard";
import { ProjectDetail } from "../../page/dashboard/ProjectDetail";
import { HRDashboard } from "../../page/dashboard/HRDashboard";
import { EmployeeDetail } from "../../page/dashboard/EmployeeDetail";
import { MyHR } from "../../page/dashboard/MyHR";
import { CRMDashboard } from "../../page/dashboard/CRMDashboard";
import { AccountDetail } from "../../page/dashboard/AccountDetail";
import { MyCRM } from "../../page/dashboard/MyCRM";
import { TemplateLibraryDashboard } from "../../page/dashboard/TemplateLibraryDashboard";
import { InventoryCatalogDashboard } from "../../page/dashboard/InventoryCatalogDashboard";
import { FinanceDashboard } from "../../page/dashboard/FinanceDashboard";
import { PosDashboard } from "../../page/dashboard/PosDashboard";
import { CustomerCreditDashboard } from "../../page/dashboard/CustomerCreditDashboard";
import { EducationDashboard } from "../../page/dashboard/EducationDashboard";

/**
 * Pure router + provider wiring. Every actual page/component lives in
 * its own file under `page/` or `components/` — this file's only job
 * is composing them into routes. `Home` and `CapabilityPlaceholder`
 * used to be defined inline here; both are now `page/Home.tsx` and
 * `page/dashboard/CapabilityPlaceholder.tsx`.
 */
function MainApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ContainerProvider>
              <CartProvider>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/docs" element={<DocsLayout />}>
                    <Route
                      index
                      element={<Navigate to="account-creation" replace />}
                    />
                    <Route
                      path="account-creation"
                      element={<AccountCreationDoc />}
                    />
                    <Route
                      path="container-instantiation"
                      element={<ContainerInstantiationDoc />}
                    />
                    <Route path="credentials" element={<CredentialsDoc />} />
                    <Route
                      path="authentication"
                      element={<AuthenticationDoc />}
                    />
                    <Route path="collection" element={<CollectionDoc />} />
                    <Route path="idempotency" element={<IdempotencyDoc />} />
                    <Route path="payouts" element={<PayoutsDoc />} />
                  </Route>
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
                    <Route path="education" element={<EducationDashboard />} />
                    <Route
                      path="subscribe/plan/:planId"
                      element={<SubscribeToPlan />}
                    />
                    <Route
                      path="containers/:containerId/settings"
                      element={<ContainerSettings />}
                    />
                    <Route path="container-templates" element={<Templates />} />
                    <Route
                      path="templates/:templateCode/requests"
                      element={<InstantiationRequests />}
                    />
                    <Route
                      path="payment-reporting"
                      element={<PaymentReporting />}
                    />
                    <Route
                      path="payment-reporting/wallets/:walletId"
                      element={<PaymentReportingWalletDetail />}
                    />
                    <Route path="invitations" element={<Invitations />} />
                    <Route
                      path="my-instantiation-requests"
                      element={<MyInstantiationRequests />}
                    />
                    <Route path="projects" element={<ProjectsDashboard />} />
                    <Route
                      path="projects/:projectId"
                      element={<ProjectDetail />}
                    />
                    <Route path="my-tasks" element={<MyTasks />} />
                    {/* Static "hr" route, same priority reasoning as
                      "form"/"communication"/etc. below — ranked above
                      the dynamic :capabilityRoute catch-all regardless
                      of declaration order. "hr/employees/:employeeId"
                      is a distinct two-segment path, so it can't
                      collide with the single-segment catch-all either. */}
                    <Route path="hr" element={<HRDashboard />} />
                    <Route
                      path="hr/employees/:employeeId"
                      element={<EmployeeDetail />}
                    />
                    <Route
                      path="templates"
                      element={<TemplateLibraryDashboard />}
                    />
                    <Route
                      path="inventory-catalog"
                      element={<InventoryCatalogDashboard />}
                    />
                    <Route path="my-hr" element={<MyHR />} />
                    {/* Static "crm" route, same priority reasoning as
                      "hr" above — ranked over the :capabilityRoute
                      catch-all regardless of declaration order.
                      "crm/accounts/:accountId" is a distinct
                      three-segment path, so it can't collide with the
                      single-segment catch-all either. Matches
                      CRMCapability's own navigation().route exactly. */}
                    <Route path="crm" element={<CRMDashboard />} />
                    <Route
                      path="crm/accounts/:accountId"
                      element={<AccountDetail />}
                    />
                    <Route path="my-crm" element={<MyCRM />} />
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
                    <Route path="pos" element={<PosDashboard />} />
                    <Route
                      path="customer-credit"
                      element={<CustomerCreditDashboard />}
                    />
                    <Route
                      path="form/:formId/responses"
                      element={<FormResponses />}
                    />
                    <Route path="finance" element={<FinanceDashboard />} />
                    {/* Static "communication" route, same priority
                      reasoning as "form" above. */}
                    <Route path="communication" element={<Communication />} />
                    <Route
                      path="communication/:conversationId"
                      element={<Communication />}
                    />
                    {/* Static "payment" route, same priority reasoning
                      as "form"/"communication" above. Now the single,
                      tabbed consolidation — see this file's own note
                      above on what moved inline. */}
                    <Route path="payment" element={<Payment />} />
                    <Route
                      path="payment/wallets/:walletId"
                      element={<PaymentWalletDetail />}
                    />
                    <Route
                      path="payment-gateway"
                      element={<PaymentGateway />}
                    />
                    {/* Static "inventory" route, same priority reasoning
                      as "payment"/"form"/"communication" above.
                      Matches InventoryCapability's own
                      navigation().route exactly. */}
                    <Route path="inventory" element={<Inventory />} />
                    {/* Static "events" route, same priority reasoning as
                      "inventory"/"payment"/"form" above. Matches
                      EventsCapability's own navigation().route
                      exactly. */}
                    <Route path="events" element={<Events />} />
                    <Route path="subscription" element={<Subscription />} />
                    <Route
                      path="my-subscriptions"
                      element={<MySubscriptions />}
                    />
                    <Route path="marketplace" element={<Marketplace />} />
                    <Route path="cart" element={<Cart />} />
                    <Route path="my-purchases" element={<MyPurchases />} />
                    <Route path="my-orders" element={<MyOrders />} />
                    <Route
                      path="my-fulfillments"
                      element={<MyFulfillments />}
                    />
                    {/* Static "fulfillment" route, same priority
                      reasoning as "inventory"/"events" above. Matches
                      FulfillmentCapability's own navigation().route
                      exactly. */}
                    <Route
                      path="fulfillment"
                      element={<FulfillmentDashboard />}
                    />
                    {/* Static "logistics" route, same priority
                      reasoning as "fulfillment"/"inventory"/"events"
                      above. Matches LogisticsCapability's own
                      navigation().route exactly. */}
                    <Route path="logistics" element={<LogisticsDashboard />} />
                    <Route path="carriers" element={<Carriers />} />
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
                    <Route
                      path="admin/provisioning"
                      element={<Provisioning />}
                    />
                    <Route
                      path="admin/payment-gateway-approvals"
                      element={<PaymentGatewayApprovals />}
                    />
                    <Route
                      path="admin/payment-gateway-settings"
                      element={<PaymentGatewaySettings />}
                    />
                    <Route
                      path=":capabilityRoute"
                      element={<CapabilityPlaceholder />}
                    />
                  </Route>
                </Routes>
              </CartProvider>
            </ContainerProvider>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default MainApp;

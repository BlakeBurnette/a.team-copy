import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Public / marketing - only eager-load the landing page; lazy-load everything
// else to minimize the initial bundle and eliminate the flash of raw HTML.
import MarketingLanding from './pages/MarketingLanding';
const PublicSignup = React.lazy(() => import('./pages/PublicSignup'));
const GetStartedSplash = React.lazy(() => import('./pages/GetStartedSplash'));
const WhitePaper = React.lazy(() => import('./pages/WhitePaper'));
const PropertyManagersLanding = React.lazy(() => import('./pages/landing/PropertyManagersLanding'));
const RealEstateLanding = React.lazy(() => import('./pages/landing/RealEstateLanding'));
const HOALanding = React.lazy(() => import('./pages/landing/HOALanding'));
const VendorsLanding = React.lazy(() => import('./pages/landing/VendorsLanding'));
const ListingHiveLanding = React.lazy(() => import('./pages/landing/ListingHiveLanding'));
const ListingHiveSuccess = React.lazy(() => import('./pages/landing/ListingHiveSuccess'));
const Login = React.lazy(() => import('./pages/Login'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const PasskeysSettings = React.lazy(() => import('./pages/PasskeysSettings'));
const StepUp = React.lazy(() => import('./pages/StepUp'));
const BackupCodes = React.lazy(() => import('./pages/BackupCodes'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const SetPassword = React.lazy(() => import('./pages/SetPassword'));
const LegalPrivacy = React.lazy(() => import('./pages/LegalPrivacy'));
const LegalTerms = React.lazy(() => import('./pages/LegalTerms'));
const SecurityPage = React.lazy(() => import('./pages/SecurityPage'));
const DNAPage = React.lazy(() => import('./pages/DNAPage'));
const CareersPage = React.lazy(() => import('./pages/CareersPage'));
const BlogPage = React.lazy(() => import('./pages/BlogPage'));
const BlogPostPage = React.lazy(() => import('./pages/BlogPostPage'));
const Unauthorized = React.lazy(() => import('./pages/Unauthorized'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const MagicApproval = React.lazy(() => import('./pages/public/MagicApproval'));
const MagicQuote = React.lazy(() => import('./pages/public/MagicQuote'));
const MagicResolve = React.lazy(() => import('./pages/public/MagicResolve'));
const PublicPropertyHistory = React.lazy(() => import('./pages/public/PublicPropertyHistory'));
const PublicProof = React.lazy(() => import('./pages/public/PublicProof'));
const OrgInfo = React.lazy(() => import('./pages/OrgInfo.jsx'));
const MagicLinkCallback = React.lazy(() => import('./pages/MagicLinkCallback'));
const SsoCallback = React.lazy(() => import('./pages/SsoCallback'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const VendorOnboarding = React.lazy(() => import('./pages/VendorOnboarding'));

// Auth guard
import ProtectedRoute from './ProtectedRoute';

// Auth context
import { useUserProfile } from './context/AuthContext';

// LAZY LOAD all authenticated app routes (reduces initial bundle dramatically!)
// Public owner onboarding
const OwnerOnboard = React.lazy(() => import('./pages/OwnerOnboard'));
const StripeReturn = React.lazy(() => import('./pages/owner/StripeReturn'));
const StripeRefresh = React.lazy(() => import('./pages/owner/StripeRefresh'));
const OwnerOnboardStripeCallback = React.lazy(() => import('./pages/OwnerOnboardStripeCallback'));
const OwnerOnboardEntry = React.lazy(() => import('./pages/OwnerOnboardEntry'));

// App layout + pages
const Dashboard = React.lazy(() => import('./Dashboard'));
const DashboardHome = React.lazy(() => import('./pages/DashboardHome'));
const SirWalterDashboard = React.lazy(() => import('./pages/SirWalterDashboard'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Settings = React.lazy(() => import('./pages/Settings'));
const CustomersIndex = React.lazy(() => import('./pages/CustomersIndex'));
const OnboardCustomer = React.lazy(() => import('./pages/OnboardCustomer'));
const Schedule = React.lazy(() => import('./pages/schedule'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Insights = React.lazy(() => import('./pages/Insights'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Services = React.lazy(() => import('./pages/Services'));
const OwnerQuotesQueue = React.lazy(() => import('./pages/owner/QuotesQueue'));
const Crews = React.lazy(() => import('./pages/Crews'));
const History = React.lazy(() => import('./pages/History'));
const CustomerWorkspace = React.lazy(() => import('./pages/CustomerWorkspace'));
const BusinessWorkspace = React.lazy(() => import('./pages/BusinessWorkspace'));
const SalesWorkspace = React.lazy(() => import('./pages/SalesWorkspace'));
const AdminWorkspace = React.lazy(() => import('./pages/AdminWorkspace'));
const AccountingWorkspace = React.lazy(() => import('./pages/AccountingWorkspace'));
const UserDashboard = React.lazy(() => import('./pages/UserDashboard'));
const AcceptInvite = React.lazy(() => import('./pages/AcceptInvite'));
const InvoiceShow = React.lazy(() => import('./pages/InvoiceShow'));
const ServiceReceiptView = React.lazy(() => import('./pages/ServiceReceiptView'));
const ARDashboard = React.lazy(() => import('./pages/ARDashboard'));
const CustomerARView = React.lazy(() => import('./pages/portal/CustomerARView'));
const ServiceRecordsIndex = React.lazy(() => import('./pages/ServiceRecordsIndex'));
const ServiceRecordDetail = React.lazy(() => import('./pages/ServiceRecordDetail'));
const CrewDashboard = React.lazy(() => import('./pages/CrewDashboard'));
const CrewTeam = React.lazy(() => import('./pages/CrewTeam'));
const CrewCustomers = React.lazy(() => import('./pages/CrewCustomers'));
const MyTimecards = React.lazy(() => import('./pages/MyTimecards'));
const AdminOrgFeatures = React.lazy(() => import('./pages/AdminOrgFeatures'));

// Projects (Prime/Sub flow)
const Projects = React.lazy(() => import('./pages/Projects'));
const ProjectDetail = React.lazy(() => import('./pages/ProjectDetail'));
const ParticipatingProjects = React.lazy(() => import('./pages/ParticipatingProjects'));
const ProjectWork = React.lazy(() => import('./pages/ProjectWork'));
const AcceptProjectInvite = React.lazy(() => import('./pages/AcceptProjectInvite'));

// Account
const AccountIndex = React.lazy(() => import('./pages/Account'));
const PaymentsUser = React.lazy(() => import('./pages/PaymentsUser'));
const UserInvoices = React.lazy(() => import('./pages/UserInvoices'));
const PropertyHistory = React.lazy(() => import('./pages/PropertyHistory'));
const UserServiceRecords = React.lazy(() => import('./pages/portal/UserServiceRecords'));
const UserServiceRecordDetail = React.lazy(() => import('./pages/portal/UserServiceRecordDetail'));
const UserPropertyHistory = React.lazy(() => import('./pages/portal/UserPropertyHistory'));
const Approvals = React.lazy(() => import('./pages/portal/Approvals'));
const OwnerApprovals = React.lazy(() => import('./pages/OwnerApprovals'));
const Properties = React.lazy(() => import('./pages/Properties'));
const Explore = React.lazy(() => import('./pages/Explore'));
const Offers = React.lazy(() => import('./pages/Offers'));
const AuthorizationHistory = React.lazy(() => import('./pages/AuthorizationHistory'));
const PaymentHistory = React.lazy(() => import('./pages/PaymentHistory'));
const SignupAchAuthorizationPage = React.lazy(() => import('./pages/SignupAchAuthorizationPage'));
const ApprovalFlags = React.lazy(() => import('./pages/admin/ApprovalFlags'));
const Passkeys = React.lazy(() => import('./pages/portal/Passkeys'));
const ResolvePayment = React.lazy(() => import('./pages/portal/ResolvePayment'));
const MigratedApiSmoke = React.lazy(() => import('./pages/MigratedApiSmoke'));
const GustoIntegration = React.lazy(() => import('./pages/admin/GustoIntegration'));
const SecurityDashboard = React.lazy(() => import('./pages/admin/SecurityDashboard'));
const Applications = React.lazy(() => import('./pages/admin/Applications'));
const JobApplication = React.lazy(() => import('./pages/JobApplication'));

// CRM pages (pulled from hive-crm frontend)
const CrmDashboard = React.lazy(() => import('./pages/crm/CrmDashboard'));
const CrmPipeline = React.lazy(() => import('./pages/crm/Pipeline'));
const CrmContacts = React.lazy(() => import('./pages/crm/CrmContacts'));
const CrmOrganizations = React.lazy(() => import('./pages/crm/CrmOrganizations'));
const CrmFeedbackDashboard = React.lazy(() => import('./pages/crm/FeedbackDashboard'));
const CrmTasks = React.lazy(() => import('./pages/crm/CrmTasks'));
const CrmUsers = React.lazy(() => import('./pages/crm/CrmUsers'));
const CrmSettings = React.lazy(() => import('./pages/crm/CrmSettings'));
const CrmAdmin = React.lazy(() => import('./pages/crm/CrmAdmin'));
const CrmNightlyLeads = React.lazy(() => import('./pages/crm/NightlyLeads'));
const CrmB2CLeads = React.lazy(() => import('./pages/crm/B2CLeads'));


// Invites / signup flows
const AppInvite = React.lazy(() => import('./pages/AppInvite'));
const Signup = React.lazy(() => import('./pages/Signup'));
const SignupPayment = React.lazy(() => import('./pages/SignupPayment'));
const SignupDone = React.lazy(() => import('./pages/SignupDone'));

export const RouteAddsRedirect = () => <Navigate to="/app/schedule" replace />;

/** Everyone lands on Sir Walter. */
function RoleIndex() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <SirWalterDashboard />
    </Suspense>
  );
}

/** Reads :id from /invoices/:id and redirects to /app/invoices/<id> */
function LegacyInvoiceRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/invoices/${encodeURIComponent(id ?? '')}`} replace />;
}

/** Reads :id from /service-records/:id and redirects to /app/service-records/<id> */
function LegacyServiceRecordRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/service-records/${encodeURIComponent(id ?? '')}`} replace />;
}

/** Redirect /service-records to /app/service-records */
function LegacyServiceRecordIndexRedirect() {
  return <Navigate to="/app/service-records" replace />;
}

/** Redirect /properties/:id/history to /app/properties/:id/history */
function LegacyPropertyHistoryRedirect() {
  const { propertyId } = useParams();
  return <Navigate to={`/app/properties/${encodeURIComponent(propertyId ?? '')}/history`} replace />;
}

// Loading component for lazy routes
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-neutral-600">Loading...</div>
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoader />}>
    <Routes>
      {/* Public marketing site */}
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/whitepaper" element={<WhitePaper />} />
      <Route path="/property-managers" element={<PropertyManagersLanding />} />
      <Route path="/real-estate" element={<RealEstateLanding />} />
      <Route path="/hoa" element={<HOALanding />} />
      <Route path="/vendors" element={<VendorsLanding />} />
      <Route path="/listings" element={<ListingHiveLanding />} />
      <Route path="/listing-hive" element={<ListingHiveLanding />} />
      <Route path="/listings/success" element={<ListingHiveSuccess />} />
      <Route path="/m/resolve/:token" element={<MagicResolve />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/passkeys" element={<PasskeysSettings />} />
      <Route path="/step-up" element={<StepUp />} />
      <Route path="/backup-codes" element={<BackupCodes />} />
      <Route
        path="/admin/integrations/gusto"
        element={<Navigate to="/app/admin/integrations/gusto" replace />}
      />

      {/* Legacy /login redirects to app — ProtectedRoute handles PKCE */}
      <Route path="/login" element={<Navigate to="/app" replace />} />
      {/* Magic approvals (no auth) */}
      <Route path="/m/approvals/:token" element={<MagicApproval />} />
      {/* Magic quotes (no auth) - enhanced quote view */}
      <Route path="/m/quotes/:token" element={<MagicQuote />} />

      {/* Public Onboarding Splash */}
      <Route path="/get-started" element={<GetStartedSplash />} />

      {/* SSO auth callback routes */}
      {/* Legacy token-based magic link (?token=...) */}
      <Route path="/auth/magic-link" element={<MagicLinkCallback />} />
      {/* Alias: hive-identity new-style code magic link (?code=...)
          can route here too and AuthCallback handles both flows. */}
      <Route path="/auth/magic-link/callback" element={<AuthCallback />} />
      <Route path="/auth/sso" element={<SsoCallback />} />

      {/* OAuth + magic-link callback for centralized SSO */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Vendor onboarding — entered by vendors after magic-link sign-in.
          Authenticated route: ProtectedRoute will bounce unauthed to /login. */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoader />}>
              <VendorOnboarding />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/onboarding"
        element={<Navigate to="/onboarding" replace />}
      />
      <Route path="/onboarding-callback" element={<Navigate to="/app" replace />} />
      <Route path="/owner-onboarding-callback" element={<Navigate to="/app" replace />} />

      {/* PUBLIC owner onboarding - LAZY LOADED */}
      <Route
        path="/admin/owner-onboard"
        element={
          <Suspense fallback={<RouteLoader />}>
            <OwnerOnboardEntry />
          </Suspense>
        }
      />
      <Route
        path="/admin/owner-onboard/:code"
        element={
          <Suspense fallback={<RouteLoader />}>
            <OwnerOnboard />
          </Suspense>
        }
      />
      <Route
        path="/admin/owner-onboard/:code/stripe/return"
        element={
          <Suspense fallback={<RouteLoader />}>
            <StripeReturn />
          </Suspense>
        }
      />
      <Route
        path="/admin/owner-onboard/:code/stripe/refresh"
        element={
          <Suspense fallback={<RouteLoader />}>
            <StripeRefresh />
          </Suspense>
        }
      />

      {/* Legacy public invite paths - LAZY LOADED */}
      <Route
        path="/signup/:code"
        element={
          <Suspense fallback={<RouteLoader />}>
            <Signup />
          </Suspense>
        }
      />
      <Route
        path="/signup/:code/pay"
        element={
          <ProtectedRoute roles={['user','owner','admin','manager','crew_leader','crew_member']}>
            <Suspense fallback={<RouteLoader />}>
              <SignupPayment />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/signup/:code/done"
        element={
          <Suspense fallback={<RouteLoader />}>
            <SignupDone />
          </Suspense>
        }
      />

      <Route path="/public-signup/:code" element={<PublicSignup />} />
      <Route path="/org/:slug/info" element={<OrgInfo />} />

      {/* Legacy redirect from hive-identity SSO flow */}
      <Route path="/lander" element={<Navigate to="/app" replace />} />

      {/* Legacy → App route using the actual :id param */}
      <Route path="/invoices/:id" element={<LegacyInvoiceRedirect />} />
      <Route path="/service-records/:id" element={<LegacyServiceRecordRedirect />} />
      <Route path="/service-records" element={<LegacyServiceRecordIndexRedirect />} />
      <Route path="/properties/:propertyId/history" element={<LegacyPropertyHistoryRedirect />} />
      <Route path="/public/properties/history/:token" element={<PublicPropertyHistory />} />
      <Route path="/proof/:serviceRecordId" element={<PublicProof />} />
      <Route
        path="/internal/migrated-api-smoke"
        element={
          <ProtectedRoute roles={['admin','owner','manager','staff']}>
            <Suspense fallback={<RouteLoader />}>
              <MigratedApiSmoke />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* permanent org slug routes - LAZY LOADED */}
      <Route
        path="/signup/org/:slug"
        element={
          <Suspense fallback={<RouteLoader />}>
            <Signup />
          </Suspense>
        }
      />
      <Route
        path="/signup/org/:slug/pay"
        element={
          <ProtectedRoute roles={['user','owner','admin','manager','crew_leader','crew_member']}>
            <Suspense fallback={<RouteLoader />}>
              <SignupPayment />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/signup/org/:slug/done"
        element={
          <Suspense fallback={<RouteLoader />}>
            <SignupDone />
          </Suspense>
        }
      />

      {/* Optional deep links to invites - LAZY LOADED */}
      <Route
        path="/invite/:token"
        element={
          <Suspense fallback={<RouteLoader />}>
            <AppInvite />
          </Suspense>
        }
      />
      <Route
        path="/invite/accept"
        element={
          <Suspense fallback={<RouteLoader />}>
            <AcceptInvite />
          </Suspense>
        }
      />

      {/* Legal */}
      <Route path="/legal/privacy" element={<LegalPrivacy />} />
      <Route path="/legal/terms" element={<LegalTerms />} />

      {/* Security */}
      <Route path="/security" element={<SecurityPage />} />

      {/* DNA */}
      <Route path="/dna" element={<DNAPage />} />

      {/* Careers */}
      <Route path="/careers" element={<CareersPage />} />
      <Route
        path="/careers/apply/:jobTitle"
        element={
          <Suspense fallback={<RouteLoader />}>
            <JobApplication />
          </Suspense>
        }
      />

      {/* Blog */}
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />

      {/* Authenticated app area - ALL LAZY LOADED (Stripe, Dashboard, etc.) */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoader />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleIndex />} />

        {/* Owner/Admin/Manager */}
        <Route
          path="dashboard-owner"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <DashboardHome />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="services"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Services />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="business"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <BusinessWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="sales"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <SalesWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="quotes"
          element={
            <ProtectedRoute roles={['owner', 'admin']}>
              <Suspense fallback={<RouteLoader />}>
                <OwnerQuotesQueue />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/service-types"
          element={
            <ProtectedRoute roles={['owner', 'admin']}>
              <Suspense fallback={<RouteLoader />}>
                <Services />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crews"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Crews />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Reports />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CustomersIndex />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="customers/:customerId"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CustomerWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="onboard-customer"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager', 'crew_leader']}>
              <Suspense fallback={<RouteLoader />}>
                <OnboardCustomer />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Unified Schedule */}
        <Route
          path="schedule"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager','crew_leader','crew_member']}>
              <Suspense fallback={<RouteLoader />}>
                <Schedule />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Approvals (owner/manager view of customer authorizations) */}
        <Route
          path="approvals"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <OwnerApprovals />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Accounts Receivable (outstanding payments) */}
        <Route
          path="accounts-receivable"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <ARDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Invoices */}
        <Route
          path="invoices"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Invoices />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="invoices/:id"
          element={
            <ProtectedRoute roles={['owner','admin','manager','crew_leader','crew_member','user']}>
              <Suspense fallback={<RouteLoader />}>
                <InvoiceShow />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="receipts/:id"
          element={
            <ProtectedRoute roles={['owner','admin','manager','crew_leader','crew_member','user']}>
              <Suspense fallback={<RouteLoader />}>
                <ServiceReceiptView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="service-records"
          element={
            <ProtectedRoute roles={['owner','admin','manager','crew_leader','crew_member']}>
              <Suspense fallback={<RouteLoader />}>
                <ServiceRecordsIndex />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="service-records/:id"
          element={
            <ProtectedRoute roles={['owner','admin','manager','crew_leader','crew_member','user']}>
              <Suspense fallback={<RouteLoader />}>
                <ServiceRecordDetail />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Projects (Prime/Sub - GC/Subcontractor flow) */}
        <Route
          path="projects"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Projects />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="projects/:id"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <ProjectDetail />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="participating"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <ParticipatingProjects />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="participating/:projectId"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <ProjectWork />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="project-invite/:token"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <AcceptProjectInvite />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="properties"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <Properties />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="properties/:propertyId/history"
          element={
            <ProtectedRoute roles={['owner','admin','manager']}>
              <Suspense fallback={<RouteLoader />}>
                <PropertyHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path="payments"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Payments />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="authorizations"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <AuthorizationHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="payment-history"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <PaymentHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="ach/authorize"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <SignupAchAuthorizationPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="insights"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <Insights />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="history"
          element={
            <ProtectedRoute roles={['owner','admin','manager']}>
              <Suspense fallback={<RouteLoader />}>
                <History />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="provider/route-adds"
          element={
            <ProtectedRoute roles={['owner','admin','manager']}>
              <RouteAddsRedirect />
            </ProtectedRoute>
          }
        />

        {/* CRM (pulled from hive-crm frontend) */}
        <Route
          path="crm"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/pipeline"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmPipeline />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/contacts"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmContacts />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/organizations"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmOrganizations />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/feedback"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmFeedbackDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/tasks"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmTasks />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/b2c-leads"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmB2CLeads />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmUsers />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/settings"
          element={
            <ProtectedRoute roles={['owner', 'admin']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmSettings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmAdmin />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crm/nightly-leads"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <CrmNightlyLeads />
              </Suspense>
            </ProtectedRoute>
          }
        />


        {/* Crew */}
        <Route
          path="team"
          element={
            <ProtectedRoute roles={['crew_member', 'crew_leader']}>
              <Suspense fallback={<RouteLoader />}>
                <CrewTeam />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crew-customers"
          element={
            <ProtectedRoute roles={['crew_leader']}>
              <Suspense fallback={<RouteLoader />}>
                <CrewCustomers />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="crew-schedule"
          element={
            <ProtectedRoute roles={['crew_leader','crew_member']}>
              <Suspense fallback={<RouteLoader />}>
                <Schedule />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="timecards"
          element={
            <ProtectedRoute roles={['crew_leader','crew_member']}>
              <Suspense fallback={<RouteLoader />}>
                <MyTimecards />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Accounting */}
        <Route
          path="accounting"
          element={
            <ProtectedRoute roles={['owner', 'admin', 'manager']}>
              <Suspense fallback={<RouteLoader />}>
                <AccountingWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['owner', 'admin']}>
              <Suspense fallback={<RouteLoader />}>
                <AdminWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/integrations/gusto"
          element={
            <ProtectedRoute roles={['owner']}>
              <Suspense fallback={<RouteLoader />}>
                <GustoIntegration />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/org-features"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <AdminOrgFeatures />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/approval-flags"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <ApprovalFlags />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/security"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <SecurityDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/applications"
          element={
            <ProtectedRoute roles={['admin']}>
              <Suspense fallback={<RouteLoader />}>
                <Applications />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Account */}
        <Route
          path="account"
          element={
            <Suspense fallback={<RouteLoader />}>
              <AccountIndex />
            </Suspense>
          }
        />

        <Route
          path="explore"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <Explore />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="offers"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <Offers />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* User */}
        <Route
          path="user/dashboard"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <UserDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/payments"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <PaymentsUser />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/service-records"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <UserServiceRecords />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/approvals"
          element={
            <ProtectedRoute roles={['user','owner']}>
              <Suspense fallback={<RouteLoader />}>
                <Approvals />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/passkeys"
          element={
            <ProtectedRoute roles={['user','owner']}>
              <Suspense fallback={<RouteLoader />}>
                <Passkeys />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/outstanding-payments"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <CustomerARView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/properties/:propertyId/history"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <UserPropertyHistory />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/service-records/:serviceRecordId"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <UserServiceRecordDetail />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="user/service-records/:serviceRecordId/resolve-payment"
          element={
            <ProtectedRoute roles={['user']}>
              <Suspense fallback={<RouteLoader />}>
                <ResolvePayment />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Utility */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Fallbacks */}
      <Route path="/app/*" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

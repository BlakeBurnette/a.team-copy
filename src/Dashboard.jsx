import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import axios from 'axios';

import Breadcrumbs from './components/Breadcrumbs';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useAuth, useUserProfile } from './context/AuthContext';
import MobileQuickActionsModal from './components/MobileQuickActionsModal';
import DesktopQuickActionsDrawer from './components/DesktopQuickActionsDrawer';
import AppFooter from './components/AppFooter'; // ← NEW
import RequirePermission from './auth/RequirePermission';
import OnboardingBanner from './components/OnboardingBanner';
import useAdminPasskeyRequired from './hooks/useAdminPasskeyRequired';
import AdminPasskeyRequired from './components/AdminPasskeyRequired';
import usePasskeySetupPrompt from './hooks/usePasskeySetupPrompt';
import PasskeySetupPrompt from './components/PasskeySetupPrompt';

// NOTE: axios baseURL and withCredentials are configured globally in src/main.jsx

let profileFetchDone = false;
let profileFetchPromise = null;

const Dashboard = () => {
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showDesktopActions, setShowDesktopActions] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    user,
    loading,
    refreshMe,
  } = useAuth() || {};

  const { profile, setProfile, refetchProfile } = useUserProfile();

  // Admin passkey enforcement (required for admins)
  const { requiresPasskeySetup, recheckPasskeys } = useAdminPasskeyRequired();

  // Passkey setup prompt for all users (optional, dismissible)
  const {
    showPrompt: showPasskeyPrompt,
    dismiss: dismissPasskeyPrompt,
    onSuccess: onPasskeySetupSuccess,
  } = usePasskeySetupPrompt();

  // Allow Quick Actions for owner/admin/manager/crew_leader only
  const role = (profile?.role || '').toLowerCase();
  const canUseQuickActions =
    role === 'owner' || role === 'admin' || role === 'manager' || role === 'crew_leader';

  const sidebarWidthClass = sidebarCollapsed ? 'md:w-20' : 'md:w-64';

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p === '/app') return 'Dashboard';
    if (p.startsWith('/app/services')) return 'Services';
    if (p.startsWith('/app/quotes')) return 'Quotes';
    if (p.startsWith('/app/add-on-campaigns')) return 'Campaigns';
    if (p.startsWith('/app/reports')) return 'Reports';
    if (p.startsWith('/app/settings')) return 'Settings';
    if (p.startsWith('/app/customers')) return 'Customers';
    if (p.startsWith('/app/onboard-customer')) return 'Onboard Customer';
    if (p.startsWith('/app/schedule')) return 'Schedule';
    if (p.startsWith('/app/invoices')) return 'Invoices';
    if (p.startsWith('/app/payments')) return 'Payments';
    if (p.startsWith('/app/insights')) return 'Insights';
    if (p.startsWith('/app/admin')) return 'Admin Panel';
    if (p.startsWith('/app/crews')) return 'Crew Management';
    if (p.startsWith('/app/timecards')) return 'Timecards';
    return 'Dashboard';
  }, [location.pathname]);

  // Guard: if someone hits /app without being logged in, send them to /login
  useEffect(() => {
    if (loading) return;
    const isAppPath =
      location.pathname === '/app' || location.pathname.startsWith('/app/');
    if (isAppPath && !user) {
      const next = location.pathname + location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [loading, user, location.pathname, location.search, navigate]);

  // Load profile from backend once authenticated
  useEffect(() => {
    const fetchUser = async () => {
      if (profileFetchDone) return;
      if (profileFetchPromise) return profileFetchPromise;
      profileFetchPromise = (async () => {
        try {
        const res = await axios.get('/api/users/me', { withCredentials: true });
        setProfile(res.data);
        } catch (error) {
          if (error?.response?.data?.error) {
            console.error('[Dashboard] API error:', error.response.data.error);
          } else {
            console.error('[Dashboard] fetchUser error:', error?.message || error);
          }
        } finally {
          profileFetchDone = true;
          profileFetchPromise = null;
        }
      })();
      return profileFetchPromise;
    };
    if (!loading && user) {
      fetchUser();
    }
  }, [loading, user, setProfile]);

  // Desktop keyboard shortcut: Shift+K toggles the quick actions drawer (allowed roles only)
  useEffect(() => {
    if (!canUseQuickActions) return;
    const onKey = (e) => {
      if (e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        if (window.matchMedia('(min-width: 768px)').matches) {
          setShowDesktopActions((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canUseQuickActions]);


  return (
    <div className="fixed inset-0 overflow-hidden" style={{ margin: 0, padding: 0 }}>
      {/* Admin passkey enforcement modal (required, blocking) */}
      {requiresPasskeySetup && (
        <AdminPasskeyRequired onSuccess={recheckPasskeys} />
      )}

      {/* Passkey setup prompt for all users (optional, dismissible) */}
      {/* Only show if admin modal isn't showing */}
      {!requiresPasskeySetup && showPasskeyPrompt && (
        <PasskeySetupPrompt
          onSuccess={onPasskeySetupSuccess}
          onDismiss={dismissPasskeyPrompt}
        />
      )}

      {/* Two-column layout */}
      <div className="h-full w-full flex bg-[#F9FAFB] text-[#111827] font-inter overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex ${sidebarWidthClass} flex-col bg-white shadow-md pt-4 px-4 pb-4 border-r border-neutral-200 h-full overflow-y-auto`}
        >
          <div className="flex justify-between items-center mb-6">
            {!sidebarCollapsed && (
              <h2 className="text-xl font-bold text-[#111827]">Menu</h2>
            )}
            <button
              className="hidden md:inline-flex items-center text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
            </button>
          </div>
          <Sidebar
            collapsed={sidebarCollapsed}
            closeMobile={() => setSidebarOpenMobile(false)}
          />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpenMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpenMobile(false)}
            aria-hidden="true"
          />
        )}
        {/* Mobile sidebar panel */}
        <aside
          className={`
            md:hidden fixed z-40 inset-y-0 left-0 bg-white shadow-md p-4
            transform transition-transform duration-300 ease-in-out
            w-64 overflow-y-auto
            ${sidebarOpenMobile ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#111827]">Menu</h2>
            <button
              className="inline-flex items-center text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSidebarOpenMobile(false)}
              aria-label="Close menu"
            >
              <ChevronsLeft />
            </button>
          </div>
          <Sidebar collapsed={false} closeMobile={() => setSidebarOpenMobile(false)} />
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Header
            sidebarOpenMobile={sidebarOpenMobile}
            setSidebarOpenMobile={setSidebarOpenMobile}
            pageTitle={pageTitle}
            onOpenDesktopActions={canUseQuickActions ? () => setShowDesktopActions(true) : undefined}
          />
          <OnboardingBanner />
          <main className="p-6 flex-1 overflow-auto">
            <Breadcrumbs />
            <RequirePermission permission="app:quick-actions">
              <div className="mt-4 mb-2 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">
                Quick actions available (permission: app:quick-actions).
              </div>
            </RequirePermission>
            <div className="mt-4">
              <Outlet />
            </div>
          </main>

          {/* Shared Footer */}
          <AppFooter />
        </div>

        {canUseQuickActions && (
          <MobileQuickActionsModal
            isOpen={showMobileModal}
            onClose={() => setShowMobileModal(false)}
          />
        )}

        {canUseQuickActions && (
          <DesktopQuickActionsDrawer
            isOpen={showDesktopActions}
            onClose={() => setShowDesktopActions(false)}
          />
        )}
      </div>

      {/* FAB for mobile quick actions */}
      {canUseQuickActions && !showMobileModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <button
            onClick={() => setShowMobileModal(true)}
            aria-label="Open quick actions"
            className="
              md:hidden fixed z-[9999]
              w-14 h-14 rounded-full
              flex items-center justify-center
              bg-amber-500 text-white
              shadow-2xl drop-shadow-lg
              transition-transform active:scale-95
              relative overflow-hidden
              before:content-[''] before:absolute before:inset-0 before:rounded-full
              before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity
            "
            style={{
              position: 'fixed',
              left: 'calc(1.25rem + env(safe-area-inset-right))',
              bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
            }}
          >
            <Plus className="h-6 w-6" />
          </button>,
          document.body
        )}
    </div>
  );
};

export default Dashboard;

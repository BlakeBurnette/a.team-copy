// src/components/Sidebar.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Shield,
  Users,
  Calendar,
  FileText,
  Megaphone,
  WalletCards,
  User as UserIcon,
  UserPlus,
  Clock,
  Compass,
  Inbox,
  Home,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { useUserProfile } from '../context/AuthContext';
import { fetchOffers } from '../api/recommendations';
import useVertical from '../hooks/useVertical';
import env from '../lib/env';

const Sidebar = ({ collapsed, closeMobile }) => {
  const location = useLocation();
  const { profile, user, roles: roleList } = useUserProfile();

  // Fall back to the raw user object and roles array if the profile hasn't populated yet.
  const role = (profile?.role || user?.role || (Array.isArray(roleList) ? roleList[0] : '') || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const isCrew = role === 'crew_member';
  const isCrewLeader = role === 'crew_leader';
  const isUser = role === 'user';
  const [offerCount, setOfferCount] = useState(null);
  const [approvalsCount, setApprovalsCount] = useState(null);
  const SHOW_OFFERS = env.VITE_SHOW_OFFERS === 'true';

  // Vertical feature flags — filter sidebar modules by org vertical
  const { isModuleEnabled } = useVertical();
  const filterByVertical = (items) =>
    items.filter((item) => !item.module || isModuleEnabled(item.module));

  useEffect(() => {
    let alive = true;
    if (!(SHOW_OFFERS && isUser)) {
      setOfferCount(null);
      return () => {};
    }
    (async () => {
      try {
        const data = await fetchOffers();
        if (!alive) return;
        const list = Array.isArray(data?.offers) ? data.offers : Array.isArray(data) ? data : [];
        setOfferCount(list.length);
      } catch {
        if (alive) setOfferCount(null);
      }
    })();
    return () => { alive = false; };
  }, [isUser, SHOW_OFFERS]);

  // Fetch pending approvals count for owners/managers
  useEffect(() => {
    let alive = true;
    if (!(isOwner || isManager)) {
      setApprovalsCount(null);
      return () => {};
    }
    (async () => {
      try {
        const { default: axios } = await import('axios');
        const { data } = await axios.get('/api/approvals', {
          params: { status: 'pending' },
          withCredentials: true,
          validateStatus: () => true,
        });
        if (!alive) return;
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setApprovalsCount(list.length);
      } catch {
        if (alive) setApprovalsCount(null);
      }
    })();
    return () => { alive = false; };
  }, [isOwner, isManager]);


  const linkCls = (isActive) =>
    [
      'group flex items-center gap-2 px-3 py-2 transition-colors border-l-4',
      'focus:outline-none',
      isActive
        ? 'bg-zinc-600 border-amber-500 text-white font-semibold'
        : 'border-transparent text-stone-700 hover:text-amber-500 hover:bg-stone-100',
    ].join(' ');

  const iconCls = (isActive) =>
    ['w-5 h-5', isActive ? 'white' : 'text-stone-500 group-hover:text-amber-500'].join(' ');


  // Always
  const baseNav = [{ label: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true }];

  // Crew Member: Dashboard + Team
  const crewNav = isCrew
    ? [
        { label: 'Team', path: '/app/team', icon: Users },
        { label: 'Timecards', path: '/app/timecards', icon: Clock },
        { label: 'Service Records', path: '/app/service-records', icon: FileText, module: 'service_records' },
      ]
    : [];

  // Crew Leader: Dashboard + Team + Customers + Schedule + Onboard Customer
  const crewLeaderNav = isCrewLeader
    ? [
        { label: 'Team', path: '/app/team', icon: Users },
        { label: 'Customers', path: '/app/crew-customers', icon: Users, module: 'customers' },
        { label: 'Schedule', path: '/app/crew-schedule', icon: Calendar, module: 'schedule' },
        { label: 'Timecards', path: '/app/timecards', icon: Clock },
        { label: 'Service Records', path: '/app/service-records', icon: FileText, module: 'service_records' },
        { label: 'Onboard Customer', path: '/app/onboard-customer', icon: UserPlus, module: 'customers' },
      ]
    : [];

  // Operator (owner/manager/admin)
  const operatorNav =
    isOwner || isManager || isAdmin
      ? [
          { label: 'Schedule', path: '/app/schedule', icon: Calendar, module: 'schedule' },
          { label: 'Customers', path: '/app/customers', icon: Users, module: 'customers' },
          { label: 'Business', path: '/app/business', icon: Briefcase, badge: approvalsCount },
          { label: 'Accounting', path: '/app/accounting', icon: WalletCards },
          ...(isOwner ? [{ label: 'Crews', path: '/app/crews', icon: Users, module: 'crews' }] : []),
          { label: 'Sales Tools', path: '/app/sales', icon: Megaphone },
          { label: 'Settings', path: '/app/settings', icon: SettingsIcon },
        ]
      : [];

  // End-user
  const userNav = isUser
    ? [
        { label: 'Explore', path: '/app/explore', icon: Compass },
        ...(SHOW_OFFERS ? [{ label: 'Offers', path: '/app/offers', icon: Inbox, badge: offerCount }] : []),
        { label: 'Service Records', path: '/app/user/service-records', icon: FileText, module: 'service_records' },
        { label: 'Approvals', path: '/app/user/approvals', icon: CheckCircle2, module: 'approvals' },
        { label: 'Properties', path: '/app/properties', icon: Home, module: 'properties' },
        { label: 'Account', path: '/app/account', icon: UserIcon },
        { label: 'Payments', path: '/app/user/payments', icon: WalletCards, module: 'payments' },
      ]
    : [];

  const adminNavItems = (isAdmin || isOwner)
    ? [{ label: 'Admin', path: '/app/admin', icon: Shield }]
    : [];

  const navItems = useMemo(() => {
    if (isCrew) return filterByVertical([...baseNav, ...crewNav]);
    if (isCrewLeader) return filterByVertical([...baseNav, ...crewLeaderNav]);

    const personaNav =
      operatorNav.length > 0 ? operatorNav : userNav.length > 0 ? userNav : [];
    return filterByVertical([...baseNav, ...personaNav]);
  }, [isCrew, isCrewLeader, operatorNav, userNav, isModuleEnabled]); // eslint-disable-line

  return (
    <nav className="space-y-6 pb-20">
      {!collapsed && (
        <div className="px-3 text-xs tracking-widest text-stone-400 uppercase">
          Navigation
        </div>
      )}

      <div className="space-y-1">
        {[...navItems, ...(!(isCrew || isCrewLeader) ? adminNavItems : [])].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              className={({ isActive: linkActive }) => linkCls(linkActive)}
              onClick={closeMobile}
              aria-current={location.pathname === item.path ? 'page' : undefined}
            >
              <Icon className={iconCls(location.pathname === item.path)} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {typeof item.badge === 'number' && item.badge > 0 ? (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default Sidebar;

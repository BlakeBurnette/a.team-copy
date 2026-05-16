// src/pages/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useUserProfile } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import Toast from '../components/Toast';
import Pagination from '../components/Pagination';

// Admin components
import CreateUserForm from '../components/admin/CreateUserForm';
import UsersHeader from '../components/admin/UsersHeader';
import UsersTable from '../components/admin/UsersTable';
import CreateOrganizationForm from '../components/admin/CreateOrganizationForm';
import OrganizationsEditor from '../components/admin/OrganizationsEditor';
import OrganizationSummary from '../components/admin/OrganizationSummary';
import InviteOwnerForm from '../components/admin/InviteOwnerForm';
import OwnerInvitesList from '../components/admin/OwnerInvitesList';
import OrganizationsActivationList from '../components/admin/OrganizationsActivationList';

import {
  INDUSTRY_OPTIONS,
  ORG_FIELDS,
  ALLOWED_ROLES,
  ALLOWED_STATUSES,
  USERS_PER_PAGE
} from '../components/admin/constants';

const AdminPanel = ({ embedded }) => {
  const { profile, loadingProfile } = useUserProfile();

  // Users state (ADMIN)
  const [users, setUsers] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [error, setError] = useState(null);

  // Create User (ADMIN)
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'user',
    organization_id: null,
    send_invite: true,
  });

  // Orgs state (ADMIN)
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgEdits, setOrgEdits] = useState({});
  const [orgSummary, setOrgSummary] = useState([]);

  // Create Org (basic + advanced)
  const [newOrgName, setNewOrgName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newOrgAdvanced, setNewOrgAdvanced] = useState({
    industry: '',
    website: '',
    phone_number: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    service_area_zipcodes: [],
    business_hours: {},
    services_rendered: [],
    owner_user_id: null
  });

  // UI
  const [showInactive, setShowInactive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Changes saved successfully!');

  // Pagination + search (ADMIN)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const authHeader = () => ({});

  const isAdmin = profile?.role === 'admin';

  /* ---------------------------- Data fetching (ADMIN) ---------------------------- */
  const fetchUsers = async (page = 1) => {
    try {
      const statusParam = showInactive ? 'all' : 'active';
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const res = await axios.get(
        `/api/admin/users?page=${page}&limit=${USERS_PER_PAGE}&status=${statusParam}${searchParam}`,
        { headers: authHeader(), withCredentials: true }
      );
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    }
  };

  const fetchOrganizations = async () => {
    try {
      setOrgsLoading(true);
      const res = await axios.get('/api/admin/organizations', {
        headers: authHeader(),
        withCredentials: true,
      });
      setOrganizations(res.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    } finally {
      setOrgsLoading(false);
    }
  };

  const fetchOrgSummary = async () => {
    try {
      const res = await axios.get('/api/admin/organization-summary', {
        headers: authHeader()
      });
      setOrgSummary(res.data || []);
    } catch (err) {
      console.error('Error fetching org summary:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers(currentPage);
      fetchOrganizations();
      fetchOrgSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive, currentPage, searchTerm, isAdmin]);

  /* ---------------------------- Helpers (ADMIN) ---------------------------- */
  const usersEffective = useMemo(() => {
    return users.map((u) => {
      const p = pendingChanges[u.email] || {};
      return {
        ...u,
        role: p.role !== undefined ? p.role : u.role,
        organization_id: p.organization_id !== undefined ? p.organization_id : u.organization_id,
        status: p.status !== undefined ? p.status : u.status
      };
    });
  }, [users, pendingChanges]);

  const notify = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
  };

  const queueChange = (email, field, value) => {
    setPendingChanges((prev) => ({
      ...prev,
      [email]: { ...prev[email], [field]: value }
    }));
  };

  const queueOrgEdit = (id, field, value) => {
    setOrgEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  };

  const buildCreateOrgPayload = () => {
    const {
      industry,
      website,
      phone_number,
      email,
      street,
      city,
      state,
      zip,
      service_area_zipcodes,
      business_hours,
      services_rendered,
      owner_user_id
    } = newOrgAdvanced;

    const payload = { name: newOrgName };
    const addIf = (k, v) => {
      if (v === null || v === undefined) return;
      if (Array.isArray(v)) { if (v.length) payload[k] = v; return; }
      if (typeof v === 'object') { if (Object.keys(v).length) payload[k] = v; return; }
      if (String(v).trim() !== '') payload[k] = v;
    };

    addIf('website', website);
    addIf('phone_number', phone_number);
    addIf('email', email);
    addIf('street', street);
    addIf('city', city);
    addIf('state', state);
    addIf('zip', zip);
    addIf('service_area_zipcodes', service_area_zipcodes);
    addIf('business_hours', business_hours);

    const marketing = {};
    if (industry) marketing.industry = industry;
    if (Array.isArray(services_rendered) && services_rendered.length) {
      marketing.services_rendered = services_rendered;
    }
    if (Object.keys(marketing).length) payload.marketing = marketing;

    addIf('owner_user_id', owner_user_id);

    return payload;
  };

  /* ---------------------------- NEW: Create User handler ---------------------------- */
  const handleCreateUser = async (e) => {
    e?.preventDefault?.();
    try {
      if (!newUser.email) {
        notify('Email is required');
        return;
      }
      await axios.post('/api/admin/create-user', newUser, {
        headers: authHeader(),
      });

      await Promise.all([fetchUsers(1), fetchOrganizations(), fetchOrgSummary()]);

      setNewUser({
        email: '',
        name: '',
        role: 'user',
        organization_id: null,
        send_invite: true,
      });

      notify('User created successfully');
    } catch (err) {
      console.error('Create user failed:', err?.response?.data || err);
      notify(err?.response?.data?.error || 'Failed to create user');
    }
  };

  /* ---------------------------- Save / Reset (ADMIN) ---------------------------- */
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);

      const userUpdates = Object.entries(pendingChanges).map(([email, changes]) =>
        axios.post(
          '/api/admin/update-user',
          { email, ...changes },
          { headers: authHeader() }
        )
      );

      const orgUpdates = Object.entries(orgEdits).map(([id, changes]) => {
        const payload = { id: Number(id) };

        const marketing = {};
        if (Object.prototype.hasOwnProperty.call(changes, 'industry')) {
          marketing.industry = changes.industry === '' ? null : changes.industry;
        }
        if (Object.prototype.hasOwnProperty.call(changes, 'services_rendered')) {
          marketing.services_rendered = changes.services_rendered ?? null;
        }

        ORG_FIELDS
          .filter((f) => f !== 'services_rendered' && f !== 'industry')
          .forEach((f) => {
            if (Object.prototype.hasOwnProperty.call(changes, f)) {
              payload[f] = changes[f] === '' ? null : changes[f];
            }
          });

        if (Object.keys(marketing).length) payload.marketing = marketing;

        return axios.post('/api/admin/update-organization', payload, {
          headers: authHeader()
        });
      });

      await Promise.all([...userUpdates, ...orgUpdates]);

      setPendingChanges({});
      setOrgEdits({});
      await Promise.all([fetchUsers(currentPage), fetchOrganizations(), fetchOrgSummary()]);
      notify('Changes saved successfully!');
    } catch (err) {
      console.error('Failed to save updates:', err?.response?.data || err);
      notify(err?.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = () => {
    setPendingChanges({});
    setOrgEdits({});
  };

  /* ---------------------------- Rendering ---------------------------- */
  if (loadingProfile) return <div className="p-4 md:p-6 text-gray-600">Loading...</div>;
  if (!profile) return null;

  // Admin-only access
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <Toast show={showToast} onClose={() => setShowToast(false)}>
        {toastMessage}
      </Toast>

      {!embedded && <h2 className="text-2xl font-bold mb-4">Admin Panel</h2>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Create User */}
      <CreateUserForm
        newUser={newUser}
        setNewUser={setNewUser}
        onSubmit={handleCreateUser}
        allowedRoles={ALLOWED_ROLES}
        organizations={organizations}
        onQuickCreateOrg={async (name) => {
          try {
            setCreatingOrg(true);
            notify('Creating organization…');
            const res = await axios.post(
              '/api/admin/create-organization',
              { name },
              { headers: authHeader() }
            );
            const created = res.data;
            setOrganizations((prev) => [created, ...prev]);
            setNewUser((p) => ({ ...p, organization_id: created.id }));
            notify('Organization created');
            fetchOrgSummary();
          } catch (err) {
            console.error('Quick create org failed:', err?.response?.data || err);
            notify('Failed to create organization: ' + '  ' + (err?.response?.data?.error || 'Unknown error'));
          } finally {
            setCreatingOrg(false);
          }
        }}
        creatingOrg={creatingOrg}
        orgsLoading={orgsLoading}
      />

      {/* Users header + search */}
      <UsersHeader
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Users table */}
      <UsersTable
        users={usersEffective}
        organizations={organizations}
        pendingChanges={pendingChanges}
        queueChange={queueChange}
        allowedRoles={ALLOWED_ROLES}
        allowedStatuses={ALLOWED_STATUSES}
        notify={notify}
        wouldViolateOwnerRule={() => false}
      />

      {/* Toggle + Pagination */}
      <div className="flex items-center justify-between my-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={() => setShowInactive(!showInactive)}
          />
          <span>Show inactive users</span>
        </label>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Global Save / Reset */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={handleSaveChanges}
          className={`px-4 py-2 rounded text-white ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-zinc-600'}`}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={handleResetAll}
          className="px-4 py-2 rounded border"
          disabled={isSaving}
        >
          Reset
        </button>
      </div>

      {/* Owner invites + orgs */}
      <InviteOwnerForm
        authHeader={authHeader}
        onInvited={() => {
          fetchOrganizations();
          fetchUsers(currentPage);
          setToastMessage('Owner invitation created');
          setShowToast(true);
        }}
      />
      <OwnerInvitesList authHeader={authHeader} />

      {/* Organizations summary */}
      <OrganizationSummary
        orgSummary={orgSummary}
        orgEdits={orgEdits}
        queueOrgEdit={queueOrgEdit}
      />

      {/* Create Organization */}
      <CreateOrganizationForm
        newOrgName={newOrgName}
        setNewOrgName={setNewOrgName}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        newOrgAdvanced={newOrgAdvanced}
        setNewOrgAdvanced={setNewOrgAdvanced}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const payload = buildCreateOrgPayload();
            const res = await axios.post('/api/admin/create-organization', payload, {
              headers: authHeader()
            });
            setOrganizations((prev) => [res.data, ...prev]);
            setNewOrgName('');
            setNewOrgAdvanced({
              industry: '',
              website: '',
              phone_number: '',
              email: '',
              street: '',
              city: '',
              state: '',
              zip: '',
              service_area_zipcodes: [],
              business_hours: {},
              services_rendered: [],
              owner_user_id: null
            });
            setShowAdvanced(false);
            await fetchOrgSummary();
            notify('Organization created');
          } catch (err) {
            console.error('Failed to create organization:', err?.response?.data || err);
            notify('Failed to create organization: ' + (err?.response?.data?.error || 'Unknown error'));
          }
        }}
        industryOptions={INDUSTRY_OPTIONS}
        users={usersEffective}
      />

      <OrganizationsActivationList
        organizations={organizations}
        orgSummary={orgSummary}
        authHeader={authHeader}
        notify={notify}
        onChanged={async () => {
          // Refresh data after a toggle
          await Promise.all([fetchOrganizations(), fetchOrgSummary(), fetchUsers(currentPage)]);
        }}
      />

      {/* Organizations Editor */}
      <OrganizationsEditor
        organizations={organizations}
        orgEdits={orgEdits}
        queueOrgEdit={queueOrgEdit}
        industryOptions={INDUSTRY_OPTIONS}
        onSaveOne={async (id) => {
          const changes = orgEdits[id];
          if (!changes || !Object.keys(changes).length) return;

          const marketing = {};
          if (Object.prototype.hasOwnProperty.call(changes, 'industry')) {
            marketing.industry = changes.industry === '' ? null : changes.industry;
          }
          if (Object.prototype.hasOwnProperty.call(changes, 'services_rendered')) {
            marketing.services_rendered = changes.services_rendered ?? null;
          }

          const { services_rendered, industry, ...safeChanges } = changes;

          const payload = { id: Number(id) };
          ORG_FIELDS
            .filter((f) => f !== 'services_rendered' && f !== 'industry')
            .forEach((f) => {
              if (Object.prototype.hasOwnProperty.call(safeChanges, f)) {
                payload[f] = safeChanges[f] === '' ? null : safeChanges[f];
              }
            });

          if (Object.keys(marketing).length) payload.marketing = marketing;

          await axios.post('/api/admin/update-organization', payload, {
            headers: authHeader()
          });

          setOrgEdits((prev) => {
            const { [id]: _removed, ...rest } = prev;
            return rest;
          });

          await Promise.all([fetchOrganizations(), fetchOrgSummary(), fetchUsers(currentPage)]);
          notify('Changes saved successfully!');
        }}
        onResetOne={(id) => {
          setOrgEdits((prev) => {
            const { [id]: _removed, ...rest } = prev;
            return rest;
          });
        }}
        users={usersEffective}
        notify={notify}
        queueChange={queueChange}
      />
    </div>
  );
};

export default AdminPanel;

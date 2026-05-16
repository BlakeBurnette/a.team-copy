import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useCrmAuth';
import {
  getAdminStats,
  getAdminOrganizations,
  getOrganizationInvites,
  createOrganizationInvite,
  revokeOrganizationInvite,
  resendOrganizationInvite,
} from '../../api/crm';
import {
  Building2,
  Users,
  Target,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

export default function CrmAdmin({ embedded }) {
  const { isInternalAdmin, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ organization_name: '', owner_email: '', owner_name: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [activeTab, setActiveTab] = useState('organizations');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, invitesRes] = await Promise.all([
        getAdminStats(),
        getAdminOrganizations({ limit: 50 }),
        getOrganizationInvites({ status: 'pending' }),
      ]);
      setStats(statsRes.data.stats);
      setOrganizations(orgsRes.data.items || []);
      setInvites(invitesRes.data.invites || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteLoading(true);

    try {
      await createOrganizationInvite(inviteForm);
      setShowInviteModal(false);
      setInviteForm({ organization_name: '', owner_email: '', owner_name: '' });
      loadData();
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to create invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await revokeOrganizationInvite(inviteId);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to revoke invite');
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      await resendOrganizationInvite(inviteId);
      alert('Invitation resent successfully');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to resend invite');
    }
  };

  if (!isInternalAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-gray-500 mt-1">Manage organizations and platform settings</p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Organization
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Organizations"
          value={stats?.total_organizations || 0}
          subtext={`${stats?.active_organizations || 0} active`}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.total_users || 0}
          subtext={`${stats?.active_users_30d || 0} active (30d)`}
        />
        <StatCard
          icon={Target}
          label="Total Leads"
          value={stats?.total_leads || 0}
        />
        <StatCard
          icon={Mail}
          label="Pending Invites"
          value={stats?.pending_org_invites || 0}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('organizations')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'organizations'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invites'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Invites ({invites.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-500">{org.owner_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {org.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {org.user_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {org.lead_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button className="text-amber-600 hover:text-amber-900">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No organizations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {invite.organization_name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{invite.owner_name || '-'}</div>
                    <div className="text-sm text-gray-500">{invite.owner_email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {invite.invited_by_name || invite.invited_by_email || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {invite.expires_at ? new Date(invite.expires_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResendInvite(invite.id)}
                        className="p-1 text-gray-400 hover:text-amber-600"
                        title="Resend invite"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Revoke invite"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No pending invites
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Organization</h2>

            {inviteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.organization_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, organization_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Email
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.owner_email}
                  onChange={(e) => setInviteForm({ ...inviteForm, owner_email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="owner@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name (optional)
                </label>
                <input
                  type="text"
                  value={inviteForm.owner_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, owner_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="John Doe"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <div className="bg-white rounded-lg border p-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
          {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
        </div>
      </div>
    </div>
  );
}

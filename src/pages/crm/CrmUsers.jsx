import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useCrmAuth';
import { getUsers, updateUser, deleteUser, sendInvite } from '../../api/crm';
import { Search, Plus, Mail, Shield, Trash2, X, UserPlus } from 'lucide-react';
import Toast from '../../components/crm/Toast';

export default function CrmUsers({ embedded }) {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await getUsers({ limit: 100 });
      if (data?.items) {
        setUsers(data.items);
      }
    } catch (err) {
      console.error('fetchUsers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const { data } = await updateUser(userId, { role });
      if (data?.ok) {
        showToast('Role updated');
        fetchUsers();
      }
    } catch (err) {
      showToast('Failed to update role');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await deleteUser(userId);
      showToast('User deleted');
      fetchUsers();
    } catch (err) {
      showToast('Failed to delete user');
    }
  };

  const handleInvite = async (email, role) => {
    try {
      const { data } = await sendInvite({ email, role });
      if (data?.ok) {
        showToast('Invitation sent');
        setShowInvite(false);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to send invite');
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Invite User
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onRoleChange={(role) => handleRoleChange(user.id, role)}
                    onDelete={() => handleDelete(user.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSubmit={handleInvite}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{children}</th>;
}

function UserRow({ user, onRoleChange, onDelete }) {
  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <span className="text-amber-700 font-medium">
              {(user.name || user.email || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="admin">Admin</option>
          <option value="sales">Sales</option>
          <option value="engineer">Engineer</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <StatusBadge active={user.is_active} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function InviteModal({ onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(email, role);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Invite User</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="engineer">Engineer</option>
            </select>
          </div>
          <p className="text-sm text-gray-500">
            An invitation email will be sent with a link to set up their account.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

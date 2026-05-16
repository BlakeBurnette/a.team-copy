import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useCrmAuth';
import { getMe, updateProfile, changePassword } from '../../api/crm';
import { User, Lock, Bell, Building2, Save, Check, LayoutGrid } from 'lucide-react';
import Toast from '../../components/crm/Toast';

export default function CrmSettings({ embedded }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [toast, setToast] = useState({ show: false, message: '' });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  return (
    <div className="space-y-6">
      {!embedded && <h1 className="text-2xl font-bold text-gray-900">Settings</h1>}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border p-2 space-y-1">
            <NavItem
              icon={User}
              label="Profile"
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
            />
            <NavItem
              icon={Lock}
              label="Password"
              active={activeTab === 'password'}
              onClick={() => setActiveTab('password')}
            />
            <NavItem
              icon={Bell}
              label="Notifications"
              active={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />
            <NavItem
              icon={LayoutGrid}
              label="Pipeline"
              active={activeTab === 'pipeline'}
              onClick={() => setActiveTab('pipeline')}
            />
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab showToast={showToast} />}
          {activeTab === 'password' && <PasswordTab showToast={showToast} />}
          {activeTab === 'notifications' && <NotificationsTab showToast={showToast} />}
          {activeTab === 'pipeline' && <PipelineTab showToast={showToast} />}
        </div>
      </div>

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active
          ? 'bg-amber-50 text-amber-700'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ProfileTab({ showToast }) {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getMe();
      if (data?.user) {
        setProfile({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
        });
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(profile);
      showToast('Profile updated');
    } catch (err) {
      showToast('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordTab({ showToast }) {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      showToast('Passwords do not match');
      return;
    }

    if (passwords.new.length < 8) {
      showToast('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwords.current, passwords.new);
      showToast('Password changed successfully');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h2>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Password requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character</li>
          </ul>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? 'Changing...' : (
              <>
                <Lock className="h-4 w-4" />
                Change Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationsTab({ showToast }) {
  const [settings, setSettings] = useState({
    email_new_lead: true,
    email_task_reminder: true,
    email_weekly_digest: false,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    showToast('Preferences updated');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>

      <div className="space-y-4 max-w-md">
        <NotificationToggle
          label="New lead assigned"
          description="Get notified when a lead is assigned to you"
          checked={settings.email_new_lead}
          onChange={() => handleToggle('email_new_lead')}
        />
        <NotificationToggle
          label="Task reminders"
          description="Receive reminders for upcoming and overdue tasks"
          checked={settings.email_task_reminder}
          onChange={() => handleToggle('email_task_reminder')}
        />
        <NotificationToggle
          label="Weekly digest"
          description="Get a weekly summary of your pipeline activity"
          checked={settings.email_weekly_digest}
          onChange={() => handleToggle('email_weekly_digest')}
        />
      </div>
    </div>
  );
}

function NotificationToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

const PIPELINE_MODES = [
  { value: 'contacts', label: 'Contacts Only', description: 'Show individual contacts in pipeline (B2C mode)' },
  { value: 'organizations', label: 'Organizations Only', description: 'Show organizations/companies in pipeline (B2B mode)' },
  { value: 'both', label: 'Both', description: 'Show both contacts and organizations in pipeline' },
];

function PipelineTab({ showToast }) {
  const [pipelineMode, setPipelineMode] = useState(() => {
    return localStorage.getItem('pipelineMode') || 'contacts';
  });

  const handleModeChange = (mode) => {
    setPipelineMode(mode);
    localStorage.setItem('pipelineMode', mode);
    showToast('Pipeline view updated');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Pipeline View</h2>
      <p className="text-sm text-gray-500 mb-6">Choose what records to display in the Pipeline Kanban view.</p>

      <div className="space-y-3 max-w-md">
        {PIPELINE_MODES.map((mode) => (
          <label
            key={mode.value}
            className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              pipelineMode === mode.value
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="pipelineMode"
              value={mode.value}
              checked={pipelineMode === mode.value}
              onChange={() => handleModeChange(mode.value)}
              className="mt-1 text-amber-500 focus:ring-amber-500"
            />
            <div>
              <div className="font-medium text-gray-900">{mode.label}</div>
              <div className="text-sm text-gray-500">{mode.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> After changing this setting, refresh the Pipeline page to see the updated view.
        </p>
      </div>
    </div>
  );
}

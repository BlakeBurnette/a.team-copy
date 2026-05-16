import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAcctAuth'
import { settingsApi } from '../../api/accounting'
import { User, Building, Lock, CheckCircle, Info } from 'lucide-react'

export default function AcctSettings({ embedded }) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    email: '',
  })

  const [organization, setOrganization] = useState({
    name: '',
    timezone: 'America/New_York',
  })

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
      })
    }
    loadOrganization()
  }, [user])

  const loadOrganization = async () => {
    try {
      const response = await settingsApi.getOrganization()
      setOrganization(response.data || { name: '', timezone: 'America/New_York' })
    } catch (err) {
      // Demo data
      setOrganization({
        name: 'Acme Inc.',
        timezone: 'America/New_York',
      })
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    try {
      await settingsApi.updateProfile(profile)
      setSuccess('Profile updated successfully')
    } catch (err) {
      alert('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveOrganization = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    try {
      await settingsApi.updateOrganization(organization)
      setSuccess('Organization settings updated')
    } catch (err) {
      alert('Failed to update organization')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your account and organization settings</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="flex gap-6">
        {/* Tabs */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Organization Settings</h2>
              <form onSubmit={handleSaveOrganization} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={organization.name}
                    onChange={(e) =>
                      setOrganization({ ...organization, name: e.target.value })
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={organization.timezone}
                    onChange={(e) =>
                      setOrganization({ ...organization, timezone: e.target.value })
                    }
                    className="input"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Security</h2>
              <div className="max-w-md">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Password Management</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Password changes and other security settings are managed through your
                      main PayHive account settings. Navigate to PayHive Settings to update
                      your password, enable two-factor authentication, or manage security preferences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

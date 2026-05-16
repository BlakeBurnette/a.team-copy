import { useState, useEffect } from 'react'
import { alertsApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import { Bell, Plus, Edit2, Trash2, Play, Mail, MessageSquare, Webhook } from 'lucide-react'

const channelIcons = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
}

const channelLabels = {
  email: 'Email',
  slack: 'Slack',
  webhook: 'Webhook',
}

const triggerLabels = {
  exception_created: 'Exception Created',
  exception_high_priority: 'High Priority Exception',
  sync_failed: 'Sync Failed',
  pattern_matched: 'Pattern Matched',
  daily_summary: 'Daily Summary',
}

export default function AcctAlerts({ embedded }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState(null)
  const [logsModal, setLogsModal] = useState(false)
  const [logs, setLogs] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    trigger: 'exception_created',
    channel: 'email',
    config: {
      email: '',
      slack_webhook: '',
      webhook_url: '',
    },
    is_active: true,
  })

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const response = await alertsApi.list()
      setAlerts(response.data || [])
    } catch (err) {
      // Demo data
      setAlerts([
        {
          id: '1',
          name: 'High Priority Exceptions',
          trigger: 'exception_high_priority',
          channel: 'email',
          config: { email: 'admin@example.com' },
          is_active: true,
          last_triggered: '2024-01-15T14:30:00Z',
        },
        {
          id: '2',
          name: 'Sync Failure Alert',
          trigger: 'sync_failed',
          channel: 'slack',
          config: { slack_webhook: 'https://hooks.slack.com/...' },
          is_active: true,
          last_triggered: null,
        },
        {
          id: '3',
          name: 'Daily Digest',
          trigger: 'daily_summary',
          channel: 'email',
          config: { email: 'team@example.com' },
          is_active: false,
          last_triggered: '2024-01-14T08:00:00Z',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingAlert(null)
    setFormData({
      name: '',
      trigger: 'exception_created',
      channel: 'email',
      config: {
        email: '',
        slack_webhook: '',
        webhook_url: '',
      },
      is_active: true,
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (alert) => {
    setEditingAlert(alert)
    setFormData({
      name: alert.name,
      trigger: alert.trigger,
      channel: alert.channel,
      config: {
        email: alert.config?.email || '',
        slack_webhook: alert.config?.slack_webhook || '',
        webhook_url: alert.config?.webhook_url || '',
      },
      is_active: alert.is_active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        name: formData.name,
        trigger: formData.trigger,
        channel: formData.channel,
        config: {},
        is_active: formData.is_active,
      }

      if (formData.channel === 'email') {
        data.config.email = formData.config.email
      } else if (formData.channel === 'slack') {
        data.config.slack_webhook = formData.config.slack_webhook
      } else if (formData.channel === 'webhook') {
        data.config.webhook_url = formData.config.webhook_url
      }

      if (editingAlert) {
        await alertsApi.update(editingAlert.id, data)
      } else {
        await alertsApi.create(data)
      }
      setModalOpen(false)
      loadAlerts()
    } catch (err) {
      alert('Failed to save alert configuration')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this alert?')) return
    try {
      await alertsApi.delete(id)
      loadAlerts()
    } catch (err) {
      alert('Failed to delete alert')
    }
  }

  const handleTest = async (id) => {
    try {
      await alertsApi.test(id)
      alert('Test alert sent successfully!')
    } catch (err) {
      alert('Failed to send test alert')
    }
  }

  const handleViewLogs = async (alertConfig) => {
    try {
      const response = await alertsApi.getLogs(alertConfig.id, { limit: 20 })
      setLogs(response.data || [])
    } catch (err) {
      // Demo logs
      setLogs([
        { id: '1', timestamp: '2024-01-15T14:30:00Z', status: 'success', message: 'Alert sent successfully' },
        { id: '2', timestamp: '2024-01-15T10:15:00Z', status: 'success', message: 'Alert sent successfully' },
        { id: '3', timestamp: '2024-01-14T16:45:00Z', status: 'failed', message: 'Email delivery failed' },
      ])
    }
    setLogsModal(true)
  }

  const handleToggleActive = async (alertConfig) => {
    try {
      await alertsApi.update(alertConfig.id, { is_active: !alertConfig.is_active })
      loadAlerts()
    } catch (err) {
      alert('Failed to update alert')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-gray-500">Configure notifications for important events</p>
          </div>
          <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Alert
          </button>
        </div>
      )}

      {/* Alert List */}
      <div className="card">
        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No alerts configured</p>
            <p className="text-sm text-gray-500">
              Create an alert to get notified about important events
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map((alertConfig) => {
              const ChannelIcon = channelIcons[alertConfig.channel] || Bell
              return (
                <div key={alertConfig.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${alertConfig.is_active ? 'bg-amber-50' : 'bg-gray-100'}`}>
                      <ChannelIcon className={`w-5 h-5 ${alertConfig.is_active ? 'text-amber-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{alertConfig.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">
                          {triggerLabels[alertConfig.trigger] || alertConfig.trigger}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {channelLabels[alertConfig.channel]}
                        </span>
                        {alertConfig.last_triggered && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              Last: {new Date(alertConfig.last_triggered).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(alertConfig)}
                    >
                      <Badge variant={alertConfig.is_active ? 'success' : 'default'}>
                        {alertConfig.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>

                    <button
                      onClick={() => handleTest(alertConfig.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Send test alert"
                    >
                      <Play className="w-4 h-4 text-gray-500" />
                    </button>

                    <button
                      onClick={() => handleViewLogs(alertConfig)}
                      className="text-sm text-amber-600 hover:text-amber-700"
                    >
                      Logs
                    </button>

                    <button
                      onClick={() => handleOpenEdit(alertConfig)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>

                    <button
                      onClick={() => handleDelete(alertConfig.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAlert ? 'Edit Alert' : 'Create Alert'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., High Priority Exceptions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trigger Event
            </label>
            <select
              value={formData.trigger}
              onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
              className="input"
            >
              <option value="exception_created">Exception Created</option>
              <option value="exception_high_priority">High Priority Exception</option>
              <option value="sync_failed">Sync Failed</option>
              <option value="pattern_matched">Pattern Matched</option>
              <option value="daily_summary">Daily Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Channel
            </label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              className="input"
            >
              <option value="email">Email</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>

          {formData.channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.config.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, email: e.target.value },
                  })
                }
                className="input"
                placeholder="alerts@example.com"
              />
            </div>
          )}

          {formData.channel === 'slack' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={formData.config.slack_webhook}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, slack_webhook: e.target.value },
                  })
                }
                className="input"
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          )}

          {formData.channel === 'webhook' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.config.webhook_url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, webhook_url: e.target.value },
                  })
                }
                className="input"
                placeholder="https://api.example.com/webhook"
              />
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Alert is active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={!formData.name}
            >
              {editingAlert ? 'Save Changes' : 'Create Alert'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={logsModal}
        onClose={() => setLogsModal(false)}
        title="Alert Logs"
      >
        {logs.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No logs available</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg ${
                  log.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                    {log.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

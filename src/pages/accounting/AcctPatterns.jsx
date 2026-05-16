import { useState, useEffect } from 'react'
import { patternsApi, integrationsApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import DataTable from '../../components/accounting/ui/DataTable'
import { Plus, Edit2, Trash2, Sparkles, TrendingUp } from 'lucide-react'

export default function AcctPatterns({ embedded }) {
  const [patterns, setPatterns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPattern, setEditingPattern] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    vendor_pattern: '',
    description_pattern: '',
    amount_min: '',
    amount_max: '',
    account_id: '',
    priority: 10,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [patternsRes, accountsRes] = await Promise.all([
        patternsApi.list({}),
        integrationsApi.listAccounts(),
      ])
      setPatterns(patternsRes.data?.items || [])
      setAccounts(accountsRes.data || [])
    } catch (err) {
      // Demo data
      setPatterns([
        {
          id: '1',
          name: 'AWS Services',
          vendor_pattern: 'AMAZON WEB SERVICES|AWS',
          account_name: 'Software Expense',
          match_count: 156,
          last_matched: '2024-01-15T14:22:00Z',
          is_active: true,
          priority: 10,
        },
        {
          id: '2',
          name: 'Google Cloud',
          vendor_pattern: 'GOOGLE CLOUD|GCP',
          account_name: 'Software Expense',
          match_count: 89,
          last_matched: '2024-01-14T09:15:00Z',
          is_active: true,
          priority: 10,
        },
        {
          id: '3',
          name: 'Stripe Revenue',
          vendor_pattern: 'STRIPE',
          description_pattern: 'PAYMENT',
          amount_min: 0,
          account_name: 'Revenue',
          match_count: 342,
          last_matched: '2024-01-15T16:00:00Z',
          is_active: true,
          priority: 5,
        },
      ])
      setAccounts([
        { id: 'acc_1', name: 'Software Expense', code: '6100' },
        { id: 'acc_2', name: 'Office Supplies', code: '6200' },
        { id: 'acc_3', name: 'Revenue', code: '4000' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingPattern(null)
    setFormData({
      name: '',
      vendor_pattern: '',
      description_pattern: '',
      amount_min: '',
      amount_max: '',
      account_id: '',
      priority: 10,
      is_active: true,
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (pattern) => {
    setEditingPattern(pattern)
    setFormData({
      name: pattern.name,
      vendor_pattern: pattern.vendor_pattern || '',
      description_pattern: pattern.description_pattern || '',
      amount_min: pattern.amount_min ?? '',
      amount_max: pattern.amount_max ?? '',
      account_id: pattern.account_id || '',
      priority: pattern.priority || 10,
      is_active: pattern.is_active,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        amount_min: formData.amount_min !== '' ? parseFloat(formData.amount_min) : null,
        amount_max: formData.amount_max !== '' ? parseFloat(formData.amount_max) : null,
        priority: parseInt(formData.priority),
      }

      if (editingPattern) {
        await patternsApi.update(editingPattern.id, data)
      } else {
        await patternsApi.create(data)
      }
      setModalOpen(false)
      loadData()
    } catch (err) {
      alert('Failed to save pattern')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this pattern?')) return
    try {
      await patternsApi.delete(id)
      loadData()
    } catch (err) {
      alert('Failed to delete pattern')
    }
  }

  const handleToggleActive = async (pattern) => {
    try {
      await patternsApi.update(pattern.id, { is_active: !pattern.is_active })
      loadData()
    } catch (err) {
      alert('Failed to update pattern')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Pattern Name',
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500 font-mono">{row.vendor_pattern}</p>
        </div>
      ),
    },
    {
      key: 'account_name',
      header: 'Account',
    },
    {
      key: 'match_count',
      header: 'Matches',
      render: (value) => (
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500" />
          {value}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleActive(row)
          }}
        >
          <Badge variant={value ? 'success' : 'default'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOpenEdit(row)
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(row.id)
            }}
            className="p-2 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Patterns</h1>
            <p className="text-gray-500">Automate transaction coding with pattern matching</p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Pattern
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="card p-4 bg-amber-50 border-amber-100">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Pattern Matching</p>
            <p className="text-sm text-amber-700">
              Patterns use regular expressions to match vendor names and descriptions.
              Higher priority patterns are evaluated first. Use the pipe character (|) to match multiple terms.
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={patterns}
        loading={loading}
        emptyMessage="No patterns created yet"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPattern ? 'Edit Pattern' : 'Create Pattern'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pattern Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., AWS Services"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor Pattern (regex)
            </label>
            <input
              type="text"
              value={formData.vendor_pattern}
              onChange={(e) => setFormData({ ...formData, vendor_pattern: e.target.value })}
              className="input font-mono"
              placeholder="e.g., AMAZON WEB SERVICES|AWS"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use | to match multiple terms. Leave empty to skip vendor matching.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description Pattern (regex)
            </label>
            <input
              type="text"
              value={formData.description_pattern}
              onChange={(e) => setFormData({ ...formData, description_pattern: e.target.value })}
              className="input font-mono"
              placeholder="e.g., PAYMENT|TRANSFER"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount
              </label>
              <input
                type="number"
                value={formData.amount_min}
                onChange={(e) => setFormData({ ...formData, amount_min: e.target.value })}
                className="input"
                placeholder="Optional"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount
              </label>
              <input
                type="number"
                value={formData.amount_max}
                onChange={(e) => setFormData({ ...formData, amount_max: e.target.value })}
                className="input"
                placeholder="Optional"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account *
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
              className="input"
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (1-100)
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="input"
              min="1"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Higher priority patterns are evaluated first.
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">Pattern is active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={!formData.name || !formData.account_id}
            >
              {editingPattern ? 'Save Changes' : 'Create Pattern'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

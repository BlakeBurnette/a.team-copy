import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dcfApi } from '../../api/accounting'
import DataTable from '../../components/accounting/ui/DataTable'
import Badge from '../../components/accounting/ui/Badge'
import { Plus, TrendingUp, DollarSign, Calendar, Trash2 } from 'lucide-react'

const statusColors = {
  draft: 'warning',
  active: 'success',
  archived: 'default',
}

const statusLabels = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

export default function AcctDCF({ embedded }) {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
  })

  useEffect(() => {
    loadModels()
  }, [pagination.page])

  const loadModels = async () => {
    setLoading(true)
    try {
      const response = await dcfApi.listModels({
        page: pagination.page,
        limit: pagination.per_page,
      })
      setModels(response.data.items || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }))
    } catch (err) {
      console.error('Failed to load DCF models:', err)
      // Demo data for development
      setModels([
        {
          id: '1',
          name: '2024 Valuation',
          status: 'active',
          enterprise_value: 2500000,
          projection_years: 5,
          discount_rate: 0.12,
          ai_analysis_completed_at: '2024-01-15',
          updated_at: '2024-01-20',
        },
        {
          id: '2',
          name: 'Q1 Projection Review',
          status: 'draft',
          enterprise_value: null,
          projection_years: 5,
          discount_rate: 0.10,
          ai_analysis_completed_at: null,
          updated_at: '2024-01-18',
        },
      ])
      setPagination((prev) => ({ ...prev, total: 2 }))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this valuation model?')) return

    try {
      await dcfApi.deleteModel(id)
      loadModels()
    } catch (err) {
      console.error('Failed to delete model:', err)
    }
  }

  const formatCurrency = (value) => {
    if (!value) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-'
    return `${(value * 100).toFixed(1)}%`
  }

  const columns = [
    {
      key: 'name',
      header: 'Model Name',
      render: (value, row) => (
        <Link
          to={`/app/accounting/dcf/${row.id}`}
          className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          {value}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge variant={statusColors[value] || 'default'}>
          {statusLabels[value] || value}
        </Badge>
      ),
    },
    {
      key: 'enterprise_value',
      header: 'Enterprise Value',
      render: (value) => (
        <span className="font-mono">
          {value ? (
            <span className="text-green-600 font-semibold">{formatCurrency(value)}</span>
          ) : (
            <span className="text-gray-400">Not calculated</span>
          )}
        </span>
      ),
    },
    {
      key: 'projection_years',
      header: 'Projection',
      render: (value) => `${value} years`,
    },
    {
      key: 'discount_rate',
      header: 'Discount Rate',
      render: (value) => formatPercent(value),
    },
    {
      key: 'ai_analysis_completed_at',
      header: 'AI Analysis',
      render: (value) => (
        <span className={value ? 'text-green-600' : 'text-gray-400'}>
          {value ? 'Complete' : 'Pending'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <button
          onClick={(e) => handleDelete(row.id, e)}
          className="p-1 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  const totalPages = Math.ceil(pagination.total / pagination.per_page)

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">DCF Valuations</h1>
            <p className="text-gray-500">Discounted Cash Flow analysis with AI-powered projections</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Valuation
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Models</p>
              <p className="text-xl font-bold">
                {models.filter((m) => m.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Highest Valuation</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  Math.max(...models.map((m) => m.enterprise_value || 0))
                ) || '-'}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">AI Analyzed</p>
              <p className="text-xl font-bold">
                {models.filter((m) => m.ai_analysis_completed_at).length} / {models.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={models}
        loading={loading}
        emptyMessage="No valuation models yet. Create one to get started."
        pagination={{
          page: pagination.page,
          totalPages,
          total: pagination.total,
          from: (pagination.page - 1) * pagination.per_page + 1,
          to: Math.min(pagination.page * pagination.per_page, pagination.total),
        }}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateModelModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(model) => {
            setShowCreateModal(false)
            navigate(`/app/accounting/dcf/${model.id}`)
          }}
        />
      )}
    </div>
  )
}

function CreateModelModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projection_years: 5,
    discount_rate: 0.10,
    terminal_growth_rate: 0.03,
    historical_start_date: '',
    historical_end_date: '',
  })

  // Set default dates
  useEffect(() => {
    const today = new Date()
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1)
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 0)

    setFormData((prev) => ({
      ...prev,
      historical_start_date: oneYearAgo.toISOString().split('T')[0],
      historical_end_date: lastMonth.toISOString().split('T')[0],
    }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await dcfApi.createModel(formData)
      onCreated(response.data)
    } catch (err) {
      console.error('Failed to create model:', err)
      alert('Failed to create model')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">New DCF Valuation</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create a new valuation model to analyze your business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., 2024 Annual Valuation"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
              placeholder="Notes about this valuation..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Historical Start</label>
              <input
                type="date"
                value={formData.historical_start_date}
                onChange={(e) => setFormData({ ...formData, historical_start_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Historical End</label>
              <input
                type="date"
                value={formData.historical_end_date}
                onChange={(e) => setFormData({ ...formData, historical_end_date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Projection Years</label>
              <select
                value={formData.projection_years}
                onChange={(e) => setFormData({ ...formData, projection_years: parseInt(e.target.value) })}
                className="input"
              >
                {[3, 5, 7, 10].map((y) => (
                  <option key={y} value={y}>{y} years</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount Rate</label>
              <select
                value={formData.discount_rate}
                onChange={(e) => setFormData({ ...formData, discount_rate: parseFloat(e.target.value) })}
                className="input"
              >
                {[0.08, 0.10, 0.12, 0.15, 0.18, 0.20].map((r) => (
                  <option key={r} value={r}>{(r * 100).toFixed(0)}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Terminal Growth</label>
              <select
                value={formData.terminal_growth_rate}
                onChange={(e) => setFormData({ ...formData, terminal_growth_rate: parseFloat(e.target.value) })}
                className="input"
              >
                {[0.01, 0.02, 0.03, 0.04, 0.05].map((r) => (
                  <option key={r} value={r}>{(r * 100).toFixed(0)}%</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !formData.name}
            >
              {loading ? 'Creating...' : 'Create Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

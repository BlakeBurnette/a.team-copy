import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { transactionsApi } from '../../api/accounting'
import DataTable from '../../components/accounting/ui/DataTable'
import Badge from '../../components/accounting/ui/Badge'
import { Search, Filter, Download, ExternalLink } from 'lucide-react'

const stateColors = {
  pending: 'warning',
  coded: 'success',
  exception: 'danger',
  synced: 'info',
  verified: 'primary',
}

const stateLabels = {
  pending: 'Pending',
  coded: 'Coded',
  exception: 'Exception',
  synced: 'Synced',
  verified: 'Verified',
}

export default function AcctTransactions({ embedded }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    date_from: '',
    date_to: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
  })

  useEffect(() => {
    loadTransactions()
  }, [pagination.page, filters.state])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...(filters.state && { state: filters.state }),
        ...(filters.search && { search: filters.search }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      }
      const response = await transactionsApi.list(params)
      setTransactions(response.data.items || [])
      setPagination((prev) => ({
        ...prev,
        total: response.data.total || 0,
      }))
    } catch (err) {
      console.error('Failed to load transactions:', err)
      setTransactions([
        { id: '1', date: '2024-01-15', description: 'AMAZON WEB SERVICES', amount: -1250.00, state: 'coded', account_name: 'Software Expense' },
        { id: '2', date: '2024-01-14', description: 'STRIPE PAYMENT', amount: 5840.00, state: 'verified', account_name: 'Revenue' },
        { id: '3', date: '2024-01-14', description: 'UNKNOWN VENDOR #4521', amount: -342.50, state: 'exception', account_name: null },
        { id: '4', date: '2024-01-13', description: 'GOOGLE CLOUD', amount: -892.00, state: 'pending', account_name: null },
      ])
      setPagination((prev) => ({ ...prev, total: 4 }))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    loadTransactions()
  }

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value, row) => (
        <Link
          to={`/app/accounting/transactions/${row.id}`}
          className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (value) => (
        <span className={value < 0 ? 'text-red-600' : 'text-green-600'}>
          {value < 0 ? '-' : '+'}${Math.abs(value).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'state',
      header: 'Status',
      render: (value) => (
        <Badge variant={stateColors[value] || 'default'}>
          {stateLabels[value] || value}
        </Badge>
      ),
    },
    {
      key: 'account_name',
      header: 'Account',
      render: (value) => value || <span className="text-gray-400">Uncoded</span>,
    },
  ]

  const totalPages = Math.ceil(pagination.total / pagination.per_page)

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-gray-500">View and manage bank transactions</p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      )}

      <div className="card p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10"
            />
          </div>
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="input w-full sm:w-40"
          >
            <option value="">All States</option>
            <option value="pending">Pending</option>
            <option value="coded">Coded</option>
            <option value="exception">Exception</option>
            <option value="synced">Synced</option>
            <option value="verified">Verified</option>
          </select>
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="input w-full sm:w-40" placeholder="From" />
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="input w-full sm:w-40" placeholder="To" />
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Apply
          </button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="No transactions found"
        pagination={{
          page: pagination.page,
          totalPages,
          total: pagination.total,
          from: (pagination.page - 1) * pagination.per_page + 1,
          to: Math.min(pagination.page * pagination.per_page, pagination.total),
        }}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../../api/accounting'
import StatCard from '../../components/accounting/ui/StatCard'
import {
  Receipt,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'

export default function AcctDashboard({ embedded }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await dashboardApi.getStats()
      setStats(response.data)
    } catch (err) {
      setError('Failed to load dashboard stats')
      // Set default stats for demo
      setStats({
        pending_exceptions: 12,
        total_transactions: 1847,
        active_patterns: 24,
        auto_coded_rate: 87.5,
        transactions_this_month: 342,
        resolved_this_week: 45,
      })
    } finally {
      setLoading(false)
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
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Overview of your accounting operations</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          {error} - Showing demo data
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Exceptions"
          value={stats?.pending_exceptions || 0}
          icon={AlertTriangle}
          trend={stats?.pending_exceptions > 10 ? 'Needs attention' : 'Looking good'}
          trendUp={stats?.pending_exceptions <= 10}
        />
        <StatCard
          title="Total Transactions"
          value={stats?.total_transactions?.toLocaleString() || 0}
          icon={Receipt}
        />
        <StatCard
          title="Active Patterns"
          value={stats?.active_patterns || 0}
          icon={Sparkles}
        />
        <StatCard
          title="Auto-Coded Rate"
          value={`${stats?.auto_coded_rate || 0}%`}
          icon={CheckCircle}
          trend="+2.3% from last month"
          trendUp={true}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/app/accounting/exceptions"
              className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-900">Review Exceptions</p>
                  <p className="text-sm text-red-600">
                    {stats?.pending_exceptions || 0} items need attention
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-red-400" />
            </Link>

            <Link
              to="/app/accounting/patterns"
              className="flex items-center justify-between p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-amber-900">Create Pattern</p>
                  <p className="text-sm text-amber-600">
                    Automate transaction coding
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400" />
            </Link>

            <Link
              to="/app/accounting/integrations"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-900">Sync Transactions</p>
                  <p className="text-sm text-blue-600">
                    Pull latest from bank accounts
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400" />
            </Link>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">This Week</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Transactions processed</span>
              </div>
              <span className="font-semibold">{stats?.transactions_this_month || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">Exceptions resolved</span>
              </div>
              <span className="font-semibold">{stats?.resolved_this_week || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className="text-gray-600">Auto-coded transactions</span>
              </div>
              <span className="font-semibold">
                {Math.round((stats?.transactions_this_month || 0) * (stats?.auto_coded_rate || 0) / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-600">Avg. resolution time</span>
              </div>
              <span className="font-semibold">2.4 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

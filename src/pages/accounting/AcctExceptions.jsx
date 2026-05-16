import { useState, useEffect } from 'react'
import { exceptionsApi, integrationsApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import StatCard from '../../components/accounting/ui/StatCard'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

const priorityColors = {
  high: 'danger',
  medium: 'warning',
  low: 'default',
}

const typeLabels = {
  unmatched_vendor: 'Unmatched Vendor',
  amount_threshold: 'Amount Threshold',
  duplicate_suspected: 'Duplicate Suspected',
  pattern_conflict: 'Pattern Conflict',
  manual_review: 'Manual Review',
}

export default function AcctExceptions({ embedded }) {
  const [exceptions, setExceptions] = useState([])
  const [stats, setStats] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedException, setSelectedException] = useState(null)
  const [resolveModal, setResolveModal] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [resolution, setResolution] = useState({ account_id: '', memo: '', create_pattern: false })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [exceptionsRes, statsRes, accountsRes] = await Promise.all([
        exceptionsApi.list({ status: 'open' }),
        exceptionsApi.getStats(),
        integrationsApi.listAccounts(),
      ])
      setExceptions(exceptionsRes.data?.items || [])
      setStats(statsRes.data)
      setAccounts(accountsRes.data || [])
    } catch (err) {
      setExceptions([
        { id: '1', transaction_id: 'txn_1', type: 'unmatched_vendor', priority: 'high', description: 'UNKNOWN VENDOR #4521', amount: -342.50, date: '2024-01-14', created_at: '2024-01-14T15:30:00Z', assigned_to: null },
        { id: '2', transaction_id: 'txn_2', type: 'amount_threshold', priority: 'medium', description: 'AWS Large Transaction', amount: -15420.00, date: '2024-01-13', created_at: '2024-01-13T09:00:00Z', assigned_to: 'john@example.com' },
        { id: '3', transaction_id: 'txn_3', type: 'duplicate_suspected', priority: 'low', description: 'STRIPE PAYMENT', amount: 2500.00, date: '2024-01-12', created_at: '2024-01-12T11:20:00Z', assigned_to: null },
      ])
      setStats({ total_open: 12, high_priority: 3, resolved_today: 5, avg_resolution_hours: 2.4 })
      setAccounts([
        { id: 'acc_1', name: 'Software Expense', code: '6100' },
        { id: 'acc_2', name: 'Office Supplies', code: '6200' },
        { id: 'acc_3', name: 'Revenue', code: '4000' },
      ])
    } finally { setLoading(false) }
  }

  const handleOpenResolve = async (exception) => {
    setSelectedException(exception)
    setResolution({ account_id: '', memo: '', create_pattern: false })
    setAiSuggestion(null)
    setResolveModal(true)
  }

  const handleGetSuggestion = async () => {
    if (!selectedException) return
    setLoadingSuggestion(true)
    try {
      const response = await exceptionsApi.getAiSuggestion(selectedException.id)
      setAiSuggestion(response.data)
    } catch (err) {
      setAiSuggestion({ account_id: 'acc_1', account_name: 'Software Expense', confidence: 0.87, reason: 'Based on similar transactions from this vendor pattern' })
    } finally { setLoadingSuggestion(false) }
  }

  const handleResolve = async () => {
    if (!selectedException) return
    try {
      await exceptionsApi.resolve(selectedException.id, resolution)
      setResolveModal(false)
      loadData()
    } catch (err) { alert('Failed to resolve exception') }
  }

  const applySuggestion = () => {
    if (aiSuggestion) setResolution((prev) => ({ ...prev, account_id: aiSuggestion.account_id }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div><h1 className="text-2xl font-bold">Exceptions</h1><p className="text-gray-500">Review and resolve transaction exceptions</p></div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Exceptions" value={stats?.total_open || 0} icon={AlertTriangle} />
        <StatCard title="High Priority" value={stats?.high_priority || 0} icon={AlertTriangle} className="border-l-4 border-l-red-500" />
        <StatCard title="Resolved Today" value={stats?.resolved_today || 0} icon={CheckCircle} />
        <StatCard title="Avg. Resolution" value={`${stats?.avg_resolution_hours || 0}h`} icon={Clock} />
      </div>

      <div className="card">
        <div className="p-4 border-b"><h2 className="font-semibold">Exception Queue</h2></div>
        {exceptions.length === 0 ? (
          <div className="p-8 text-center"><CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><p className="text-gray-600">No open exceptions</p><p className="text-sm text-gray-500">All transactions are properly coded</p></div>
        ) : (
          <div className="divide-y">
            {exceptions.map((exception) => (
              <div key={exception.id} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => handleOpenResolve(exception)}>
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${exception.priority === 'high' ? 'bg-red-100' : exception.priority === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`w-5 h-5 ${exception.priority === 'high' ? 'text-red-600' : exception.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className="font-medium">{exception.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant={priorityColors[exception.priority]}>{exception.priority}</Badge>
                      <span className="text-sm text-gray-500">{typeLabels[exception.type] || exception.type}</span>
                      <span className="text-sm text-gray-500">{new Date(exception.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-medium ${exception.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>{exception.amount < 0 ? '-' : '+'}${Math.abs(exception.amount).toFixed(2)}</span>
                  {exception.assigned_to && <div className="flex items-center gap-1 text-sm text-gray-500"><User className="w-4 h-4" />{exception.assigned_to.split('@')[0]}</div>}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={resolveModal} onClose={() => setResolveModal(false)} title="Resolve Exception" size="lg">
        {selectedException && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div><p className="font-medium">{selectedException.description}</p><p className="text-sm text-gray-500">{typeLabels[selectedException.type]} • {new Date(selectedException.date).toLocaleDateString()}</p></div>
                <span className={`font-bold ${selectedException.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>{selectedException.amount < 0 ? '-' : '+'}${Math.abs(selectedException.amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" />AI Suggestion</h4>
                <button onClick={handleGetSuggestion} disabled={loadingSuggestion} className="text-sm text-amber-600 hover:text-amber-700">{loadingSuggestion ? 'Loading...' : 'Get Suggestion'}</button>
              </div>
              {aiSuggestion ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><span className="text-sm"><strong>{aiSuggestion.account_name}</strong></span><Badge variant="success">{Math.round(aiSuggestion.confidence * 100)}% confidence</Badge></div>
                  <p className="text-sm text-gray-600">{aiSuggestion.reason}</p>
                  <button onClick={applySuggestion} className="text-sm text-amber-600 hover:text-amber-700 font-medium">Apply suggestion</button>
                </div>
              ) : <p className="text-sm text-gray-500">Click "Get Suggestion" for AI-powered account recommendation</p>}
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account</label><select value={resolution.account_id} onChange={(e) => setResolution({ ...resolution, account_id: e.target.value })} className="input"><option value="">Select an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Memo</label><input type="text" value={resolution.memo} onChange={(e) => setResolution({ ...resolution, memo: e.target.value })} className="input" placeholder="Optional memo for this transaction" /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={resolution.create_pattern} onChange={(e) => setResolution({ ...resolution, create_pattern: e.target.checked })} className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" /><span className="text-sm text-gray-700">Create pattern for future similar transactions</span></label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t"><button onClick={() => setResolveModal(false)} className="btn-secondary">Cancel</button><button onClick={handleResolve} className="btn-primary" disabled={!resolution.account_id}>Resolve Exception</button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

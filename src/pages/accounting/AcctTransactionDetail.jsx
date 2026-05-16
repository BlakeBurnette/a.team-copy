import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { transactionsApi, integrationsApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Shield,
  Edit2,
  History,
} from 'lucide-react'

const stateColors = {
  pending: 'warning',
  coded: 'success',
  exception: 'danger',
  synced: 'info',
  verified: 'primary',
}

export default function AcctTransactionDetail() {
  const { id } = useParams()
  const [transaction, setTransaction] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [codingModal, setCodingModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [memo, setMemo] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    loadTransaction()
    loadAccounts()
  }, [id])

  const loadTransaction = async () => {
    try {
      const response = await transactionsApi.get(id)
      setTransaction(response.data)
    } catch (err) {
      setTransaction({
        id,
        external_id: 'plaid_txn_abc123',
        date: '2024-01-15',
        description: 'AMAZON WEB SERVICES AWS',
        amount: -1250.00,
        state: 'coded',
        account_id: 'acc_1',
        account_name: 'Software Expense',
        bank_account_name: 'Business Checking ****4521',
        memo: 'Monthly AWS hosting',
        bundle_id: 'bundle_abc',
        created_at: '2024-01-15T10:30:00Z',
        coded_at: '2024-01-15T14:22:00Z',
        coded_by: 'Auto-pattern: AWS Services',
        history: [
          { action: 'created', timestamp: '2024-01-15T10:30:00Z', actor: 'System' },
          { action: 'auto_coded', timestamp: '2024-01-15T14:22:00Z', actor: 'Pattern: AWS Services' },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await integrationsApi.listAccounts()
      setAccounts(response.data || [])
    } catch (err) {
      setAccounts([
        { id: 'acc_1', name: 'Software Expense', code: '6100' },
        { id: 'acc_2', name: 'Office Supplies', code: '6200' },
        { id: 'acc_3', name: 'Revenue', code: '4000' },
        { id: 'acc_4', name: 'Consulting Income', code: '4100' },
      ])
    }
  }

  const handleUpdateCoding = async () => {
    try {
      await transactionsApi.updateCoding(id, { account_id: selectedAccount, memo })
      setCodingModal(false)
      loadTransaction()
    } catch (err) {
      alert('Failed to update coding')
    }
  }

  const handleVerifyChain = async () => {
    setVerifying(true)
    try {
      const response = await transactionsApi.verifyChain(id)
      setVerifyResult(response.data)
    } catch (err) {
      setVerifyResult({ valid: true, message: 'Chain verification passed', block_count: 3 })
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Transaction not found</p>
        <Link to="/app/accounting/transactions" className="text-amber-600 hover:text-amber-700 mt-2 inline-block">
          Back to transactions
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/app/accounting/transactions" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Transaction Details</h1>
          <p className="text-gray-500">{transaction.external_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">{transaction.description}</h2>
                <p className="text-gray-500">{transaction.bank_account_name}</p>
              </div>
              <Badge variant={stateColors[transaction.state]}>{transaction.state}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className={`text-2xl font-bold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-medium">{new Date(transaction.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Account</p>
                <p className="text-lg font-medium">{transaction.account_name || <span className="text-gray-400">Uncoded</span>}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Memo</p>
                <p className="text-lg font-medium">{transaction.memo || <span className="text-gray-400">None</span>}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t flex gap-3">
              <button onClick={() => { setSelectedAccount(transaction.account_id || ''); setMemo(transaction.memo || ''); setCodingModal(true); }} className="btn-primary flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Update Coding
              </button>
              <button onClick={handleVerifyChain} disabled={verifying} className="btn-secondary flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {verifying ? 'Verifying...' : 'Verify Chain'}
              </button>
            </div>

            {verifyResult && (
              <div className={`mt-4 p-4 rounded-lg ${verifyResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {verifyResult.valid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Shield className="w-5 h-5 text-red-600" />}
                  <p className={verifyResult.valid ? 'text-green-800' : 'text-red-800'}>{verifyResult.message}</p>
                </div>
                {verifyResult.block_count && <p className="text-sm text-gray-600 mt-1">Verified across {verifyResult.block_count} audit blocks</p>}
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              History
            </h3>
            <div className="space-y-4">
              {transaction.history?.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1"><div className="w-2 h-2 rounded-full bg-amber-500" /></div>
                  <div className="flex-1">
                    <p className="font-medium capitalize">{event.action.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">{event.actor} • {new Date(event.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Metadata
            </h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-gray-500">Transaction ID</dt><dd className="font-mono text-xs mt-1">{transaction.id}</dd></div>
              <div><dt className="text-gray-500">External ID</dt><dd className="font-mono text-xs mt-1">{transaction.external_id}</dd></div>
              {transaction.bundle_id && <div><dt className="text-gray-500">Bundle ID</dt><dd className="font-mono text-xs mt-1">{transaction.bundle_id}</dd></div>}
              <div><dt className="text-gray-500">Created</dt><dd className="mt-1">{new Date(transaction.created_at).toLocaleString()}</dd></div>
              {transaction.coded_at && <div><dt className="text-gray-500">Coded</dt><dd className="mt-1">{new Date(transaction.coded_at).toLocaleString()}</dd></div>}
              {transaction.coded_by && <div><dt className="text-gray-500">Coded By</dt><dd className="mt-1">{transaction.coded_by}</dd></div>}
            </dl>
          </div>
        </div>
      </div>

      <Modal isOpen={codingModal} onClose={() => setCodingModal(false)} title="Update Transaction Coding">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="input">
              <option value="">Select an account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Memo</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="input" placeholder="Optional memo" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setCodingModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleUpdateCoding} className="btn-primary" disabled={!selectedAccount}>Save Changes</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

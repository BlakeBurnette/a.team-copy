import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { integrationsApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import {
  Building,
  Link2,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react'

export default function AcctIntegrations({ embedded }) {
  const [bankConnections, setBankConnections] = useState([])
  const [qboConnection, setQboConnection] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [linkToken, setLinkToken] = useState(null)
  const [accountsModal, setAccountsModal] = useState(false)
  const [syncing, setSyncing] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [banksRes, qboRes, accountsRes] = await Promise.all([
        integrationsApi.listBankConnections(),
        integrationsApi.getQboConnection().catch(() => ({ data: null })),
        integrationsApi.listAccounts(),
      ])
      setBankConnections(banksRes.data || [])
      setQboConnection(qboRes.data)
      setAccounts(accountsRes.data || [])
    } catch (err) {
      // Demo data
      setBankConnections([
        {
          id: 'conn_1',
          institution_name: 'Chase',
          accounts: [
            { name: 'Business Checking', mask: '4521', type: 'depository' },
            { name: 'Business Savings', mask: '7832', type: 'depository' },
          ],
          last_synced: '2024-01-15T10:30:00Z',
          status: 'connected',
        },
      ])
      setQboConnection({
        company_name: 'Acme Inc.',
        connected_at: '2024-01-10T08:00:00Z',
        status: 'active',
      })
      setAccounts([
        { id: 'acc_1', name: 'Software Expense', code: '6100', type: 'expense' },
        { id: 'acc_2', name: 'Office Supplies', code: '6200', type: 'expense' },
        { id: 'acc_3', name: 'Revenue', code: '4000', type: 'income' },
        { id: 'acc_4', name: 'Bank Account', code: '1000', type: 'asset' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleConnectBank = async () => {
    try {
      const response = await integrationsApi.createPlaidLinkToken()
      setLinkToken(response.data.link_token)
    } catch (err) {
      alert('Failed to initialize bank connection')
    }
  }

  const onPlaidSuccess = useCallback(async (publicToken, metadata) => {
    try {
      await integrationsApi.exchangePlaidToken(publicToken, metadata)
      setLinkToken(null)
      loadData()
    } catch (err) {
      alert('Failed to connect bank account')
    }
  }, [])

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  })

  useEffect(() => {
    if (linkToken && plaidReady) {
      openPlaid()
    }
  }, [linkToken, plaidReady, openPlaid])

  const handleSyncBank = async (connectionId) => {
    setSyncing((prev) => ({ ...prev, [connectionId]: true }))
    try {
      await integrationsApi.syncBankConnection(connectionId)
      loadData()
    } catch (err) {
      alert('Failed to sync bank connection')
    } finally {
      setSyncing((prev) => ({ ...prev, [connectionId]: false }))
    }
  }

  const handleDisconnectBank = async (connectionId) => {
    if (!confirm('Are you sure you want to disconnect this bank account?')) return
    try {
      await integrationsApi.deleteBankConnection(connectionId)
      loadData()
    } catch (err) {
      alert('Failed to disconnect bank')
    }
  }

  const handleConnectQbo = async () => {
    try {
      const response = await integrationsApi.getQboAuthUrl()
      window.location.href = response.data.auth_url
    } catch (err) {
      alert('Failed to start QuickBooks connection')
    }
  }

  const handleSyncAccounts = async () => {
    try {
      await integrationsApi.syncAccounts()
      loadData()
    } catch (err) {
      alert('Failed to sync chart of accounts')
    }
  }

  const handleDisconnectQbo = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return
    try {
      await integrationsApi.disconnectQbo()
      setQboConnection(null)
    } catch (err) {
      alert('Failed to disconnect QuickBooks')
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
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-gray-500">Connect your bank accounts and accounting software</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Connections */}
        <div className="card">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold">Bank Accounts</h2>
            </div>
            <button onClick={handleConnectBank} className="btn-primary text-sm">
              Connect Bank
            </button>
          </div>

          {bankConnections.length === 0 ? (
            <div className="p-8 text-center">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No bank accounts connected</p>
              <p className="text-sm text-gray-500">
                Connect your bank to import transactions
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {bankConnections.map((connection) => (
                <div key={connection.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{connection.institution_name}</p>
                      <p className="text-sm text-gray-500">
                        Last synced: {new Date(connection.last_synced).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={connection.status === 'connected' ? 'success' : 'warning'}>
                      {connection.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    {connection.accounts.map((account, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded"
                      >
                        <span>{account.name}</span>
                        <span className="text-gray-500">****{account.mask}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSyncBank(connection.id)}
                      disabled={syncing[connection.id]}
                      className="btn-secondary text-sm flex items-center gap-1"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing[connection.id] ? 'animate-spin' : ''}`} />
                      Sync
                    </button>
                    <button
                      onClick={() => handleDisconnectBank(connection.id)}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QuickBooks */}
        <div className="card">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold">QuickBooks Online</h2>
            </div>
            {!qboConnection && (
              <button onClick={handleConnectQbo} className="btn-primary text-sm">
                Connect
              </button>
            )}
          </div>

          {!qboConnection ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">QuickBooks not connected</p>
              <p className="text-sm text-gray-500">
                Connect to sync your chart of accounts
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="font-medium">{qboConnection.company_name}</p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Connected: {new Date(qboConnection.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="success">Active</Badge>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSyncAccounts}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync Accounts
                </button>
                <button
                  onClick={() => setAccountsModal(true)}
                  className="btn-secondary text-sm"
                >
                  View Accounts
                </button>
                <button
                  onClick={handleDisconnectQbo}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart of Accounts Preview */}
      <div className="card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Chart of Accounts</h2>
          <span className="text-sm text-gray-500">{accounts.length} accounts</span>
        </div>

        {accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No accounts synced. Connect QuickBooks to import your chart of accounts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {accounts.slice(0, 10).map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{account.code}</td>
                    <td className="px-4 py-3 text-sm">{account.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="capitalize">
                        {account.type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {accounts.length > 10 && (
              <div className="p-3 text-center border-t">
                <button
                  onClick={() => setAccountsModal(true)}
                  className="text-amber-600 hover:text-amber-700 text-sm"
                >
                  View all {accounts.length} accounts
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accounts Modal */}
      <Modal
        isOpen={accountsModal}
        onClose={() => setAccountsModal(false)}
        title="Chart of Accounts"
        size="lg"
      >
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                  Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-2 text-sm font-mono">{account.code}</td>
                  <td className="px-4 py-2 text-sm">{account.name}</td>
                  <td className="px-4 py-2 text-sm capitalize">{account.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  )
}

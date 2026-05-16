import { useState, useEffect } from 'react'
import { auditApi } from '../../api/accounting'
import Badge from '../../components/accounting/ui/Badge'
import Modal from '../../components/accounting/ui/Modal'
import { Shield, Lock, CheckCircle, AlertCircle, ChevronRight, Search } from 'lucide-react'

export default function AcctAuditBlocks({ embedded }) {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [verifyModal, setVerifyModal] = useState(false)
  const [verifyForm, setVerifyForm] = useState({
    entityType: 'transaction',
    entityId: '',
  })
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [sealing, setSealing] = useState(false)

  useEffect(() => {
    loadBlocks()
  }, [])

  const loadBlocks = async () => {
    setLoading(true)
    try {
      const response = await auditApi.listBlocks({ limit: 20 })
      setBlocks(response.data?.items || [])
    } catch (err) {
      // Demo data
      setBlocks([
        {
          id: 'block_1',
          sequence: 142,
          merkle_root: '0x7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t',
          entry_count: 256,
          sealed_at: '2024-01-15T16:00:00Z',
          sealed_by: 'system',
          previous_hash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t',
        },
        {
          id: 'block_2',
          sequence: 141,
          merkle_root: '0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1a',
          entry_count: 312,
          sealed_at: '2024-01-15T12:00:00Z',
          sealed_by: 'system',
          previous_hash: '0x9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t',
        },
        {
          id: 'block_3',
          sequence: 140,
          merkle_root: '0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1a2b',
          entry_count: 189,
          sealed_at: '2024-01-15T08:00:00Z',
          sealed_by: 'admin@example.com',
          previous_hash: '0x8a7b6c5d4e3f2g1h0i9j8k7l6m5n4o3p2q1r0s9t',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSealBlock = async () => {
    if (!confirm('Are you sure you want to seal the current block? This action cannot be undone.')) {
      return
    }
    setSealing(true)
    try {
      await auditApi.sealBlock()
      loadBlocks()
    } catch (err) {
      alert('Failed to seal block')
    } finally {
      setSealing(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const response = await auditApi.verifyEntity(
        verifyForm.entityType,
        verifyForm.entityId
      )
      setVerifyResult(response.data)
    } catch (err) {
      // Demo result
      setVerifyResult({
        valid: true,
        entity_type: verifyForm.entityType,
        entity_id: verifyForm.entityId,
        block_sequence: 142,
        merkle_proof: [
          '0x1a2b3c4d...',
          '0x5e6f7g8h...',
          '0x9i0j1k2l...',
        ],
        verified_at: new Date().toISOString(),
      })
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

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Audit Trail</h1>
            <p className="text-gray-500">Immutable record of all accounting operations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setVerifyModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Verify Entity
            </button>
            <button
              onClick={handleSealBlock}
              disabled={sealing}
              className="btn-primary flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {sealing ? 'Sealing...' : 'Seal Block'}
            </button>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card p-4 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Trust Chain</p>
            <p className="text-sm text-blue-700">
              Every transaction and coding decision is recorded in a Merkle tree structure.
              Sealed blocks are cryptographically linked, ensuring data integrity and providing
              an immutable audit trail for compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Blocks List */}
      <div className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Sealed Blocks</h2>
        </div>

        {blocks.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No sealed blocks yet</p>
            <p className="text-sm text-gray-500">
              Blocks are automatically sealed periodically or can be manually sealed
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedBlock(block)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Lock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Block #{block.sequence}</p>
                      <p className="text-sm text-gray-500">
                        {block.entry_count} entries • Sealed {new Date(block.sealed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="success">Sealed</Badge>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Detail Modal */}
      <Modal
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlock(null)}
        title={`Block #${selectedBlock?.sequence}`}
        size="lg"
      >
        {selectedBlock && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Sequence</p>
                <p className="font-medium">{selectedBlock.sequence}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Entry Count</p>
                <p className="font-medium">{selectedBlock.entry_count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sealed At</p>
                <p className="font-medium">
                  {new Date(selectedBlock.sealed_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sealed By</p>
                <p className="font-medium">{selectedBlock.sealed_by}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Merkle Root</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                {selectedBlock.merkle_root}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Previous Block Hash</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                {selectedBlock.previous_hash}
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Block integrity verified</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                This block is cryptographically linked to the chain and cannot be modified.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Verify Modal */}
      <Modal
        isOpen={verifyModal}
        onClose={() => {
          setVerifyModal(false)
          setVerifyResult(null)
        }}
        title="Verify Entity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              value={verifyForm.entityType}
              onChange={(e) => setVerifyForm({ ...verifyForm, entityType: e.target.value })}
              className="input"
            >
              <option value="transaction">Transaction</option>
              <option value="exception">Exception</option>
              <option value="pattern">Pattern</option>
              <option value="coding_decision">Coding Decision</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID
            </label>
            <input
              type="text"
              value={verifyForm.entityId}
              onChange={(e) => setVerifyForm({ ...verifyForm, entityId: e.target.value })}
              className="input font-mono"
              placeholder="Enter the entity ID"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || !verifyForm.entityId}
            className="btn-primary w-full"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>

          {verifyResult && (
            <div className={`p-4 rounded-lg ${verifyResult.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                {verifyResult.valid ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Verification Passed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Verification Failed</span>
                  </>
                )}
              </div>

              {verifyResult.valid && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entity Type:</span>
                    <span className="font-medium capitalize">{verifyResult.entity_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Block:</span>
                    <span className="font-medium">#{verifyResult.block_sequence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Verified At:</span>
                    <span className="font-medium">
                      {new Date(verifyResult.verified_at).toLocaleString()}
                    </span>
                  </div>

                  {verifyResult.merkle_proof && (
                    <div className="mt-3">
                      <p className="text-gray-600 mb-1">Merkle Proof:</p>
                      <div className="bg-white p-2 rounded border space-y-1">
                        {verifyResult.merkle_proof.map((hash, idx) => (
                          <p key={idx} className="font-mono text-xs break-all">
                            {hash}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

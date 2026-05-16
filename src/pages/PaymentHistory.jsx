import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPayments } from '../api/attestations';
import AttestationBadge from '../components/attestations/AttestationBadge';
import AttestationDetailsPanel from '../components/attestations/AttestationDetailsPanel';
import CopyButton from '../components/attestations/CopyButton';
import useSession from '../hooks/useSession';
import DisputeExportModal from '../components/attestations/DisputeExportModal';

const truncate = (v) => {
  if (!v || typeof v !== 'string') return '';
  if (v.length <= 10) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
};

const formatAmount = (cents, currency = 'USD') => {
  const num = Number(cents || 0) / 100;
  return num.toLocaleString(undefined, { style: 'currency', currency: currency || 'USD' });
};

const mapResponse = (data) => {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return { items, nextCursor: data?.nextCursor || null };
};

const findAttestation = (list = [], proofType) => {
  if (!Array.isArray(list)) return null;
  return list.find((a) => a.proofType === proofType) || list[0] || null;
};

export default function PaymentHistory() {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const { isAdmin, userId } = useSession();
  const navigate = useNavigate();
  const [exportPaymentId, setExportPaymentId] = useState(null);

  const loadPayments = useCallback(async ({ cursor, append = false, useLimit } = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPayments({ limit: useLimit || limit, cursor });
      const { items: list, nextCursor: next } = mapResponse(res);
      if (append) {
        setItems((prev) => [...prev, ...list]);
      } else {
        setItems(list);
      }
      setNextCursor(next || null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    const hasPending = items.some((it) =>
      Array.isArray(it.attestations) && it.attestations.some((a) => a.status === 'pending')
    );
    if (!hasPending) return undefined;
    const id = setInterval(() => {
      loadPayments({ useLimit: items.length > limit ? items.length : limit });
    }, 10000);
    return () => clearInterval(id);
  }, [items, limit, loadPayments]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      loadPayments({ cursor: nextCursor, append: true });
    } else {
      const nextLimit = limit + 20;
      setLimit(nextLimit);
      loadPayments({ useLimit: nextLimit });
    }
  };

  const goToAuthorization = (authId) => {
    if (!authId) return;
    navigate(`/app/authorizations?highlight=${encodeURIComponent(authId)}`);
  };

  const header = (
    <div className="grid grid-cols-7 gap-4 font-semibold text-sm text-gray-600 px-3 py-2 border-b bg-gray-50">
      <div>Payment ID</div>
      <div>Created</div>
      <div>Amount</div>
      <div>Status</div>
      <div>Authorization</div>
      <div>Attestation</div>
      <div className="text-right">Actions</div>
    </div>
  );

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Payment History</h1>
        <div className="border rounded-lg overflow-hidden bg-white">
          {header}
          {items.map((item) => {
            const att = findAttestation(item.attestations, 'payment_link_attestation');
            const isExpanded = !!expanded[item.paymentId];
            const canViewAttestation = isAdmin || !!userId; // owners allowed; server enforces auth
            return (
              <div key={item.paymentId} className="border-b last:border-b-0">
                <div
                  className="grid grid-cols-7 gap-4 items-center px-3 py-3"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(item.paymentId)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.paymentId); }}
                >
                  <div className="text-sm text-gray-900 flex items-center">
                    <span>{truncate(item.paymentId)}</span>
                    <CopyButton text={item.paymentId} ariaLabel="Copy payment ID" />
                  </div>
                  <div className="text-sm text-gray-700">{formatDate(item.createdAt)}</div>
                  <div className="text-sm text-gray-900">{formatAmount(item.amountCents, item.currency || 'USD')}</div>
                  <div className="text-sm text-gray-700">{item.status || 'unknown'}</div>
                  <div className="text-sm text-gray-900 flex items-center gap-2">
                    <span>{truncate(item.authorizationId)}</span>
                    <CopyButton text={item.authorizationId} ariaLabel="Copy authorization ID" />
                    {item.authorizationId ? (
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => { e.stopPropagation(); goToAuthorization(item.authorizationId); }}
                      >
                        View
                      </button>
                    ) : null}
                  </div>
                  <div className="text-sm">
                    {att ? (
                      <AttestationBadge status={att.status} verified={att.verified} proofType={att.proofType} />
                    ) : '—'}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(item.paymentId); }}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>
                {isExpanded && att ? (
                  <div className="px-4 pb-4">
                    <div className="text-sm text-gray-700 mb-2">
                      Schema v{att.schemaVersion} — Circuit {att.circuitId}
                    </div>
                    <AttestationDetailsPanel
                      entityType="payment"
                      entityId={item.paymentId}
                      proofType={att.proofType}
                      canView={canViewAttestation}
                      isAdmin={isAdmin}
                    />
                    {isAdmin ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
                          onClick={() => setExportPaymentId(item.paymentId)}
                        >
                          Export dispute package
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
          {items.length === 0 && !loading ? (
            <div className="p-4 text-sm text-gray-600">No payments yet.</div>
          ) : null}
        </div>
        {error ? <div className="text-red-600 text-sm mt-2">{error}</div> : null}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm disabled:opacity-60"
          >
            {nextCursor ? 'Load more' : 'Load more (fallback)'}
          </button>
          {loading ? <span className="text-sm text-gray-600">Loading…</span> : null}
        </div>
      </div>
      <DisputeExportModal
        paymentId={exportPaymentId}
        isOpen={!!exportPaymentId}
        onClose={() => setExportPaymentId(null)}
      />
    </>
  );
}

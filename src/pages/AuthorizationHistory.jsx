import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAuthorizations } from '../api/attestations';
import AttestationBadge from '../components/attestations/AttestationBadge';
import AttestationDetailsPanel from '../components/attestations/AttestationDetailsPanel';
import CopyButton from '../components/attestations/CopyButton';
import useIsAdmin from '../hooks/useIsAdmin';

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

const mapResponse = (data) => {
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return { items, nextCursor: data?.nextCursor || null };
};

const findAttestation = (list = [], proofType) => {
  if (!Array.isArray(list)) return null;
  return list.find((a) => a.proofType === proofType) || list[0] || null;
};

export default function AuthorizationHistory() {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const highlightId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('highlight');
  }, [location.search]);

  const loadAuthorizations = useCallback(async ({ cursor, append = false, useLimit } = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAuthorizations({ limit: useLimit || limit, cursor });
      const { items: list, nextCursor: next } = mapResponse(res);
      if (append) {
        setItems((prev) => [...prev, ...list]);
      } else {
        setItems(list);
      }
      setNextCursor(next || null);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load authorizations');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadAuthorizations();
  }, [loadAuthorizations]);

  useEffect(() => {
    const hasPending = items.some((it) =>
      Array.isArray(it.attestations) && it.attestations.some((a) => a.status === 'pending')
    );
    if (!hasPending) return undefined;
    const id = setInterval(() => {
      loadAuthorizations({ useLimit: items.length > limit ? items.length : limit });
    }, 10000);
    return () => clearInterval(id);
  }, [items, limit, loadAuthorizations]);

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      loadAuthorizations({ cursor: nextCursor, append: true });
    } else {
      const nextLimit = limit + 20;
      setLimit(nextLimit);
      loadAuthorizations({ useLimit: nextLimit });
    }
  };

  const header = (
    <div className="grid grid-cols-6 gap-4 font-semibold text-sm text-gray-600 px-3 py-2 border-b bg-gray-50">
      <div>Authorization ID</div>
      <div>Created</div>
      <div>Anchor</div>
      <div>Bundle Hash</div>
      <div>Attestation</div>
      <div className="text-right">Actions</div>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Authorization History</h1>
      <div className="border rounded-lg overflow-hidden bg-white">
        {header}
        {items.map((item) => {
          const att = findAttestation(item.attestations, 'authorization_attestation');
          const isExpanded = !!expanded[item.authorizationId];
          const highlight = highlightId && highlightId === item.authorizationId;
          return (
            <div key={item.authorizationId} className={`border-b last:border-b-0 ${highlight ? 'bg-amber-50' : ''}`}>
              <div
                className="grid grid-cols-6 gap-4 items-center px-3 py-3"
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(item.authorizationId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.authorizationId); }}
              >
                <div className="text-sm text-gray-900 flex items-center">
                  <span>{truncate(item.authorizationId)}</span>
                  <CopyButton text={item.authorizationId} ariaLabel="Copy authorization ID" />
                </div>
                <div className="text-sm text-gray-700">{formatDate(item.createdAt)}</div>
                <div className="text-sm text-gray-900 flex items-center">
                  <span>{truncate(item.txHash)}</span>
                  <CopyButton text={item.txHash} ariaLabel="Copy anchor hash" />
                </div>
                <div className="text-sm text-gray-900 flex items-center">
                  <span>{truncate(item.bundleHash)}</span>
                  <CopyButton text={item.bundleHash} ariaLabel="Copy bundle hash" />
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
                    onClick={(e) => { e.stopPropagation(); toggleExpand(item.authorizationId); }}
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
                    entityType="authorization"
                    entityId={item.authorizationId}
                    proofType={att.proofType}
                    canView={isAdmin}
                    isAdmin={isAdmin}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {items.length === 0 && !loading ? (
          <div className="p-4 text-sm text-gray-600">No authorizations yet.</div>
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
  );
}

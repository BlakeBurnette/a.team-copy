import React, { useEffect, useState } from 'react';
import CopyButton from './CopyButton';

export default function DisputeExportModal({ paymentId, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!isOpen || !paymentId) return () => {};
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/exports/dispute/payment/${encodeURIComponent(paymentId)}`);
        if (!res.ok) throw new Error(`Failed to fetch export (${res.status})`);
        const json = await res.json();
        if (alive) setData(json);
      } catch (e) {
        if (alive) setError(e?.message || 'Failed to load dispute export');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen, paymentId]);

  if (!isOpen) return null;

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispute-${paymentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = ['payment', 'authorization', 'anchors', 'attestations', 'evidence'];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-auto p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Dispute Export</h2>
            <p className="text-sm text-gray-600">No PCI included.</p>
          </div>
          <button
            type="button"
            className="text-gray-600 hover:text-gray-800"
            aria-label="Close dispute export"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {loading ? <div className="text-sm text-gray-700">Loading…</div> : null}
        {error ? <div className="text-sm text-red-600 mb-2">{error}</div> : null}
        {data ? (
          <div className="space-y-3">
            {sections.map((key) => {
              if (!data[key]) return null;
              return (
                <div key={key} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-800 capitalize">{key}</div>
                    <CopyButton text={JSON.stringify(data[key], null, 2)} ariaLabel={`Copy ${key} JSON`} />
                  </div>
                  <pre className="bg-gray-100 rounded p-3 text-xs whitespace-pre-wrap break-words overflow-auto max-h-64">
{JSON.stringify(data[key], null, 2)}
                  </pre>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={downloadJson}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
              >
                Download JSON
              </button>
              <CopyButton text={JSON.stringify(data, null, 2)} ariaLabel="Copy full dispute JSON" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

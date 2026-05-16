import React, { useState } from 'react';
import { fetchAttestationDetail } from '../../api/attestations';
import Badge from '../Badge';
import CopyButton from './CopyButton';

const JsonBlock = ({ title, value }) => (
  <div className="mb-3">
    <div className="text-sm font-semibold mb-1 text-gray-700 flex items-center gap-2">
      <span>{title}</span>
      <CopyButton text={JSON.stringify(value, null, 2)} ariaLabel={`Copy ${title}`} />
    </div>
    <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto border border-gray-200 max-h-64 whitespace-pre-wrap break-words">
{JSON.stringify(value, null, 2)}
    </pre>
  </div>
);

export default function AttestationDetailsPanel({ entityType, entityId, proofType, canView, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState(null);

  if (!canView) return null;

  const buttonLabel = isAdmin ? 'View attestation details' : 'View ZK view';

  const loadDetails = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAttestationDetail({ entityType, entityId, proofType });
      setDetails(data || {});
      setOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load attestation details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={open ? () => setOpen(false) : loadDetails}
        className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 text-sm"
      >
        {open ? 'Hide attestation details' : loading ? 'Loading…' : buttonLabel}
      </button>
      {error ? <div className="text-sm text-red-600 mt-1">{error}</div> : null}
      {open && details ? (
        <div className="mt-3 border rounded p-3 bg-white">
          <div className="flex items-center gap-3 text-sm mb-2">
            <Badge color={details.verified ? 'green' : 'gray'}>
              {details.status || 'unknown'}
            </Badge>
            <span className="text-gray-700">Verified: {details.verified ? 'yes' : 'no'}</span>
            {details.verified_at ? <span className="text-gray-500">at {details.verified_at}</span> : null}
          </div>
          <div className="text-sm text-gray-700 mb-3">
            Schema v{details.schema_version} — Circuit {details.circuit_id}
          </div>
          {details.public_inputs ? <JsonBlock title="Public Inputs" value={details.public_inputs} /> : null}
          {details.commitments ? <JsonBlock title="Commitments" value={details.commitments} /> : null}
          {isAdmin && details.proof_b64 ? (
            <CopyButton
              text={details.proof_b64}
              label="Copy proof"
              ariaLabel="Copy attestation proof"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

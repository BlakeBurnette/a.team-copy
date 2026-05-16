import React from 'react';

const COLORS = {
  anchored: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

export function trustLabel({ trust_status, anchored_at, trust_block_id, block_id, trust_hash }) {
  const anchored = !!anchored_at || !!trust_block_id || !!block_id || (trust_status || '').toLowerCase() === 'anchored';
  if (anchored) return { label: 'Anchored', tone: 'anchored' };
  const status = (trust_status || '').toLowerCase();
  if (status === 'pending' || status === 'processing') return { label: 'Pending', tone: 'pending' };
  if (status === 'failed' || status === 'error') return { label: 'Failed', tone: 'failed' };
  if (status) return { label: status[0].toUpperCase() + status.slice(1), tone: 'default' };
  return null;
}

const TrustBadge = ({ trust_status, trust_hash, anchored_at, trust_block_id, block_id }) => {
  const meta = trustLabel({ trust_status, anchored_at, trust_block_id, block_id, trust_hash });
  if (!meta) return null;
  const color = COLORS[meta.tone] || COLORS.default;
  const hashSuffix = trust_hash ? ` • ${String(trust_hash).slice(0, 6)}…` : '';
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${color}`} title={trust_hash || trust_status}>
      {meta.label}{hashSuffix}
    </span>
  );
};

export default TrustBadge;

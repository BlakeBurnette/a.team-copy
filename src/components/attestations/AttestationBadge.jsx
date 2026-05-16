import React from 'react';
import Badge from '../Badge';
import Tooltip from '../Tooltip';

const labelFor = (proofType) => {
  if (!proofType) return 'Attestation';
  return proofType.replace(/_/g, ' ');
};

const statusColor = (status, verified) => {
  if (status === 'pending') return 'yellow';
  if (status === 'failed') return 'red';
  if (status === 'ready' && verified) return 'green';
  if (status === 'ready' && !verified) return 'red';
  return 'gray';
};

const textFor = (status, verified) => {
  if (status === 'pending') return 'Pending';
  if (status === 'failed') return 'Failed';
  if (status === 'ready' && verified) return 'Verified';
  if (status === 'ready' && !verified) return 'Not verified';
  return status || 'Unknown';
};

export default function AttestationBadge({ status, verified, proofType }) {
  const label = labelFor(proofType);
  const color = statusColor(status, verified);
  const text = textFor(status, verified);
  const tooltip = `${label}: ${text}`;

  return (
    <Tooltip text={tooltip}>
      <Badge color={color}>{text}</Badge>
    </Tooltip>
  );
}

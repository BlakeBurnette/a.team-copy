import React from 'react';
import HistoryList from '../../components/history/HistoryList';

export default function HistoryTab({ customerId, onSendProof }) {
  return (
    <HistoryList
      scope="customer"
      customerId={customerId}
      headers={{}}
      onSendProof={onSendProof}
    />
  );
}

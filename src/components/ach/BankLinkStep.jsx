import React, { useState } from 'react';
import { createSessionId } from '../../utils/achAuthorization';

const ui = {
  border: '#E5E7EB',
  accent: '#0E8A16',
  text: '#1F2937',
  subtle: '#6B7280',
};

export default function BankLinkStep({ onLinked, linkedBank, disabled }) {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');

  const handleMockLink = async () => {
    if (linking || disabled) return;
    setLinking(true);
    setError('');
    try {
      await new Promise((res) => setTimeout(res, 500));
      const token = `bank_tok_${createSessionId()}`;
      const bankDetails = {
        token,
        bankName: 'Mock Community Bank',
        accountType: 'checking',
        last4: '6789',
      };
      if (typeof onLinked === 'function') onLinked(bankDetails);
    } catch {
      setError('Unable to connect to the bank right now.');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: ui.border }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold" style={{ color: ui.text }}>Bank account</div>
          <div className="text-sm" style={{ color: ui.subtle }}>
            Securely connect your bank using our provider. We never see your account number.
          </div>
        </div>
        {linkedBank?.bankName ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#E7F7EC', color: ui.accent }}>
            Linked
          </span>
        ) : null}
      </div>

      {linkedBank?.bankName ? (
        <div className="rounded-lg border px-3 py-2 bg-gray-50" style={{ borderColor: ui.border }}>
          <div className="text-sm font-semibold" style={{ color: ui.text }}>{linkedBank.bankName}</div>
          <div className="text-xs" style={{ color: ui.subtle }}>
            {linkedBank.accountType || 'account'} •••• {linkedBank.last4 || '----'}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleMockLink}
          disabled={linking || disabled}
          className="px-4 py-2 rounded-lg text-white font-semibold shadow disabled:opacity-60"
          style={{ backgroundColor: ui.accent }}
        >
          {linkedBank?.bankName ? 'Reconnect bank' : 'Link bank account'}
        </button>
        <div className="text-xs" style={{ color: ui.subtle }}>
          Uses provider tokenization (no account numbers stored).
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

import React from 'react';

const ui = {
  border: '#E5E7EB',
  text: '#1F2937',
  subtle: '#6B7280',
  accent: '#0E8A16',
};

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="font-semibold" style={{ color: ui.text }}>{label}</span>
    <span style={{ color: ui.subtle }}>{value}</span>
  </div>
);

const renderAmountModel = (model = {}) => {
  const amountType = model.amountType || model.type || model.rule || 'variable';
  let amount = '';
  if (model.amount) amount = `$${Number(model.amount).toFixed(2)}`;
  else if (model.maxCap) amount = `Up to $${Number(model.maxCap).toFixed(2)}`;
  else if (model.variableRule) amount = model.variableRule;
  const frequency = model.frequency || model.schedule || 'one-time';
  const trigger = model.trigger || model.onDemandTrigger || '';
  return (
    <>
      <SummaryRow label="Amount type" value={amountType} />
      {amount ? <SummaryRow label="Amount" value={amount} /> : null}
      {model.maxCap ? <SummaryRow label="Max cap" value={`$${Number(model.maxCap).toFixed(2)}`} /> : null}
      {model.variableRule ? <SummaryRow label="Variable rule" value={model.variableRule} /> : null}
      <SummaryRow label="Frequency" value={frequency} />
      {trigger ? <SummaryRow label="Trigger" value={trigger} /> : null}
    </>
  );
};

export default function AchAuthorizationCard({
  termsId,
  termsHash,
  termsText,
  amountModel,
  revocationText,
  accepted,
  onAcceptChange,
  requireStandingAck,
  standingAccepted,
  onStandingAccept,
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4" style={{ borderColor: ui.border }}>
      <div>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold" style={{ color: ui.text }}>ACH Authorization</div>
          {termsId ? <span className="text-xs" style={{ color: ui.subtle }}>Terms v{termsId}</span> : null}
        </div>
        {termsHash ? <div className="text-xs" style={{ color: ui.subtle }}>Hash: {termsHash}</div> : null}
      </div>

      <div className="text-sm leading-relaxed" style={{ color: ui.text }}>
        {termsText
          ? <div dangerouslySetInnerHTML={{ __html: termsText }} />
          : <div>No authorization terms available.</div>}
      </div>

      {revocationText ? (
        <div className="text-sm rounded-lg bg-gray-50 border px-3 py-2" style={{ borderColor: ui.border, color: ui.subtle }}>
          {revocationText}
        </div>
      ) : null}

      <div className="rounded-lg border px-3 py-2 bg-gray-50" style={{ borderColor: ui.border }}>
        <div className="text-sm font-semibold mb-2" style={{ color: ui.text }}>Debit model</div>
        {renderAmountModel(amountModel)}
      </div>

      {/* Service Fee Disclosure - NACHA Compliant */}
      <div className="rounded-lg border px-3 py-2 bg-amber-50" style={{ borderColor: '#FCD34D' }}>
        <div className="text-sm font-semibold mb-1" style={{ color: ui.text }}>Service Fee Disclosure</div>
        <div className="text-sm" style={{ color: ui.text }}>
          A <strong>Service Fee of 1.99%</strong> (maximum $10.00) will be applied to each ACH transaction.
          This fee is charged by PayHive for payment processing services.
        </div>
      </div>

      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!accepted}
          onChange={(e) => onAcceptChange?.(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span className="text-sm" style={{ color: ui.text }}>
          I authorize debits as described above.
        </span>
      </label>

      {requireStandingAck ? (
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!standingAccepted}
            onChange={(e) => onStandingAccept?.(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm" style={{ color: ui.text }}>
            I understand this is a standing authorization for future charges.
          </span>
        </label>
      ) : null}

      <div className="text-xs" style={{ color: ui.subtle }}>
        Keep a copy of this authorization for your records. You may revoke using the method described above.
      </div>
    </div>
  );
}

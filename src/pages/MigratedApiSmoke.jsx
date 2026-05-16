import React, { useMemo, useState } from 'react';
import { useUserProfile } from '../context/AuthContext';
import {
  getAchTermsCurrent,
  getAuthorizations,
  getAuthorizationZk,
  getPayments,
  getAttestation,
  getDisputeExport,
} from '../api/ach';
import { createApproval, listApprovals, approveApproval, declineApproval } from '../api/approvals';
import { proposeScheduleChange, proposeAddOn } from '../api/staff';

function sanitizeData(val) {
  if (Array.isArray(val)) return val.map(sanitizeData);
  if (val && typeof val === 'object') {
    return Object.entries(val).reduce((acc, [k, v]) => {
      if (k === 'proofB64' || k === 'bankAccountToken') {
        acc[k] = '(redacted)';
        return acc;
      }
      acc[k] = sanitizeData(v);
      return acc;
    }, {});
  }
  return val;
}

function ResultBlock({ title, result }) {
  if (!result) return null;
  const payload = result.ok ? sanitizeData(result.data) : null;
  return (
    <div className="mt-2 p-3 border rounded bg-white">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-neutral-600">requestId: {result.requestId || '—'}</div>
      {result.ok ? (
        <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
      ) : (
        <div className="mt-2 text-sm text-red-600">
          {result.status}: {result.error?.message || result.error?.code}
        </div>
      )}
    </div>
  );
}

export default function MigratedApiSmoke() {
  const { hasRole } = useUserProfile() || {};
  const [terms, setTerms] = useState(null);
  const [authorizations, setAuthorizations] = useState(null);
  const [payments, setPayments] = useState(null);
  const [zkResult, setZkResult] = useState(null);
  const [attestationResult, setAttestationResult] = useState(null);
  const [disputeResult, setDisputeResult] = useState(null);
  const [approvals, setApprovals] = useState(null);
  const [createApprovalResult, setCreateApprovalResult] = useState(null);
  const [staffResult, setStaffResult] = useState(null);

  const [zkId, setZkId] = useState('');
  const [attestationEntityType, setAttestationEntityType] = useState('payment');
  const [attestationEntityId, setAttestationEntityId] = useState('');
  const [attestationProofType, setAttestationProofType] = useState('');
  const [disputePaymentId, setDisputePaymentId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [approvalForm, setApprovalForm] = useState({
    organizationId: '',
    customerId: '',
    requiredUserId: '',
    subjectType: '',
    subjectId: '',
    serviceRecordId: '',
    amountCents: '',
    currency: 'USD',
    summary: '',
  });
  const [passkeyToken, setPasskeyToken] = useState('');
  const [approveId, setApproveId] = useState('');
  const [declineId, setDeclineId] = useState('');
  const [scheduleChangeBody, setScheduleChangeBody] = useState({
    organizationId: '',
    scheduleRuleId: '',
    customerId: '',
    fromDate: '',
    toDate: '',
    timeWindow: '',
    reason: '',
  });
  const [addOnBody, setAddOnBody] = useState({
    invoiceId: '',
    description: '',
    amountCents: '',
    currency: 'USD',
  });

  const isAdmin = useMemo(() => (typeof hasRole === 'function' ? hasRole('admin') : false), [hasRole]);
  const isStaff = useMemo(
    () => (typeof hasRole === 'function' ? (hasRole('staff') || hasRole('admin') || hasRole('manager')) : false),
    [hasRole]
  );

  const run = async (fn, setter) => {
    const res = await fn();
    setter(res);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Migrated API Smoke</h1>

      <section className="space-y-2">
        <div className="font-semibold">Public</div>
        <button
          className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
          onClick={() => run(getAchTermsCurrent, setTerms)}
          type="button"
        >
          Fetch ACH Terms
        </button>
        <ResultBlock title="ACH Terms" result={terms} />
      </section>

      <section className="space-y-3">
        <div className="font-semibold">Authed</div>
        <div className="text-sm text-neutral-700">Using cookie session</div>
        <div className="flex gap-2 flex-wrap">
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
            onClick={() => run(() => getAuthorizations({}), setAuthorizations)}
            type="button"
          >
            List Authorizations
          </button>
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
            onClick={() => run(() => getPayments({}), setPayments)}
            type="button"
          >
            List Payments
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            Authorization ID (for /zk)
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={zkId}
              onChange={(e) => setZkId(e.target.value)}
            />
          </label>
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
            onClick={() => zkId && isAdmin && run(() => getAuthorizationZk({ id: zkId }), setZkResult)}
            disabled={!zkId || !isAdmin}
            type="button"
          >
            Fetch ZK (admin only)
          </button>
          <ResultBlock title="Authorization ZK" result={zkResult} />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="block text-sm">
              Entity Type
              <input
                className="mt-1 w-full border rounded px-2 py-1"
                value={attestationEntityType}
                onChange={(e) => setAttestationEntityType(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Entity ID
              <input
                className="mt-1 w-full border rounded px-2 py-1"
                value={attestationEntityId}
                onChange={(e) => setAttestationEntityId(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Proof Type
              <input
                className="mt-1 w-full border rounded px-2 py-1"
                value={attestationProofType}
                onChange={(e) => setAttestationProofType(e.target.value)}
              />
            </label>
          </div>
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
            onClick={() =>
              attestationEntityType &&
              attestationEntityId &&
              attestationProofType &&
              run(
                () => {
                  if (attestationEntityType === 'authorization' && !isAdmin) {
                    return { ok: false, status: 403, error: { code: 'forbidden', message: 'Admin only' }, requestId: null };
                  }
                  return getAttestation({
                    entityType: attestationEntityType,
                    entityId: attestationEntityId,
                    proofType: attestationProofType,
                  });
                },
                setAttestationResult
              )
            }
            disabled={!attestationEntityType || !attestationEntityId || !attestationProofType}
            type="button"
          >
            Fetch Attestation
          </button>
          <ResultBlock title="Attestation" result={attestationResult} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm">
            Payment ID (dispute export, admin)
            <input
              className="mt-1 w-full border rounded px-2 py-1"
              value={disputePaymentId}
              onChange={(e) => setDisputePaymentId(e.target.value)}
            />
          </label>
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
            onClick={() => disputePaymentId && run(() => getDisputeExport({ paymentId: disputePaymentId }), setDisputeResult)}
            disabled={!disputePaymentId || !isAdmin}
            type="button"
          >
            Fetch Dispute Export (admin)
          </button>
          <ResultBlock title="Dispute Export" result={disputeResult} />
        </div>

        <ResultBlock title="Authorizations" result={authorizations} />
        <ResultBlock title="Payments" result={payments} />
      </section>

      <section className="space-y-3">
        <div className="font-semibold">Approvals</div>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="block text-sm">
            Status
            <select
              className="mt-1 border rounded px-2 py-1"
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="declined">declined</option>
            </select>
          </label>
          <button
            className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
            type="button"
            onClick={() => run(() => listApprovals({ status: approvalStatus }), setApprovals)}
          >
            List Approvals
          </button>
        </div>
        <ResultBlock title="Approvals" result={approvals} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2 border rounded p-3 bg-white">
            <div className="font-semibold text-sm">Create Approval</div>
            {Object.keys(approvalForm).map((k) => (
              <label key={k} className="block text-sm">
                {k}
                <input
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={approvalForm[k]}
                  onChange={(e) => setApprovalForm((prev) => ({ ...prev, [k]: e.target.value }))}
                />
              </label>
            ))}
            <button
              className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
              type="button"
              onClick={() => run(() => createApproval({ body: approvalForm }), setCreateApprovalResult)}
            >
              Submit Approval
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2 border rounded p-3 bg-white">
              <div className="font-semibold text-sm">Approve</div>
              <label className="block text-sm">
                Approval ID
                <input
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={approveId}
                  onChange={(e) => setApproveId(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                x-passkey-token
                <input
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={passkeyToken}
                  onChange={(e) => setPasskeyToken(e.target.value)}
                />
              </label>
              <button
                className="px-3 py-2 border rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
                type="button"
                onClick={() => approveId && run(() => approveApproval({ id: approveId, passkeyToken, body: {} }), setCreateApprovalResult)}
                disabled={!approveId}
              >
                Approve
              </button>
            </div>

            <div className="space-y-2 border rounded p-3 bg-white">
              <div className="font-semibold text-sm">Decline</div>
              <label className="block text-sm">
                Approval ID
                <input
                  className="mt-1 w-full border rounded px-2 py-1"
                  value={declineId}
                  onChange={(e) => setDeclineId(e.target.value)}
                />
              </label>
              <button
                className="px-3 py-2 border rounded bg-white hover:bg-neutral-50 disabled:opacity-50"
                type="button"
                onClick={() => declineId && run(() => declineApproval({ id: declineId, body: {} }), setCreateApprovalResult)}
                disabled={!declineId}
              >
                Decline
              </button>
            </div>
          </div>
        </div>

        <ResultBlock title="Approval Mutation Result" result={createApprovalResult} />
      </section>

      {isStaff && (
        <section className="space-y-3">
          <div className="font-semibold">Staff surfaces</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 border rounded p-3 bg-white">
              <div className="font-semibold text-sm">Propose Schedule Change</div>
              {Object.keys(scheduleChangeBody).map((k) => (
                <label key={k} className="block text-sm">
                  {k}
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={scheduleChangeBody[k]}
                    onChange={(e) => setScheduleChangeBody((prev) => ({ ...prev, [k]: e.target.value }))}
                  />
                </label>
              ))}
              <button
                className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
                type="button"
            onClick={() => run(() => proposeScheduleChange({ body: scheduleChangeBody }), setStaffResult)}
              >
                Propose Change
              </button>
            </div>

            <div className="space-y-2 border rounded p-3 bg-white">
              <div className="font-semibold text-sm">Propose Add-on</div>
              {Object.keys(addOnBody).map((k) => (
                <label key={k} className="block text-sm">
                  {k}
                  <input
                    className="mt-1 w-full border rounded px-2 py-1"
                    value={addOnBody[k]}
                    onChange={(e) => setAddOnBody((prev) => ({ ...prev, [k]: e.target.value }))}
                  />
                </label>
              ))}
              <button
                className="px-3 py-2 border rounded bg-white hover:bg-neutral-50"
                type="button"
            onClick={() => run(() => proposeAddOn({ body: addOnBody }), setStaffResult)}
              >
                Propose Add-on
              </button>
            </div>
          </div>
          <ResultBlock title="Staff Action" result={staffResult} />
        </section>
      )}
    </div>
  );
}

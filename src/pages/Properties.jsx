import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useUserProfile } from '../context/AuthContext';
import {
  fetchMyProperties,
  fetchClaimableProperties,
  claimProperty,
  verifyPropertyMembership,
} from '../api/properties';
import Toast from '../components/Toast';
import { MapPin, CheckCircle2, Info } from 'lucide-react';

const friendlyError = (e) => e?.response?.data?.error || e?.message || 'Unable to load properties';
const ENABLE_VERIFY_UI = import.meta.env.VITE_ENABLE_PROPERTY_VERIFY_UI === 'true';

const statusMeta = (status) => {
  const s = (status || '').toString().toLowerCase();
  if (s === 'active' || s === 'approved') return { label: 'Active', cls: 'bg-green-100 text-green-800 border-green-200' };
  if (s === 'revoked' || s === 'disabled') return { label: 'Revoked', cls: 'bg-red-100 text-red-800 border-red-200' };
  return { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border-amber-200' };
};

const roleLabel = (role) => {
  const r = (role || '').toString().toLowerCase();
  if (r === 'owner') return 'Owner';
  if (r === 'manager') return 'Manager';
  if (r === 'resident') return 'Resident';
  if (r === 'tenant') return 'Tenant';
  if (r === 'viewer' || r === 'guest') return 'Viewer';
  return role || 'Member';
};

export default function Properties() {
  const { hasRole, profile } = useUserProfile() || {};
  const role = (profile?.role || '').toLowerCase();
  const canClaimProperty = role === 'user';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [memberships, setMemberships] = useState([]);
  const prevMembershipsRef = useRef([]);
  const [claimableProperties, setClaimableProperties] = useState([]);
  const [claimableLoading, setClaimableLoading] = useState(true);
  const [claiming, setClaiming] = useState(null); // property_id being claimed
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });

  const [verifyPayload, setVerifyPayload] = useState({
    propertyId: '',
    userId: '',
    role: 'viewer',
    method: 'manual',
  });
  const [verifying, setVerifying] = useState(false);

  const canVerify =
    ENABLE_VERIFY_UI &&
    (typeof hasRole === 'function' &&
      (hasRole('admin') || hasRole('owner') || hasRole('manager')));

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyProperties();
      const newMemberships = Array.isArray(data?.memberships) ? data.memberships : [];

      // Check for newly auto-verified properties
      const prevMemberships = prevMembershipsRef.current;
      newMemberships.forEach((newM) => {
        const prevM = prevMemberships.find((p) => p.propertyId === newM.propertyId);
        if (prevM && prevM.membershipStatus === 'pending' && newM.membershipStatus === 'active') {
          const isAutoVerified = newM.verificationMethod === 'service_payment_auto' ||
                                 newM.verificationMethod === 'service_completion_auto' ||
                                 newM.verification_method === 'service_payment_auto' ||
                                 newM.verification_method === 'service_completion_auto';
          if (isAutoVerified) {
            showToast('Your property membership has been automatically approved!', 4000);
          }
        }
      });

      prevMembershipsRef.current = newMemberships;
      setMemberships(newMemberships);
    } catch (e) {
      setError(friendlyError(e));
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClaimable = async () => {
    if (!canClaimProperty) return;
    setClaimableLoading(true);
    try {
      const claimable = await fetchClaimableProperties();
      setClaimableProperties(claimable);
    } catch (e) {
      console.error('[Properties] Failed to load claimable:', e);
      setClaimableProperties([]);
    } finally {
      setClaimableLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadClaimable();

    // Poll for updates every 30 seconds to catch auto-verifications from payments
    const interval = setInterval(() => {
      load();
      loadClaimable();
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canClaimProperty]);

  const hasProperties = useMemo(() => memberships.length > 0, [memberships]);

  const onClaimProperty = async (propertyId) => {
    if (claiming) return;
    setClaiming(propertyId);
    setError('');
    try {
      const result = await claimProperty({ property_id: propertyId });

      showToast('Property claimed successfully!', 3000);

      // Refresh both lists
      await Promise.all([load(), loadClaimable()]);
    } catch (err) {
      const errorCode = err?.response?.data?.error;
      if (errorCode === 'NO_COMPLETED_SERVICE') {
        setError('You can only claim properties where you have received a completed service.');
      } else if (errorCode === 'MEMBERSHIP_EXISTS') {
        setError('You already have a membership for this property.');
        await Promise.all([load(), loadClaimable()]);
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setClaiming(null);
    }
  };

  const onVerify = async (e) => {
    e.preventDefault();
    if (verifying) return;
    const { propertyId, userId, role, method } = verifyPayload;
    if (!propertyId || !userId) return;
    setVerifying(true);
    setError('');
    try {
      await verifyPropertyMembership(propertyId, { userId, role, method });
      showToast('Membership verified');
      await load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Properties</h1>
          <p className="text-sm text-neutral-600">Your property memberships and claims.</p>
          <p className="text-xs text-neutral-500">
            Access to edit property details depends on verification and role.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        <div className="border rounded-xl bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-neutral-900">Properties</div>
          </div>
          {loading ? (
            <div className="text-sm text-neutral-600">Loading properties...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : !hasProperties ? (
            <div className="text-sm text-neutral-700">No properties yet.</div>
          ) : (
            <div className="space-y-3">
              {memberships.map((p) => {
                const id = p.propertyId || p.id || p.slug || p.displayAddress;
                const addr = p.displayAddress || 'Unknown address';
                const statusInfo = statusMeta(p.membershipStatus);
                const role = roleLabel(p.membershipRole);
                const isPending = statusInfo.label === 'Pending';
                const isAutoVerified = p.verificationMethod === 'service_payment_auto' ||
                                      p.verificationMethod === 'service_completion_auto' ||
                                      p.verification_method === 'service_payment_auto' ||
                                      p.verification_method === 'service_completion_auto';
                const verifiedAt = p.verifiedAt || p.verified_at;

                return (
                  <div
                    key={id}
                    className="border rounded-lg p-3 bg-neutral-50 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-neutral-900">{addr}</div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${statusInfo.cls}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-700">Role: {role}</div>
                    {isPending ? (
                      <div className="text-xs text-neutral-600">Awaiting verification.</div>
                    ) : null}
                    {isAutoVerified && verifiedAt ? (
                      <div className="flex items-center gap-1 text-xs text-green-700">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Auto-verified via service payment
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
          {canClaimProperty ? (
            <div className="border rounded-xl bg-white p-4 space-y-3">
              <div className="text-lg font-semibold text-neutral-900">Claim a property</div>

              {claimableLoading ? (
                <p className="text-sm text-neutral-600">Loading available properties...</p>
              ) : claimableProperties.length > 0 ? (
                <>
                  <p className="text-sm text-neutral-600">
                    These properties are available to claim based on services you've received.
                  </p>
                  <div className="space-y-2">
                    {claimableProperties.map((prop) => (
                      <div
                        key={prop.propertyId || prop.property_id}
                        className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900 truncate">
                              {prop.displayAddress || prop.address}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {prop.serviceCount} completed service{prop.serviceCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onClaimProperty(prop.propertyId || prop.property_id)}
                          disabled={claiming === (prop.propertyId || prop.property_id)}
                          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                        >
                          {claiming === (prop.propertyId || prop.property_id) ? (
                            'Claiming...'
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Claim
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <Info className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-700 font-medium">No properties available to claim</p>
                    <p className="text-sm text-neutral-600 mt-1">
                      You can only claim properties where you have received a completed service.
                      Once a service is completed at your property, it will appear here for you to claim.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

        {canVerify ? (
            <div className="border rounded-xl bg-white p-4 space-y-3">
              <div className="text-lg font-semibold text-neutral-900">Verify membership</div>
              <form className="space-y-3" onSubmit={onVerify}>
                <div className="space-y-1">
                  <label className="block text-sm text-neutral-700">Property ID</label>
                  <input
                    type="text"
                    value={verifyPayload.propertyId}
                    onChange={(e) =>
                      setVerifyPayload((v) => ({ ...v, propertyId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-neutral-700">User ID</label>
                  <input
                    type="text"
                    value={verifyPayload.userId}
                    onChange={(e) =>
                      setVerifyPayload((v) => ({ ...v, userId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-neutral-700">Role</label>
                  <select
                    value={verifyPayload.role}
                    onChange={(e) =>
                      setVerifyPayload((v) => ({ ...v, role: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="resident">Resident</option>
                    <option value="tenant">Tenant</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm text-neutral-700">Verification method</label>
                  <input
                    type="text"
                    value={verifyPayload.method}
                    onChange={(e) =>
                      setVerifyPayload((v) => ({ ...v, method: e.target.value }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    verifying ||
                    !verifyPayload.propertyId ||
                    !verifyPayload.userId
                  }
                  className="w-full inline-flex justify-center items-center px-3 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60"
                >
                  {verifying ? 'Verifying…' : 'Verify membership'}
                </button>
              </form>
            </div>
          ) : null}
      </div>
    </div>
  );
}

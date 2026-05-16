import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowLeft, CheckCircle2, Circle, Loader2, MapPin, Users } from 'lucide-react';
import TrustObjectViewer from '../components/trust/TrustObjectViewer';
import HistoryList from '../components/history/HistoryList';
import SendProofModal from '../components/SendProofModal';

const fmtMoney = (cents, currency = 'USD') => {
  if (typeof cents !== 'number') return '';
  const n = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const ymd = (d) => (d ? String(d).slice(0, 10) : '');
const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

const PaymentPill = ({ status }) => {
  const s = String(status || '').toLowerCase();
  const base =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border';
  if (s === 'paid' || s === 'succeeded')
    return <span className={`${base} bg-green-50 text-green-800 border-green-200`}>Paid</span>;
  if (s === 'processing' || s === 'pending')
    return <span className={`${base} bg-blue-50 text-blue-900 border-blue-200`}>Processing</span>;
  if (s === 'failed')
    return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Failed</span>;
  if (s === 'void' || s === 'refunded')
    return <span className={`${base} bg-neutral-100 text-neutral-700 border-neutral-200`}>{s || 'Void'}</span>;
  return <span className={`${base} bg-amber-50 text-amber-900 border-amber-200`}>Unpaid</span>;
};

export default function ServiceRecordShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const headers = useMemo(() => ({}), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serviceRecord, setServiceRecord] = useState(null);
  const [sendProofOpen, setSendProofOpen] = useState(false);

  const [trustObject, setTrustObject] = useState(null);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustError, setTrustError] = useState('');

  // Load service record base info
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await axios.get(`/api/service-records/${id}`, {
          withCredentials: true,
        });
        const data = resp?.data || null;
        if (alive) {
          setServiceRecord(data?.service_record || data || null);
        }
      } catch (e) {
        if (alive) setError(e?.response?.data?.error || e?.message || 'Failed to load service record');
        if (alive) setServiceRecord(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // Load trust object
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!id) return;
      if (alive) {
        setTrustLoading(true);
        setTrustError('');
      }
      try {
        const resp = await fetch(`/api/trust/service-records/${id}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`Failed to load trust object (${resp.status})`);
        const data = await resp.json();
        if (alive) setTrustObject(data || null);
      } catch (e) {
        if (alive) {
          setTrustObject(null);
          setTrustError(e?.message || 'Failed to load proof of service');
        }
      } finally {
        if (alive) setTrustLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [id]);

  const currency = serviceRecord?.currency || 'USD';
  const total = fmtMoney(serviceRecord?.total_cents, currency);
  const balance = fmtMoney(serviceRecord?.balance_cents, currency);
  const payStatus = serviceRecord?.payment_state || serviceRecord?.invoice_status || null;
  const checklists = Array.isArray(serviceRecord?.checklists) ? serviceRecord.checklists : [];
  const crewList = useMemo(() => {
    if (Array.isArray(serviceRecord?.crew_ids)) return serviceRecord.crew_ids.join(', ');
    if (Array.isArray(serviceRecord?.crew)) return serviceRecord.crew.map((c) => c.name || c.id).join(', ');
    return '';
  }, [serviceRecord?.crew_ids, serviceRecord?.crew]);
  const customerContact = useMemo(
    () => ({
      name: serviceRecord?.customer?.name || '',
      email: serviceRecord?.customer?.email || '',
      phone: serviceRecord?.customer?.phone_number || serviceRecord?.customer?.phone || '',
    }),
    [serviceRecord?.customer?.email, serviceRecord?.customer?.name, serviceRecord?.customer?.phone, serviceRecord?.customer?.phone_number]
  );

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 md:p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading service record…
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : !serviceRecord ? (
          <div className="text-neutral-500">Service record not found.</div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-semibold">Service Record #{serviceRecord.id || id}</h1>
                <div className="text-sm text-neutral-600">
                  {ymd(serviceRecord.scheduled_at || serviceRecord.completed_at || serviceRecord.started_at)}
                </div>
                {serviceRecord.status && (
                  <div className="text-xs text-neutral-500">Status: {serviceRecord.status}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <PaymentPill status={payStatus} />
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Total</div>
                  <div className="text-lg font-semibold">{total}</div>
                  <div className="text-xs text-neutral-500">Balance: {balance}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">Details</div>
                <div className="text-sm text-neutral-700">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neutral-500" />
                    <span>
                      {serviceRecord.property?.normalized_address ||
                        serviceRecord.property_label ||
                        serviceRecord.address ||
                        'No property recorded'}
                    </span>
                  </div>
                  {serviceRecord.notes && (
                    <div className="mt-2 text-neutral-700">
                      <div className="text-xs text-neutral-500">Notes</div>
                      <div className="text-sm">{serviceRecord.notes}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-sm font-semibold mb-2">Crew</div>
                <div className="flex items-center gap-2 text-sm text-neutral-700">
                  <Users className="w-4 h-4 text-neutral-500" />
                  <span>{crewList || 'Not assigned'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {serviceRecord.invoice_id && (
                <Link
                  to={`/app/invoices/${serviceRecord.invoice_id}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                >
                  View Invoice #{serviceRecord.invoice_id}
                </Link>
              )}
              {serviceRecord?.id ? (
                <button
                  type="button"
                  onClick={() => setSendProofOpen(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                >
                  Send proof
                </button>
              ) : null}
            </div>

            <div className="mt-8 border-t pt-4">
              <h2 className="text-sm font-semibold text-neutral-700 mb-2">Proof of service</h2>
              {trustLoading && (
                <div className="text-sm text-neutral-500">Loading proof of service...</div>
              )}
              {trustError && <div className="text-sm text-red-600">{trustError}</div>}
              {!trustLoading && !trustError && !trustObject && (
                <div className="text-sm text-neutral-500">No proof of service available.</div>
              )}
      {trustObject && <TrustObjectViewer trustObject={trustObject} />}
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-neutral-700 mb-2">Checklists</h2>
              {checklists.length === 0 ? (
                <div className="text-sm text-neutral-500">No checklist for this job.</div>
              ) : (
                <div className="space-y-3">
                  {checklists.map((cl) => {
                    const requiredLabel = cl.is_required ? 'Required checklist' : 'Optional checklist';
                    const completedBy = cl.completed_by_user?.name || cl.completed_by_user?.id || '';
                    return (
                      <div key={cl.id} className="border rounded-lg p-3 bg-white space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-neutral-800">{cl.title || cl.name || 'Checklist'}</div>
                            <div className="text-xs text-neutral-600">{requiredLabel}</div>
                            {cl.completed_at && (
                              <div className="text-xs text-neutral-600">
                                Completed at {fmtDateTime(cl.completed_at)}
                                {completedBy ? ` by ${completedBy}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600">
                            {cl.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">Not completed</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          {(cl.items || []).map((it) => (
                            <div key={it.id} className="flex items-start gap-2 text-sm text-neutral-800">
                              {it.checked ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-neutral-400 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span>{it.label}</span>
                                  {it.required && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {it.note ? (
                                  <div className="text-xs text-neutral-600 mt-0.5">{it.note}</div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <details className="mt-6 border rounded-lg bg-white">
              <summary className="px-4 py-3 text-sm font-semibold text-neutral-800 cursor-pointer">
                Verification details <span className="text-neutral-500 font-normal">· Trust history for this service record</span>
              </summary>
              <div className="p-4 space-y-3">
                {serviceRecord?.hash_hex && (
                  <div className="text-sm text-neutral-700">
                    Hash: <span className="font-mono">{String(serviceRecord.hash_hex).slice(0, 16)}…</span>
                  </div>
                )}
                <div className="text-xs text-neutral-600">View history events related to this record.</div>
                <HistoryList scope="service_record" serviceRecordId={serviceRecord?.id} headers={headers} />
              </div>
            </details>
          </>
        )}
      </div>
    </div>

      <SendProofModal
        isOpen={sendProofOpen}
        onClose={() => setSendProofOpen(false)}
        serviceRecordId={serviceRecord?.id || id}
        headers={headers}
        customerContact={customerContact}
      />
    </>
  );
}

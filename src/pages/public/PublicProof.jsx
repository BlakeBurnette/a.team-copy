import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Copy, ExternalLink, Image as ImageIcon, Loader2, ShieldCheck, X } from 'lucide-react';
import { fetchPublicProof } from '../../api/publicProof';
import Toast from '../../components/Toast';
import { PaymentStatePill } from '../schedule/components/PaymentPills';
import { fetchPaymentResolution } from '../../api/paymentResolution';
import PaymentResolutionBanner from '../../components/PaymentResolutionBanner';
import PaymentStatusPill from '../../components/PaymentStatusPill';

const fmtDate = (d) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(d);
  }
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <div className="text-neutral-600">{label}</div>
      <div className="font-medium text-neutral-900 text-right">{value}</div>
    </div>
  );
}

export default function PublicProof() {
  const { serviceRecordId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proof, setProof] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });
  const [activeMedia, setActiveMedia] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  useEffect(() => {
    let alive = true;
    if (!token) {
      setError('This proof link is invalid or missing a token.');
      setLoading(false);
      return () => {};
    }

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPublicProof(serviceRecordId, token);
        if (!alive) return;
        setProof(data);
        try {
          setResolutionLoading(true);
          const res = await fetchPaymentResolution(serviceRecordId, { token });
          setResolution(res?.resolution || null);
        } catch {
          setResolution(null);
        } finally {
          setResolutionLoading(false);
        }
      } catch (e) {
        if (!alive) return;
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          setError('This proof link is invalid or has expired.');
        } else if (status === 404) {
          setError('Service record not found.');
        } else {
          setError(e?.response?.data?.error || e?.message || 'Unable to load proof. Please try again.');
        }
        setProof(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [serviceRecordId, token]);

  const organization = useMemo(
    () => proof?.organization || proof?.org || {},
    [proof?.org, proof?.organization]
  );
  const serviceRecord = useMemo(
    () => proof?.service_record || proof?.serviceRecord || proof?.record || {},
    [proof?.record, proof?.serviceRecord, proof?.service_record]
  );
  const property = useMemo(
    () => proof?.property || serviceRecord?.property || {},
    [proof?.property, serviceRecord?.property]
  );
  const customer = useMemo(
    () => proof?.customer || serviceRecord?.customer || {},
    [proof?.customer, serviceRecord?.customer]
  );
  const payment = useMemo(
    () => proof?.payment || serviceRecord?.payment || {},
    [proof?.payment, serviceRecord?.payment]
  );
  const media = useMemo(() => {
    if (Array.isArray(proof?.media)) return proof.media;
    if (Array.isArray(serviceRecord?.media)) return serviceRecord.media;
    if (Array.isArray(serviceRecord?.attachments)) return serviceRecord.attachments;
    return [];
  }, [proof?.media, serviceRecord?.attachments, serviceRecord?.media]);
  const historyEvents = useMemo(() => {
    if (Array.isArray(proof?.history_events)) return proof.history_events;
    if (Array.isArray(proof?.history)) return proof.history;
    if (Array.isArray(proof?.events)) return proof.events;
    return [];
  }, [proof?.events, proof?.history, proof?.history_events]);

  const serviceName =
    serviceRecord?.service_name ||
    serviceRecord?.service?.name ||
    serviceRecord?.job_name ||
    serviceRecord?.title ||
    'Service';

  const address =
    property?.normalized_address ||
    property?.address ||
    property?.raw_address_input ||
    serviceRecord?.property_address ||
    '';

  const status = serviceRecord?.status || serviceRecord?.state || serviceRecord?.service_status;
  const completedAt = serviceRecord?.completed_at || serviceRecord?.performed_at || serviceRecord?.timestamp;

  const notes = proof?.notes || serviceRecord?.notes || '';
  const checklist = Array.isArray(proof?.checklist)
    ? proof.checklist
    : Array.isArray(serviceRecord?.checklist)
      ? serviceRecord.checklist
      : [];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Unable to copy link', 2600);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-4 py-3 flex items-center gap-2 text-neutral-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading proof…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border rounded-xl shadow-sm p-6 space-y-2">
          <div className="text-lg font-semibold text-neutral-900">Proof unavailable</div>
          <div className="text-sm text-neutral-700">{error}</div>
          <div className="text-sm text-neutral-500">
            If you believe this is a mistake, contact your service provider for a new link.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
        <PaymentResolutionBanner
          resolutionStatus={resolution?.resolution_status || resolution?.status || resolution?.state}
          resolutionCode={resolution?.resolution_code || resolution?.code}
          serviceRecordId={serviceRecordId}
          token={token}
        />

        <div className="bg-white border rounded-2xl shadow-sm p-5 md:p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Proof of Service
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold text-neutral-900">
                  {organization?.public_name || organization?.name || 'Service provider'}
                </div>
                <div className="text-sm text-neutral-600">
                  Service record #{serviceRecord?.id || serviceRecordId}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {status}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
                >
                  <Copy className="w-4 h-4" /> Copy link
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border bg-white text-sm text-neutral-500 cursor-not-allowed"
                  title="Download coming soon"
                  disabled
                >
                  <ExternalLink className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-neutral-500">Service summary</div>
                  <div className="text-lg font-semibold text-neutral-900">{serviceName}</div>
                </div>
                <div className="flex items-center gap-2">
                  {payment ? (
                    <PaymentStatePill invStatus={payment?.status || payment?.state} pending={false} />
                  ) : null}
                  {resolution ? (
                    <PaymentStatusPill
                      resolutionStatus={resolution?.resolution_status || resolution?.status || resolution?.state}
                      resolutionCode={resolution?.resolution_code || resolution?.code}
                    />
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <InfoRow label="Status" value={status} />
                <InfoRow label="Completed" value={fmtDate(completedAt)} />
                <InfoRow label="Property" value={address} />
                <InfoRow label="Customer" value={customer?.name || customer?.full_name || ''} />
                <InfoRow label="Email" value={customer?.email} />
                <InfoRow label="Phone" value={customer?.phone_number || customer?.phone} />
              </div>
            </div>

            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <ImageIcon className="w-4 h-4 text-neutral-500" />
                Service media
              </div>
              {media.length === 0 ? (
                <div className="text-sm text-neutral-600">No media was attached to this service.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {media.map((m, idx) => (
                    <button
                      type="button"
                      key={m.id || m.url || idx}
                      onClick={() => setActiveMedia(m)}
                      className="relative group border rounded-xl overflow-hidden bg-neutral-100 aspect-video"
                    >
                      {m.url || m.preview_url ? (
                        <img
                          src={m.preview_url || m.url}
                          alt={m.alt || m.caption || 'Service media'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                          Attachment
                        </div>
                      )}
                      {m.caption ? (
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1">
                          {m.caption}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(notes || checklist.length > 0) && (
              <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
                <div className="text-sm font-semibold text-neutral-900">Notes & Checklist</div>
                {notes ? <div className="text-sm text-neutral-700 whitespace-pre-line">{notes}</div> : null}
                {checklist.length > 0 ? (
                  <ul className="space-y-2">
                    {checklist.map((item, idx) => {
                      const label = typeof item === 'string' ? item : item?.label || item?.text;
                      return (
                        <li key={idx} className="flex items-start gap-2 text-sm text-neutral-800">
                          <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{label || 'Checklist item'}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            )}

            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                History
              </div>
              {historyEvents.length === 0 ? (
                <div className="text-sm text-neutral-600">No recent events.</div>
              ) : (
                <ul className="space-y-2">
                  {historyEvents.slice(0, 6).map((ev, idx) => (
                    <li key={ev.id || idx} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                      <div className="flex-1 space-y-0.5">
                        <div className="font-medium text-neutral-900">
                          {ev.title || ev.event || ev.name || 'Event'}
                        </div>
                        <div className="text-neutral-700">{ev.description || ev.note || ev.details || ''}</div>
                        <div className="text-xs text-neutral-500">{fmtDate(ev.created_at || ev.timestamp)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
              <div className="text-sm font-semibold text-neutral-900">Provider</div>
              <InfoRow label="Organization" value={organization?.public_name || organization?.name} />
              <InfoRow label="Contact" value={organization?.contact_email || organization?.email} />
              <InfoRow label="Phone" value={organization?.phone_number || organization?.phone} />
            </div>

            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-3">
              <div className="text-sm font-semibold text-neutral-900">Payment summary</div>
              <div className="flex items-center gap-2">
                <PaymentStatusPill
                  resolutionStatus={
                    resolution?.resolution_status || resolution?.status || resolution?.state || payment?.status
                  }
                  resolutionCode={resolution?.resolution_code || resolution?.code || payment?.code}
                />
                <span className="text-sm text-neutral-700">
                  {payment?.status || payment?.state || resolution?.resolution_status || resolution?.status || '—'}
                </span>
              </div>
              <InfoRow label="Amount" value={payment?.amount_formatted || payment?.amount || payment?.total} />
              <InfoRow label="Paid at" value={fmtDate(payment?.paid_at)} />
              <InfoRow label="Balance" value={payment?.balance_due || payment?.balance} />
            </div>
          </div>
        </div>
      </div>

      {activeMedia ? (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setActiveMedia(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full">
            {activeMedia.url || activeMedia.preview_url ? (
              <img
                src={activeMedia.url || activeMedia.preview_url}
                alt={activeMedia.alt || activeMedia.caption || 'Service media'}
                className="w-full h-full object-contain max-h-[80vh]"
              />
            ) : (
              <div className="p-8 text-center text-neutral-600">Attachment preview unavailable</div>
            )}
            {activeMedia.caption ? (
              <div className="p-3 text-sm text-neutral-700 border-t">{activeMedia.caption}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

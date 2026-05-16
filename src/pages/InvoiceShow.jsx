// src/pages/InvoiceShow.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { ArrowLeft, Link2, Loader2, Repeat, Trash2, Plus } from 'lucide-react';
import Toast from '../components/Toast';
import InvoicePhotoModal from '../components/InvoicePhotoModal';
import TrustObjectViewer from '../components/trust/TrustObjectViewer';

const LOUD = true;

const log = (...a) =>
  console.log(
    '%c[INVOICE:SHOW][LOUD]',
    'background:#111;color:#fff;padding:2px 4px;border-radius:3px',
    ...a
  );
const warn = (...a) =>
  console.warn(
    '%c[INVOICE:SHOW][LOUD][WARN]',
    'background:#b45309;color:#fff;padding:2px 4px;border-radius:3px',
    ...a
  );

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-100 text-neutral-700',
    paid: 'bg-green-100 text-green-700',
    draft: 'bg-amber-100 text-amber-700',
    scheduled: 'bg-blue-100 text-blue-700',
    processing: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    refunded: 'bg-amber-100 text-amber-700',
    void: 'bg-neutral-200 text-neutral-600',
    open: 'bg-neutral-100 text-neutral-700',
    sent: 'bg-neutral-100 text-neutral-700',
    info: 'bg-blue-50 text-blue-800',
    subtle: 'bg-neutral-100 text-neutral-700',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        tones[tone] || tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

const fmtMoney = (cents, currency = 'USD') => {
  const n = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
};

const ymd = (d) => (d ? String(d).slice(0, 10) : '');

const hm = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

/** Label helper (same as list) */
const labelFor = (pattern, interval) => {
  const p = String(pattern || '').toLowerCase();
  const n = Number(interval || 1);
  if (!p || p === 'once') return 'One-off';
  if (p === 'weekly') return 'Weekly';
  if (p === 'every_x_weeks') return `Every ${n} week${n === 1 ? '' : 's'}`;
  if (p === 'monthly') return 'Monthly';
  if (p === 'every_x_months') return `Every ${n} month${n === 1 ? '' : 's'}`;
  if (p === 'every_6_months') return 'Every 6 months';
  return 'Recurring';
};

/** Same precedence as list; loud logs each decision. */
const recurrenceInfoFrom = (invoice = {}) => {
  const p = invoice.recurrence_pattern;
  if (p != null) {
    const isRecurring = String(p).toLowerCase() !== 'once';
    const label = invoice.recurrence_label || labelFor(p, invoice.recurrence_interval);
    if (LOUD)
      log('recurrence via PATTERN', {
        id: invoice.id,
        pattern: p,
        interval: invoice.recurrence_interval,
        isRecurring,
        label,
      });
    return { isRecurring, label, via: 'pattern' };
  }
  if (invoice.is_recurring === true) {
    const label = invoice.recurrence_label || 'Recurring';
    if (LOUD)
      log('recurrence via IS_RECURRING', {
        id: invoice.id,
        is_recurring: invoice.is_recurring,
        label,
      });
    return { isRecurring: true, label, via: 'is_recurring' };
  }
  if (invoice.schedule_rule_id) {
    const label = invoice.recurrence_label || 'Recurring';
    if (LOUD)
      log('recurrence via RULE_ID', {
        id: invoice.id,
        schedule_rule_id: invoice.schedule_rule_id,
        label,
      });
    return { isRecurring: true, label, via: 'schedule_rule_id' };
  }
  const bySource = String(invoice.source || '').toLowerCase() === 'recurring';
  const label = invoice.recurrence_label || (bySource ? 'Recurring' : 'One-off');
  if (LOUD)
    log('recurrence via SOURCE', {
      id: invoice.id,
      source: invoice.source,
      isRecurring: bySource,
      label,
    });
  return { isRecurring: bySource, label, via: 'source' };
};

export default function InvoiceShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  const [dataLoading, setDataLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [org, setOrg] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [caps, setCaps] = useState({
    can_edit_due_date: false,
    can_mark_paid: false,
    can_send: false,
    can_manage_photos: false,
  });
  const [trustObject, setTrustObject] = useState(null);
  const [trustLoading, setTrustLoading] = useState(false);
  const [trustError, setTrustError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', duration: 2500 });
  const showToast = (m, d = 2500) => setToast({ show: true, message: m, duration: d });

  const [linking, setLinking] = useState(false);

  // SSE
  const sseRef = useRef(null);

  // For forcing a re-fetch (e.g., after photo upload/delete)
  const [refreshKey, setRefreshKey] = useState(0);

  // Photo modal (for attaching photos to an existing invoice)
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // Load invoice
  useEffect(() => {
    let alive = true;

    (async () => {
      setDataLoading(true);
      try {
        const resp = await axios.get(`/api/invoices/${id}`, {
          withCredentials: true,
        });
        const { data } = resp;

        // Debug logs
        console.log('[INVOICE:RAW_DATA]', data);
        console.log('[INVOICE:RAW_DATA.invoice]', data?.invoice);
        console.log('[INVOICE:RAW_DATA.invoice.photos]', data?.invoice?.photos);

        if (LOUD) {
          log('================ INVOICE SHOW PAYLOAD ================');
          log('invoice:', JSON.parse(JSON.stringify(data?.invoice)));
          log('items:', JSON.parse(JSON.stringify(data?.items)));
          log('organization:', JSON.parse(JSON.stringify(data?.organization)));
          log('customer:', JSON.parse(JSON.stringify(data?.customer)));
          log('permissions:', JSON.parse(JSON.stringify(data?.permissions)));
          log('=====================================================');
        }

        if (!alive) return;

        setInvoice(data?.invoice || null);
        setItems(Array.isArray(data?.items) ? data.items : []);
        setOrg(data?.organization || null);
        setCustomer(data?.customer || null);
        setCaps(
          data?.permissions || {
            can_edit_due_date: false,
            can_mark_paid: false,
            can_send: false,
            can_manage_photos: false,
          }
        );
      } catch (e) {
        const msg = e?.response?.data?.error || 'Failed to load invoice';
        warn(msg, e?.response?.data || e);
        if (alive) {
          showToast(msg, 3500);
          setInvoice(null);
          setItems([]);
          setOrg(null);
          setCustomer(null);
          setCaps({
            can_edit_due_date: false,
            can_mark_paid: false,
            can_send: false,
            can_manage_photos: false,
          });
        }
      } finally {
        if (alive) setDataLoading(false);
      }
    })();

    return () => {
      alive = false;
      try {
        if (sseRef.current) sseRef.current.close();
      } catch {}
      sseRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);

  // Debug photos so you can see them in the console
  useEffect(() => {
    if (invoice) {
      console.log('[INVOICE:SHOW] invoice.photos =', invoice.photos);
    }
  }, [invoice]);

  // Start SSE after org+invoice are known
  useEffect(() => {
    if (!org?.id || !invoice?.id) return;

    const params = new URLSearchParams({
      orgId: String(org.id),
    });

    const url = `/api/sse?${params.toString()}`;
    try {
      const es = new EventSource(url, { withCredentials: true });
      sseRef.current = es;
      const handler = (evt) => {
        try {
          const payload = JSON.parse(evt.data || '{}');
          if (
            payload?.type === 'invoice_updated' &&
            String(payload.invoiceId) === String(invoice.id)
          ) {
            if (LOUD) log('SSE invoice_updated', payload);
            setInvoice((prev) =>
              prev
                ? {
                    ...prev,
                    status: payload.status || prev.status,
                    updated_at: new Date().toISOString(),
                  }
                : prev
            );
          }
        } catch (err) {
          warn('SSE parse error', err);
        }
      };
      es.addEventListener('message', handler);
      es.addEventListener('error', () => {
        warn('SSE error (ignored, may be idle timeout)');
      });
      return () => {
        try {
          es.close();
        } catch {}
      };
    } catch (err) {
      warn('SSE init failed', err);
    }
  }, [org?.id, invoice?.id]);

  const statusTone = useMemo(() => {
    const s = String(invoice?.status || '').toLowerCase();
    if (s === 'paid' || s === 'succeeded') return 'paid';
    if (s === 'failed') return 'failed';
    if (s === 'void') return 'void';
    if (s === 'scheduled') return 'scheduled';
    if (s === 'processing') return 'processing';
    if (s === 'refunded') return 'refunded';
    if (s === 'open' || s === 'sent') return s;
    return 'draft';
  }, [invoice?.status]);

  const total = fmtMoney(invoice?.total_cents, invoice?.currency || 'USD');
  const subtotal = fmtMoney(invoice?.subtotal_cents, invoice?.currency || 'USD');

  const status = String(invoice?.status || '').toLowerCase();
  const isPaidLike = ['paid', 'succeeded', 'refunded', 'void'].includes(status);
  const isChargeableStatus = ['draft', 'open', 'sent', 'scheduled', 'processing', 'failed'].includes(
    status
  );

  const canSendLink = !!caps?.can_send && isChargeableStatus && !isPaidLike;

  const { isRecurring, label: recurrenceLabel, via } = recurrenceInfoFrom(invoice || {});

  const createPayLink = async () => {
    if (!invoice?.id) return;
    setLinking(true);
    try {
      const { data } = await axios.post(
        `/api/invoices/${invoice.id}/paylink`,
        {},
        { withCredentials: true }
      );
      if (data?.url) {
        try {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } catch {}
        try {
          await navigator.clipboard.writeText(data.url);
          showToast('Pay link opened and copied to clipboard.');
        } catch {
          showToast('Pay link opened in a new tab.');
        }
      } else {
        showToast('Failed to create pay link.', 3500);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to create pay link';
      warn('createPayLink error', e?.response?.data || e);
      showToast(msg, 4000);
    } finally {
      setLinking(false);
    }
  };

  // 🔐 Only owner + crew_leader can manage photos (from backend permission)
  const canManagePhotos = !!caps?.can_manage_photos;

  // Photos via protected storage URLs
  const photos = useMemo(() => {
    const raw = Array.isArray(invoice?.photos) ? invoice.photos : [];
    return raw.map((p) => {
      let src =
        p.public_url ||
        `/api/objects/${encodeURIComponent(p.key || p.storage_key || '')}`;

      return { ...p, src };
    });
  }, [invoice?.photos]);

  const handleDeletePhoto = async (photoId) => {
    if (!invoice?.id) return;
    const confirm = window.confirm('Remove this photo from the invoice?');
    if (!confirm) return;

    try {
      await axios.delete(`/api/invoices/${invoice.id}/photos/${photoId}`, {
        withCredentials: true,
      });
      showToast('Photo removed.');
      // Fresh data from server
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to delete photo';
      warn('delete photo error', e?.response?.data || e);
      showToast(msg, 3500);
    }
  };

  // Load trust object for this invoice
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!invoice?.id) {
        if (alive) {
          setTrustObject(null);
          setTrustError('');
          setTrustLoading(false);
        }
        return;
      }
      if (alive) {
        setTrustLoading(true);
        setTrustError('');
      }
      try {
        const resp = await fetch(`/api/trust/invoices/${invoice.id}`, { credentials: 'include' });
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
  }, [invoice?.id]);

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

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          {dataLoading ? (
            <div className="text-neutral-500">Loading invoice…</div>
          ) : !invoice ? (
            <div className="text-red-600">Invoice not found.</div>
          ) : (
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-xl font-semibold">Invoice #{invoice.id}</h1>
                  <div className="mt-1 text-sm text-neutral-600 space-y-0.5">
                    <div>
                      Period:{' '}
                      <span className="font-medium">
                        {ymd(invoice.period_start)} — {ymd(invoice.period_end)}
                      </span>
                    </div>
                  </div>
                  <div>
                      Due:{' '}
                      <span className="font-medium">
                        {ymd(invoice.effective_due_date || invoice.due_date)}
                      </span>
                    </div>
                    {invoice.completed_at && (
                      <div>
                        Completed:{' '}
                        <span className="font-medium">
                          {ymd(invoice.completed_at)} at {hm(invoice.completed_at)}
                        </span>
                      </div>
                    )}
                    {invoice.source && (
                      <div>
                        Source: <span className="font-medium">{invoice.source}</span>
                      </div>
                    )}

                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone}>
                    {String(invoice.status || '').toUpperCase() || 'DRAFT'}
                  </Badge>
                  <Badge tone={isRecurring ? 'info' : 'subtle'} title={`Detected via: ${via}`}>
                    <span className="inline-flex items-center gap-1">
                      <Repeat className="w-3.5 h-3.5" />
                      {recurrenceLabel}
                    </span>
                  </Badge>
                  <div className="text-2xl font-semibold">{total}</div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-neutral-500 mb-1">Billed To</div>
                  <div className="font-medium">{customer?.name || '—'}</div>
                  <div className="text-sm text-neutral-600">
                    {customer?.email && <div>{customer.email}</div>}
                    {customer?.phone_number && <div>{customer.phone_number}</div>}
                    {(customer?.street || customer?.city) && (
                      <div>
                        {customer?.street}
                        {customer?.street && (customer.city || customer.state || customer.zip)
                          ? ', '
                          : ''}
                        {customer?.city}
                        {customer?.state ? ', ' + customer.state : ''}
                        {customer?.zip ? ' ' + customer.zip : ''}
                      </div>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-sm text-neutral-500 mb-1">From</div>
                  <div className="font-medium">{org?.name || 'Your Organization'}</div>
                  <div className="text-sm text-neutral-600">
                    {org?.email && <div>{org.email}</div>}
                    {org?.phone_number && <div>{org.phone_number}</div>}
                    {(org?.street || org?.city) && (
                      <div>
                        {org?.street}
                        {org?.street && (org.city || org.state || org.zip) ? ', ' : ''}
                        {org?.city}
                        {org?.state ? ', ' + org.state : ''}
                        {org?.zip ? ' ' + org.zip : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                        Description
                      </th>
                      <th className="text-right text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                        Qty
                      </th>
                      <th className="text-right text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                        Unit
                      </th>
                      <th className="text-right text-xs font-medium text-neutral-600 uppercase tracking-wider px-3 py-2">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-neutral-500 text-sm" colSpan={4}>
                          No items
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => {
                        const qty = Number(it.quantity || 1);
                        const unit =
                          'unit_price_cents' in it
                            ? Number(it.unit_price_cents || 0)
                            : Number(it.unit_cents || 0);
                        const totalCents =
                          'total_cents' in it
                            ? Number(it.total_cents || 0)
                            : Number(it.amount_cents || 0);
                        return (
                          <tr key={it.id}>
                            <td className="px-3 py-2 text-sm">
                              {it.description || it.service_key || 'Service'}
                            </td>
                            <td className="px-3 py-2 text-right text-sm">{qty}</td>
                            <td className="px-3 py-2 text-right text-sm">
                              {fmtMoney(unit, invoice?.currency || 'USD')}
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-medium">
                              {fmtMoney(totalCents, invoice?.currency || 'USD')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-neutral-50">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right text-sm text-neutral-600"
                      >
                        Subtotal
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">
                        {subtotal}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 📸 Job Photos */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-sm font-semibold text-neutral-700">Job photos</h2>
                  {canManagePhotos && (
                    <button
                      type="button"
                      onClick={() => setPhotoModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border bg-white hover:bg-neutral-50"
                    >
                      <Plus className="w-3 h-3" />
                      Add photos
                    </button>
                  )}
                </div>

                {photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.map((p) => {
                      const src = p.src;
                      return (
                        <div
                          key={p.id}
                          className="relative group rounded-lg border bg-neutral-50 overflow-hidden"
                        >
                          {canManagePhotos && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(p.id)}
                              className="absolute top-1 right-1 z-10 inline-flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          <a
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="block"
                          >
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={src}
                                alt={`Invoice photo ${p.id}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-neutral-400">
                    No photos attached to this invoice.
                  </div>
                )}
              </div>

              {/* Proof of service */}
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

              {/* Actions */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  to="/app/invoices"
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50"
                >
                  All Invoices
                </Link>

                {canSendLink && (
                  <button
                    onClick={createPayLink}
                    disabled={linking}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {linking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Send pay link
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <Toast
          show={toast.show}
          duration={toast.duration}
          onClose={() => setToast((t) => ({ ...t, show: false }))}
        >
          {toast.message}
        </Toast>
      </div>

      {/* Photo upload modal (attach photos to this invoice; no "complete" text) */}
      {invoice && (
        <InvoicePhotoModal
          open={photoModalOpen}
          onClose={() => setPhotoModalOpen(false)}
          invoiceId={invoice.id}
          maxPhotos={10}
          onAttached={() => {
            // Refresh the invoice so the new photos appear
            setRefreshKey((k) => k + 1);
            showToast('Photos attached to invoice.');
          }}
        />
      )}
    </>
  );
}

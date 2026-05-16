// src/pages/OwnerApprovals.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, RefreshCw, Calendar, User, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';
import Toast from '../components/Toast';

const fmtDateTime = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
};

const fmtMoney = (cents) => {
  if (typeof cents !== 'number') return '';
  return `$${(cents / 100).toFixed(2)}`;
};

const timeUntil = (dateStr) => {
  if (!dateStr) return '';
  try {
    const target = new Date(dateStr);
    const now = new Date();
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past due';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks`;
    return `${Math.floor(diffDays / 30)} months`;
  } catch {
    return '';
  }
};

export default function OwnerApprovals({ embedded = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });
  const [sending, setSending] = useState(new Set());

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/approvals', {
        params: { status: 'pending' },
        withCredentials: true,
      });
      const list = Array.isArray(data?.approvals) ? data.approvals : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(list);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load approvals');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendReminder = async (approvalId) => {
    setSending(prev => new Set(prev).add(approvalId));
    try {
      await axios.post(`/api/approvals/${approvalId}/remind`, {}, { withCredentials: true });
      showToast('Reminder sent to customer');
      await load(); // Reload to get updated reminder timestamps
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to send reminder', 3000);
    } finally {
      setSending(prev => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 md:p-6 space-y-4'}>
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="bg-white border rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase text-neutral-500 tracking-wide">Customer Authorizations</div>
            <div className="text-2xl font-semibold">Pending Approvals</div>
            <div className="text-sm text-neutral-600 mt-1">
              Services awaiting customer authorization before completion
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-neutral-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-neutral-600 py-8 text-center">Loading approvals…</div>
        ) : error ? (
          <div className="text-red-600 py-8 text-center">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <div className="text-lg font-medium text-neutral-900">All caught up!</div>
            <div className="text-sm text-neutral-600 mt-1">No pending approvals at this time.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((ap) => {
              const customerId = ap.customer_id || ap.customerId || ap.customer?.id;
              const customerName = ap.customer?.name || ap.customer_name || `Customer #${customerId}`;
              const customerEmail = ap.customer?.email || ap.customer_email || '';
              const customerPhone = ap.customer?.phone || ap.customer_phone_number || ap.customer_phone || '';

              const serviceName = ap.service?.name || ap.service_name || ap.service_label || 'Service';
              const serviceDate = ap.date || ap.scheduled_date || ap.service_date || '';
              const amountCents = ap.amount_cents ?? ap.amountCents ?? null;

              const createdAt = ap.created_at || ap.inserted_at || ap.createdAt;
              const lastReminder = ap.last_reminder_sent || ap.lastReminderSent || ap.last_reminder_at;
              const reminderCount = ap.reminder_count || ap.reminderCount || 0;
              const nextReminder = ap.next_reminder_at || ap.nextReminderAt;

              const urgency = timeUntil(serviceDate);
              const isUrgent = urgency === 'Today' || urgency === 'Tomorrow' || urgency === 'Past due';
              const isSending = sending.has(ap.id);

              return (
                <div
                  key={ap.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isUrgent ? 'border-red-300 bg-red-50' : 'bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Customer Info */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-neutral-600" />
                        <span className="font-semibold text-neutral-900">{customerName}</span>
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white font-medium">
                            {urgency}
                          </span>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="text-sm text-neutral-600 flex flex-wrap gap-3">
                        {customerEmail && <span>{customerEmail}</span>}
                        {customerPhone && <span>{customerPhone}</span>}
                      </div>

                      {/* Service Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-neutral-600" />
                          <span className="font-medium">{serviceName}</span>
                          {serviceDate && (
                            <>
                              <span className="mx-1">•</span>
                              <span>{fmtDate(serviceDate)}</span>
                              <span className="text-neutral-500">({urgency})</span>
                            </>
                          )}
                        </span>
                        {amountCents != null && (
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-neutral-600" />
                            <span className="font-medium">{fmtMoney(amountCents)}</span>
                          </span>
                        )}
                      </div>

                      {/* Reminder Status */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Requested {fmtDateTime(createdAt)}
                        </span>
                        {reminderCount > 0 && (
                          <span className="text-amber-700">
                            {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} sent
                          </span>
                        )}
                        {lastReminder && (
                          <span>Last: {fmtDateTime(lastReminder)}</span>
                        )}
                        {nextReminder && (
                          <span className="text-emerald-700">
                            Next scheduled: {fmtDateTime(nextReminder)}
                          </span>
                        )}
                      </div>

                      {/* Summary/Description */}
                      {(ap.summary || ap.description) && (
                        <div className="text-sm text-neutral-700 italic">
                          {ap.summary || ap.description}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => sendReminder(ap.id)}
                        disabled={isSending}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isSending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                        {isSending ? 'Sending...' : 'Send Reminder'}
                      </button>

                      {customerId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/app/customers/${customerId}`)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border hover:bg-neutral-100 whitespace-nowrap"
                        >
                          View Customer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <div className="font-semibold mb-2">About Automated Reminders</div>
        <div className="space-y-1 text-blue-800">
          <div>• Reminders are sent automatically based on service date</div>
          <div>• Services today: Single immediate reminder</div>
          <div>• Services within 7 days: Daily reminders until day of service</div>
          <div>• Services 1+ month out: Today, tomorrow, weekly, then daily near service date</div>
          <div>• Reminders stop automatically when customer approves</div>
        </div>
      </div>
    </div>
  );
}

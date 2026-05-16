// src/pages/portal/UpcomingChargesWidget.jsx
import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Bell, BellOff, CreditCard } from 'lucide-react';
import axios from 'axios';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function UpcomingChargesWidget({ daysAhead = 30 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    loadUpcomingCharges();
  }, [daysAhead]);

  const loadUpcomingCharges = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: response } = await axios.get('/api/customers/me/upcoming-charges', {
        params: { days: daysAhead },
        withCredentials: true,
        validateStatus: (s) => s < 500, // Don't throw on 404
      });
      // If endpoint doesn't exist yet, just show empty state
      if (response?.upcoming_charges) {
        setData(response);
      } else {
        setData({ upcoming_charges: [], total_amount: '0.00', count: 0 });
      }
    } catch (err) {
      // Gracefully handle missing endpoint
      setData({ upcoming_charges: [], total_amount: '0.00', count: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="text-neutral-600">Loading upcoming charges...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const hasCharges = data?.upcoming_charges && data.upcoming_charges.length > 0;

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-neutral-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-700" />
            <h2 className="text-lg font-semibold text-neutral-900">Upcoming Charges</h2>
          </div>
          {hasCharges && (
            <div className="text-right">
              <p className="text-sm text-neutral-600">Next {daysAhead} days</p>
              <p className="text-lg font-bold text-neutral-900">${data.total_amount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!hasCharges ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Upcoming Charges</h3>
            <p className="text-neutral-600 text-sm">
              You don't have any scheduled services in the next {daysAhead} days.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcoming_charges.map((charge) => {
              const isImminent = charge.days_until <= 2;
              const preNotifSent = charge.pre_notification_sent;

              return (
                <div
                  key={charge.id}
                  className={`border rounded-lg p-4 ${
                    isImminent ? 'border-amber-300 bg-amber-50' : 'border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">{charge.service_name}</h3>
                        {/* Pre-notification badge */}
                        {preNotifSent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                            <Bell className="w-3 h-3" />
                            Notified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs">
                            <BellOff className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-neutral-700">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(charge.service_date)}</span>
                          {charge.days_until <= 7 && (
                            <span className={`font-medium ${isImminent ? 'text-amber-700' : 'text-neutral-600'}`}>
                              ({charge.days_until} day{charge.days_until !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-neutral-700">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">${charge.amount}</span>
                        </div>

                        <div className="flex items-center gap-2 text-neutral-600">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-xs">{charge.payment_method}</span>
                        </div>

                        {preNotifSent && charge.pre_notification_sent_at && (
                          <p className="text-xs text-blue-600 mt-1">
                            Notified: {formatDate(charge.pre_notification_sent_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            {data.count > 1 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">
                    {data.count} scheduled service{data.count !== 1 ? 's' : ''}
                  </span>
                  <div className="text-right">
                    <span className="text-neutral-600">Total: </span>
                    <span className="font-bold text-neutral-900">${data.total_amount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info footer */}
      {hasCharges && (
        <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
          <p className="text-xs text-blue-900">
            <Bell className="w-3 h-3 inline mr-1" />
            You'll receive a notification 24-48 hours before each scheduled service with charge details.
          </p>
        </div>
      )}
    </div>
  );
}

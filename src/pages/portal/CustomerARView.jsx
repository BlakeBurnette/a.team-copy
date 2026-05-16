// src/pages/portal/CustomerARView.jsx
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import axios from 'axios';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function CustomerARView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    loadAR();
  }, []);

  const loadAR = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: arData } = await axios.get('/api/user/accounts-receivable', {
        withCredentials: true,
      });
      setData(arData);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load outstanding payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-neutral-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  const hasOutstanding = data?.outstanding && data.outstanding.length > 0;

  if (!hasOutstanding) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white border rounded-xl shadow-sm p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">All Paid Up!</h3>
          <p className="text-neutral-600">You have no outstanding payments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Payment Required</p>
            <p className="text-sm text-amber-800 mt-1">
              Your recent service payment was unsuccessful. Please update your payment method and retry below.
            </p>
          </div>
        </div>
      </div>

      {/* Outstanding Items */}
      <div className="space-y-4">
        {data.outstanding.map((item) => (
          <div
            key={item.id}
            className="bg-white border-l-4 border-l-orange-500 rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">Outstanding Payment</h3>
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium mt-2">
                    Action Required
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-neutral-600">Service</p>
                  <p className="font-semibold text-neutral-900">{item.service_name}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(item.service_date)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-600">Amount Due</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-6 h-6 text-neutral-700" />
                    <p className="text-3xl font-bold text-neutral-900">
                      {(item.amount_cents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-600">Reason</p>
                  <p className="text-red-600 font-medium mt-1">{item.failure_reason}</p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t">
                <a
                  href={item.payment_link}
                  className="block w-full px-6 py-3 text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                >
                  Update Payment Method & Retry
                </a>
                <p className="text-xs text-neutral-500 text-center mt-2">
                  You'll be able to update your payment method and retry the charge
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Need help?</strong> If you have questions about this charge or need to discuss
          payment options, please contact us directly.
        </p>
      </div>
    </div>
  );
}

// src/pages/ServiceReceiptView.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, MapPin, Calendar, User, DollarSign } from 'lucide-react';
import axios from 'axios';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function ServiceReceiptView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReceipt();
  }, [id]);

  const loadReceipt = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/completion-records/${id}`, {
        withCredentials: true,
      });
      setReceipt(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-neutral-600">Loading receipt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  if (!receipt) return null;

  const isPaid = receipt.billing?.payment_status === 'succeeded';
  const hasAddOns = receipt.add_ons && receipt.add_ons.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Main Receipt Card */}
      <div className="bg-white border rounded-xl shadow-sm">
        {/* Receipt Header */}
        <div className="px-6 py-4 border-b bg-neutral-50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Service Receipt</h1>
              <p className="text-sm text-neutral-600 mt-1">
                Receipt #{receipt.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPaid ? (
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Paid
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                  Payment Failed
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer & Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Customer
              </h3>
              <div className="space-y-1">
                <p className="font-medium text-neutral-900">{receipt.customer?.name}</p>
                {receipt.customer?.email && (
                  <p className="text-sm text-neutral-600">{receipt.customer.email}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Service Date
              </h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-600" />
                <span className="font-medium">{formatDate(receipt.service_date)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-neutral-600">
                <User className="w-4 h-4" />
                <span>Completed by {receipt.completed_by}</span>
              </div>
            </div>
          </div>

          {/* Base Service */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Base Service
            </h3>
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">
                    {receipt.base_service?.service_name}
                  </p>
                  <p className="text-sm text-neutral-600 mt-1">
                    Approved: {formatDateTime(receipt.base_service?.approved_at)}
                  </p>
                  <p className="text-xs text-neutral-500 font-mono mt-1">
                    Approval Hash: {receipt.base_service?.approval_hash?.slice(0, 12)}...
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">${receipt.base_service?.amount?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Add-Ons */}
          {hasAddOns && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                Additional Services
              </h3>
              <div className="space-y-3">
                {receipt.add_ons.map((addon, idx) => (
                  <div key={addon.approval_id || idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-900">{addon.service_name}</p>
                        <p className="text-sm text-neutral-600 mt-1">
                          Approved: {formatDateTime(addon.approved_at)}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono mt-1">
                          Approval Hash: {addon.approval_hash?.slice(0, 12)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${addon.amount?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Proof */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
              Completion Proof
            </h3>

            {/* Photos */}
            {receipt.completion?.photos && receipt.completion.photos.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-neutral-600 mb-2">Service Photos</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {receipt.completion.photos.map((photo, idx) => (
                    <img
                      key={idx}
                      src={photo}
                      alt={`Service photo ${idx + 1}`}
                      className="rounded-lg border w-full h-40 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {receipt.completion?.location?.verified && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-green-700 font-medium">
                  Location Verified ({receipt.completion.location.accuracy})
                </span>
              </div>
            )}

            {/* Notes */}
            {receipt.completion?.notes && (
              <div className="bg-neutral-50 rounded-lg p-4 border">
                <p className="text-sm font-semibold text-neutral-700 mb-1">Completion Notes</p>
                <p className="text-neutral-600">{receipt.completion.notes}</p>
              </div>
            )}
          </div>

          {/* Billing Summary */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
              Billing Summary
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-neutral-700">
                <span>Base Service</span>
                <span>${receipt.billing?.base_amount?.toFixed(2)}</span>
              </div>
              {receipt.billing?.add_ons_total > 0 && (
                <div className="flex items-center justify-between text-neutral-700">
                  <span>Additional Services</span>
                  <span>${receipt.billing.add_ons_total.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total Charged</span>
                  <span>${receipt.billing?.total_charged?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t space-y-1 text-sm text-neutral-600">
              <p>
                <DollarSign className="w-4 h-4 inline mr-1" />
                Charged: {formatDateTime(receipt.billing?.charged_at)}
              </p>
              {receipt.billing?.payment_method && (
                <p>Payment Method: {receipt.billing.payment_method}</p>
              )}
            </div>
          </div>

          {/* Immutability Seal */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900">Sealed Record</p>
                <p className="text-sm text-blue-800 mt-1">
                  This receipt is cryptographically sealed and cannot be modified. The seal proves
                  the authenticity and integrity of this record.
                </p>
                <p className="text-xs font-mono text-blue-700 mt-2">
                  Hash: {receipt.proof?.completion_hash?.slice(0, 32)}...
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Sealed: {formatDateTime(receipt.proof?.sealed_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

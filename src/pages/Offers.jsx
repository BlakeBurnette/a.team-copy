import React, { useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import OfferCard from '../components/offers/OfferCard';
import { acceptOffer, dismissOffer, fetchOffers } from '../api/recommendations';

const friendlyError = (e) => e?.response?.data?.error || e?.message || 'Unable to load offers';

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOffers();
      const list = Array.isArray(data?.offers) ? data.offers : Array.isArray(data) ? data : [];
      setOffers(list);
    } catch (e) {
      setError(friendlyError(e));
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = (id) => setOffers((prev) => prev.filter((o) => (o.id || o.offer_id) !== id));

  const onAccept = async (offer) => {
    if (!offer) return;
    const id = offer.id || offer.offer_id;
    setBusyId(id);
    try {
      await acceptOffer(id);
      showToast('Request sent');
      setTimeout(() => mark(id), 400);
    } catch (e) {
      showToast(friendlyError(e), 2600);
    } finally {
      setBusyId(null);
    }
  };

  const onDismiss = async (offer) => {
    if (!offer) return;
    const id = offer.id || offer.offer_id;
    setBusyId(id);
    try {
      await dismissOffer(id);
      showToast('Dismissed');
      setTimeout(() => mark(id), 200);
    } catch (e) {
      showToast(friendlyError(e), 2600);
    } finally {
      setBusyId(null);
    }
  };

  const hasOffers = useMemo(() => offers.length > 0, [offers]);

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
          <h1 className="text-2xl font-semibold text-neutral-900">Offers</h1>
          <p className="text-sm text-neutral-600">Providers already servicing your area.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-600">Loading offers...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : !hasOffers ? (
        <div className="border rounded-xl bg-white p-4 text-sm text-neutral-700">
          No offers right now.
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => {
            const id = offer.id || offer.offer_id;
            return (
              <OfferCard
                key={id}
                offer={offer}
                onAccept={onAccept}
                onDismiss={onDismiss}
                loading={busyId === id}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

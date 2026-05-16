// src/pages/CustomerDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ResponsiveTabs from '../components/ResponsiveTabs';
import HistoryList from '../components/history/HistoryList';
import SendProofModal from '../components/SendProofModal';
import TrustedLocations from '../components/TrustedLocations';

export default function CustomerDetail() {
  const { customerId } = useParams();
  const headers = useMemo(() => ({}), []);
  const [tab, setTab] = useState('History');
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendProofOpen, setSendProofOpen] = useState(false);
  const [sendProofSrId, setSendProofSrId] = useState(null);
  const [trustedLocations, setTrustedLocations] = useState([]);
  const [trustedError, setTrustedError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await axios.get(`/api/customers/${customerId}`, { withCredentials: true });
        if (alive) setCustomer(data?.customer || data || null);
      } catch (e) {
        if (alive) setError(e?.response?.data?.error || 'Failed to load customer');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  const refreshTrusted = async () => {
    try {
      const { data } = await axios.get(`/api/portal/customers/${customerId}/trusted-locations`, { withCredentials: true });
      const list = Array.isArray(data?.locations) ? data.locations : Array.isArray(data) ? data : [];
      setTrustedLocations(list);
      setTrustedError('');
    } catch (e) {
      setTrustedLocations([]);
      setTrustedError(e?.response?.data?.error || 'Failed to load trusted locations');
    }
  };

  useEffect(() => { refreshTrusted(); }, [customerId]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-neutral-500">Customer</div>
          <h1 className="text-2xl font-bold">{customer?.name || `Customer #${customerId}`}</h1>
        </div>
      </div>

      <ResponsiveTabs
        sections={[
          {
            key: 'History',
            label: 'History',
            render: () => (
              <HistoryList
                scope="customer"
                customerId={customerId}
                headers={headers}
                onSendProof={(srId) => { setSendProofSrId(srId); setSendProofOpen(true); }}
              />
            ),
          },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {loading && <div className="text-sm text-neutral-600">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <TrustedLocations
        customerId={customerId}
        locations={trustedLocations}
        error={trustedError}
        onChange={refreshTrusted}
        headers={headers}
      />

      <SendProofModal
        isOpen={sendProofOpen}
        onClose={() => setSendProofOpen(false)}
        serviceRecordId={sendProofSrId}
        headers={headers}
        customerContact={{
          name: customer?.name,
          email: customer?.email,
          phone: customer?.phone_number,
        }}
      />
    </div>
  );
}

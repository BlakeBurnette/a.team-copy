// src/components/admin/InviteOwnerForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import InlineSelect from './InlineSelect';

const InviteOwnerForm = ({ authHeader, onInvited }) => {
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [ttlHours, setTtlHours] = useState(120);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErr('');
      setToast('');
      setPhoneError('');

      const digits = phone.replace(/\D/g, '');
      if (digits && digits.length !== 10) {
        setLoading(false);
        setPhoneError('Enter a 10-digit US phone number.');
        return;
      }
      const formattedPhone = digits ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}` : '';

      const res = await axios.post(
        '/api/admin/owner-invitations',
        {
          owner_email: ownerEmail,
          owner_name: ownerName || undefined,
          org_name: orgName,
          industry: industry || undefined,
          website: website || undefined,
          phone_number: formattedPhone || undefined,
          ttl_hours: Number(ttlHours) || 120,
        },
        { headers: authHeader() }
      );

      try {
        sessionStorage.setItem('ownerOnboard:ctx', JSON.stringify({
          email: ownerEmail,
          industry,
          phone_number: formattedPhone,
          organization_name: orgName,
          website,
        }));
      } catch {}

      setToast(`Invite created for ${ownerEmail}`);
      setOwnerEmail('');
      setOwnerName('');
      setOrgName('');
      setIndustry('');
      setWebsite('');
      setPhone('');
      setPhoneError('');

      onInvited?.(res.data);
    } catch (e) {
      console.error('Create owner invite failed:', e?.response?.data || e);
      setErr(e?.response?.data?.error || 'Failed to create owner invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200 p-4">
      <h3 className="text-base font-semibold mb-3">Invite Organization Owner</h3>

      {err && <div className="text-red-600 mb-2">{err}</div>}
      {toast && <div className="text-green-700 mb-2">{toast}</div>}

      <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Owner Email *</label>
          <input
            type="email"
            className="border rounded px-3 py-2 w-full"
            required
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Owner Name</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Invite TTL (hours)</label>
          <input
            type="number"
            min="1"
            className="border rounded px-3 py-2 w-full"
            value={ttlHours}
            onChange={(e) => setTtlHours(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Organization Name *</label>
          <input
            className="border rounded px-3 py-2 w-full"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Services"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Industry</label>
          <InlineSelect
            value={industry || ''}
            onChange={(val) => setIndustry(val)}
            options={[
              { value: '', label: '-- Select industry --' },
              'Pressure Washing',
              'Pest Control',
              'Maid Services',
              'Landscaping',
              'HVAC',
              'Concrete',
              'General Contractor',
              'Other',
            ]}
            placeholder="-- Select industry --"
            buttonClassName="w-full border rounded px-3 py-2 text-sm bg-white text-left"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            className={`border rounded px-3 py-2 w-full ${phoneError ? 'border-rose-400' : ''}`}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(555) 123-4567"
            inputMode="tel"
          />
          {phoneError ? <div className="text-xs text-rose-600 mt-1">{phoneError}</div> : null}
        </div>

        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-zinc-600 text-white disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create Owner Invite'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InviteOwnerForm;
  const formatPhone = (raw) => {
    const digits = (raw || '').replace(/\D/g, '').slice(0, 10);
    const len = digits.length;
    if (len === 0) return '';
    if (len <= 3) return `(${digits}`;
    if (len <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

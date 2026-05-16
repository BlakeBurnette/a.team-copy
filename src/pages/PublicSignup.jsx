// src/pages/PublicSignup.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function PublicSignup() {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [services, setServices] = useState([]);
  const [code, setCode] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    selected: {}, // key: boolean
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const m = window.location.pathname.match(/\/signup\/([^/]+)/);
    const c = m ? m[1] : '';
    setCode(c);
    async function load() {
      try {
        const res = await axios.get(`/api/public/signup/${c}`);
        setOrg(res.data.organization);
        setServices(res.data.services || []);
      } catch (e) {
        console.error('Failed to load invitation', e);
      } finally {
        setLoading(false);
      }
    }
    if (c) load();
    else setLoading(false);
  }, []);

  const toggle = (key) => setForm(f => ({ ...f, selected: { ...f.selected, [key]: !f.selected[key] } }));

  const submit = async () => {
    try {
      const selected = services.filter(s => form.selected[s.key]).map(s => ({
        key: s.key,
        price_cents: s.price_cents,
      }));
      await axios.post(`/api/public/signup/${code}`, {
        name: form.name,
        email: form.email,
        phone_number: form.phone_number,
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
        services_selected: selected,
      });
      setSubmitted(true);
    } catch (e) {
      console.error('Signup failed', e);
      alert('Signup failed');
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!org) return <div className="p-6">Invalid or expired invitation.</div>;
  if (submitted) return <div className="p-6">Thanks! We received your request for {org.name}.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-2">{org.name}</h1>
      <div className="text-gray-600 mb-6">Select services and provide your contact + address.</div>

      <div className="bg-white rounded-xl shadow border p-4 md:p-6 mb-6">
        <h3 className="font-semibold mb-3">Services</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {services.map(s => (
            <label key={s.key} className="border rounded p-3 flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={!!form.selected[s.key]} onChange={()=>toggle(s.key)} />
              <div>
                <div className="font-medium">{s.label}</div>
                {/* ✅ Guard against null/undefined price_cents */}
                {typeof s.price_cents === 'number' && s.price_cents >= 0 && (
                  <div className="text-sm text-gray-600">
                    ${(s.price_cents/100).toFixed(2)} {s.currency || 'USD'}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
        {services.length === 0 && (
          <div className="text-sm text-amber-700">No services available at this time.</div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow border p-4 md:p-6 mb-6">
        <h3 className="font-semibold mb-3">Contact</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="Full name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Phone" value={form.phone_number} onChange={e=>setForm({...form, phone_number:e.target.value})}/>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border p-4 md:p-6 mb-6">
        <h3 className="font-semibold mb-3">Address</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className="border p-2 rounded md:col-span-2" placeholder="Street" value={form.street} onChange={e=>setForm({...form, street:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="City" value={form.city} onChange={e=>setForm({...form, city:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="State" value={form.state} onChange={e=>setForm({...form, state:e.target.value})}/>
          <input className="border p-2 rounded" placeholder="Zip" value={form.zip} onChange={e=>setForm({...form, zip:e.target.value})}/>
        </div>
      </div>

      <button onClick={submit} className="px-4 py-2 rounded bg-zinc-600 text-white">Submit</button>
      <div className="text-xs text-gray-500 mt-2">Payment setup (Stripe) will be requested later.</div>
    </div>
  );
}

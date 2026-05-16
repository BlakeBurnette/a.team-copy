// src/pages/account/ServicesTab.jsx (your file path may differ)
import React from 'react';
import axios from 'axios';
import { Card, FieldLabel, money, useAuthHeader } from './_shared';

export default function ServicesTab({ showToast }) {
  const authHeader = useAuthHeader();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [services, setServices] = React.useState([]); // {id, name, price_cents, currency}
  const [selected, setSelected] = React.useState(new Set());

  const toggleService = (id) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(services.map(s => s.id)));
  const clearAll = () => setSelected(new Set());

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        console.log('[ServicesTab] fetching /api/users/services + /api/users/preferences');
        const [svcRes, prefRes] = await Promise.all([
          axios.get('/api/users/services', { headers: authHeader, withCredentials: true }),
          axios.get('/api/users/preferences', { headers: authHeader, withCredentials: true }),
        ]);
        if (!mounted) return;
        console.log('[ServicesTab] services resp:', svcRes.status, svcRes.data);
        console.log('[ServicesTab] preferences resp:', prefRes.status, prefRes.data);

        setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
        const pref = prefRes?.data || {};
        setSelected(new Set((pref.services_selected || []).map(Number)));
      } catch (e) {
        const errData = e?.response?.data || e?.message || e;
        console.error('[ServicesTab] load error:', errData);
        showToast('Failed to load services/preferences');
        setServices([]);
        setSelected(new Set());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authHeader, showToast]);

  const save = async () => {
    try {
      setSaving(true);
      const body = { services_selected: [...selected].map(Number) };
      console.log('[ServicesTab] saving preferences:', body);
      const res = await axios.put('/api/users/preferences', body, {
        headers: authHeader,
        withCredentials: true
      });
      console.log('[ServicesTab] save resp:', res.status, res.data);
      showToast('Preferences saved');
    } catch (e) {
      console.error('[ServicesTab] save error:', e?.response?.data || e);
      showToast('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const selectedList = services.filter(s => selected.has(s.id));

  return (
    <div className="grid gap-6">
      <Card title="Currently selected services">
        {selectedList.length === 0 ? (
          <div className="text-neutral-600">No services selected yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedList.map(s => (
              <span key={s.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm">
                {s.name} {money(s.price_cents, s.currency) ? <span className="text-neutral-500">· {money(s.price_cents, s.currency)}</span> : null}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Choose your services"
        actions={
          <>
            <button type="button" className="px-3 py-2 rounded border" onClick={selectAll}>Select all</button>
            <button type="button" className="px-3 py-2 rounded border" onClick={clearAll}>Clear</button>
            <button type="button" className="px-3 py-2 rounded text-white bg-zinc-600" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Preferences'}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : services.length === 0 ? (
          <div className="text-neutral-600">No services available.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {services.map(s => (
              <label key={s.id} className="flex items-center gap-3 border rounded px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleService(s.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{s.name}</div>
                  {money(s.price_cents, s.currency) && (
                    <div className="text-sm text-neutral-600">{money(s.price_cents, s.currency)}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}


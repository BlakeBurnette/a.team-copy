// src/pages/account/ScheduleTab.jsx
import React from 'react';
import axios from 'axios';
import { Card, FieldLabel, DAY_KEYS, DAY_LABEL, normalizeHours, useAuthHeader } from './_shared';

const FREQ_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'One-time' },
  { value: 'every_x_weeks', label: 'Every X weeks' },
];

export default function ScheduleTab({ showToast }) {
  const authHeader = useAuthHeader();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hours, setHours] = React.useState(null);
  const [selectedDays, setSelectedDays] = React.useState(new Set());

  // NEW: frequency state
  const [freq, setFreq] = React.useState(null);         // 'weekly' | 'biweekly' | 'monthly' | 'once' | 'every_x_weeks'
  const [freqInterval, setFreqInterval] = React.useState(2); // only used when every_x_weeks

  const toggleDay = (key) =>
    setSelectedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectWeekdays = () => setSelectedDays(new Set(['mon','tue','wed','thu','fri']));
  const clearDays = () => setSelectedDays(new Set());

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [orgRes, prefRes] = await Promise.all([
          axios.get('/api/users/my-organization', { headers: authHeader, withCredentials: true }),
          axios.get('/api/users/preferences', { headers: authHeader, withCredentials: true }),
        ]);
        if (!mounted) return;
        const biz = orgRes?.data?.business_hours || {};
        setHours(normalizeHours(biz));

        const pref = prefRes?.data || {};
        setSelectedDays(new Set((pref.available_days || []).filter(d => DAY_KEYS.includes(d))));

        // pull frequency from prefs (map DB representation → UI radios)
        const f = pref.service_frequency || null;
        const iv = Number.isFinite(pref.service_interval) ? pref.service_interval : null;
        if (f === 'every_x_weeks' && iv === 2) {
          // DB stores biweekly as every_x_weeks + interval=2
          setFreq('biweekly');
          setFreqInterval(2);
        } else if (f === 'every_x_weeks') {
          setFreq('every_x_weeks');
          if (iv != null) setFreqInterval(iv);
        } else {
          setFreq(f);
          if (iv != null) setFreqInterval(iv);
        }

      } catch (e) {
        setHours(null);
        setSelectedDays(new Set());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authHeader]);

  const saveDays = async () => {
    try {
      setSaving(true);
      await axios.put('/api/users/preferences',
        { available_days: [...selectedDays].filter(d => DAY_KEYS.includes(d)) },
        { headers: authHeader, withCredentials: true }
      );
      showToast('Availability saved');
    } catch (e) {
      console.error('save schedule prefs failed', e?.response?.data || e);
      showToast('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const saveFrequency = async () => {
    try {
      setSaving(true);
      const payload = { service_frequency: freq };
      if (freq === 'every_x_weeks') {
        payload.service_interval = Math.max(1, Math.min(26, Number(freqInterval) || 2));
      }
      // biweekly is just a convenience alias → every_x_weeks + interval=2 (server accepts biweekly too; either works)
      if (freq === 'biweekly') {
        payload.service_frequency = 'every_x_weeks';
        payload.service_interval = 2;
      }
      await axios.put('/api/users/preferences', payload, {
        headers: authHeader,
        withCredentials: true,
      });
      showToast('Service frequency saved');
    } catch (e) {
      console.error('save frequency failed', e?.response?.data || e);
      showToast('Failed to save frequency');
    } finally {
      setSaving(false);
    }
  };

  const selectableDays = React.useMemo(() => {
    if (!hours) return [];
    return DAY_KEYS
      .map(k => ({ key: k, label: DAY_LABEL[k], ...(hours[k] || {}) }))
      .filter(d => d && !d.closed && (d.open || d.close));
  }, [hours]);

  return (
    <div className="grid gap-6">
      {/* Availability */}
      <Card
        title="Available to receive services"
        actions={
          <>
            <button type="button" className="px-3 py-2 rounded border" onClick={selectWeekdays}>Select weekdays</button>
            <button type="button" className="px-3 py-2 rounded border" onClick={clearDays}>Clear</button>
            <button type="button" className="px-3 py-2 rounded text-white bg-zinc-600" onClick={saveDays} disabled={saving}>
              {saving ? 'Saving…' : 'Save Availability'}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : selectableDays.length === 0 ? (
          <div className="text-neutral-600">
            Your organization hasn’t published business hours yet.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-neutral-600 mb-1">
              Select the days you can receive service. We’ll schedule within the business-hour window shown.
            </div>
            <div className="grid grid-cols-1 gap-2">
              {selectableDays.map(d => (
                <label key={d.key} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedDays.has(d.key)} onChange={() => toggleDay(d.key)} />
                    <div className="font-medium">{d.label}</div>
                  </div>
                  <div className="text-sm text-neutral-600">{(d.open || '--:--')} – {(d.close || '--:--')}</div>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* NEW: Service Frequency */}
      <Card
        title="Service frequency"
        actions={
          <button
            type="button"
            className="px-3 py-2 rounded text-white bg-zinc-600"
            onClick={saveFrequency}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Frequency'}
          </button>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-neutral-600">
            Choose how often you’d like service.
          </div>

          <div className="grid gap-2">
            {FREQ_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="svc_freq"
                  value={opt.value}
                  checked={freq === opt.value}
                  onChange={() => setFreq(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          {freq === 'every_x_weeks' && (
            <div className="flex items-center gap-2">
              <FieldLabel>Every</FieldLabel>
              <input
                type="number"
                min={1}
                max={26}
                className="border p-2 w-20"
                value={freqInterval}
                onChange={(e) => setFreqInterval(e.target.value)}
              />
              <span className="text-sm text-neutral-600">weeks</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

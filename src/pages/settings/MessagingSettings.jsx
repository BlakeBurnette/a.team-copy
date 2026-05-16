// src/pages/settings/MessagingSettings.jsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext.jsx';

const DEFAULT_ARRIVING_NOW_TEMPLATE =
  'Hi {{customer_first_name}}, your {{service_name}} service is starting now. If you have any questions, reply to this text.';

export default function MessagingSettings() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};

  // Service-tomorrow state
  const [tomorrowTemplate, setTomorrowTemplate] = useState('');
  const [tomorrowEnabled, setTomorrowEnabled] = useState(true);

  // On-my-way state
  const [onMyWayTemplate, setOnMyWayTemplate] = useState('');
  const [onMyWayEnabled, setOnMyWayEnabled] = useState(true);

  // Arriving-now state
  const [arrivingNowTemplate, setArrivingNowTemplate] = useState(
    DEFAULT_ARRIVING_NOW_TEMPLATE
  );
  const [arrivingNowEnabled, setArrivingNowEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const authHeaders = useCallback(async () => ({}), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const headers = await authHeaders();
        const { data } = await axios.get('/api/owner/messaging/templates', {
          headers,
          withCredentials: true,
        });

        // Service tomorrow
        const t = data?.templates?.service_tomorrow_sms;
        if (t) {
          setTomorrowTemplate(t.template || '');
          setTomorrowEnabled(t.enabled !== false);
        }

        // On my way
        const omw = data?.templates?.on_my_way_sms;
        if (omw) {
          setOnMyWayTemplate(omw.template || '');
          setOnMyWayEnabled(omw.enabled !== false);
        }

        // Arriving now
        const an = data?.templates?.arriving_now_sms;
        if (an) {
          setArrivingNowTemplate(an.template || DEFAULT_ARRIVING_NOW_TEMPLATE);
          setArrivingNowEnabled(an.enabled !== false);
        } else {
          // No row yet – show default but mark enabled
          setArrivingNowTemplate(DEFAULT_ARRIVING_NOW_TEMPLATE);
          setArrivingNowEnabled(true);
        }
      } catch (e) {
        setMsg(e?.response?.data?.error || 'Failed to load messaging settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [authHeaders]);

  const onSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const headers = await authHeaders();

      // Service tomorrow
      await axios.put(
        '/api/owner/messaging/templates/service_tomorrow_sms',
        { template: tomorrowTemplate, enabled: tomorrowEnabled },
        { headers, withCredentials: true }
      );

      // On my way
      await axios.put(
        '/api/owner/messaging/templates/on_my_way_sms',
        { template: onMyWayTemplate, enabled: onMyWayEnabled },
        { headers, withCredentials: true }
      );

      // Arriving now
      await axios.put(
        '/api/owner/messaging/templates/arriving_now_sms',
        { template: arrivingNowTemplate, enabled: arrivingNowEnabled },
        { headers, withCredentials: true }
      );

      setMsg('Saved');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  if (loading) {
    return <div className="p-4 text-neutral-600">Loading messaging settings…</div>;
  }

  return (
    <div className="space-y-8 p-4 max-w-3xl">
      {/* Service reminder (tomorrow) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold mb-1">Service reminder (tomorrow)</h2>
          <p className="text-sm text-neutral-600">
            This SMS will be sent to customers with visits scheduled for tomorrow,
            if they have a phone on file and have not opted out. You can use:
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{customer_first_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{customer_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{org_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{organization_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_date}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_date_iso}}'}
            </code>
            .
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tomorrowEnabled}
            onChange={(e) => setTomorrowEnabled(e.target.checked)}
          />
          Enable service reminders for tomorrow
        </label>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            SMS template
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
            value={tomorrowTemplate}
            onChange={(e) => setTomorrowTemplate(e.target.value)}
          />
        </div>
      </section>

      <hr className="border-neutral-200" />

      {/* On My Way */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold mb-1">On My Way</h2>
        <p className="text-sm text-neutral-600">
            This SMS is sent when you click the <strong>On My Way</strong> button
            for a visit. It does not track live location. You can use:
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{customer_first_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{organization_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_date}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_window}}'}
            </code>
            .
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onMyWayEnabled}
            onChange={(e) => setOnMyWayEnabled(e.target.checked)}
          />
          Enable “On My Way” SMS
        </label>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            SMS template
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
            value={onMyWayTemplate}
            onChange={(e) => setOnMyWayTemplate(e.target.value)}
          />
        </div>
      </section>

      <hr className="border-neutral-200" />

      {/* Arriving now */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold mb-1">Arriving now</h2>
          <p className="text-sm text-neutral-600">
            This SMS is sent when you click the <strong>Arriving now</strong> button
            for a visit. It is meant for “we are starting right now” notifications.
            You can use:
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{customer_first_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{customer_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{organization_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_name}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_date}}'}
            </code>
            ,
            <code className="ml-1 text-xs bg-neutral-100 px-1 rounded">
              {'{{service_time}}'}
            </code>
            .
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={arrivingNowEnabled}
            onChange={(e) => setArrivingNowEnabled(e.target.checked)}
          />
          Enable “Arriving now” SMS
        </label>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            SMS template
          </label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
            value={arrivingNowTemplate}
            onChange={(e) => setArrivingNowTemplate(e.target.value)}
          />
        </div>

        <p className="text-xs text-neutral-500">
          Default: “Hi{' '}
          {'{{customer_first_name}}'}
          , your{' '}
          {'{{service_name}}'}
          {' '}service is starting now. If you have any questions, reply to this text.”
        </p>
      </section>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      {msg && <div className="text-sm text-neutral-600 mt-2">{msg}</div>}
    </div>
  );
}

import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';
import { Card, FieldLabel, cx, useAuthHeader } from './_shared';
import Dropdown from '../../components/Dropdown';

const preferredContactOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'phone', label: 'Phone Call' },
];

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
const cleanName = (name) => (!name || isEmail(name) ? '' : name);

export default function AccountTab({ showToast }) {
  const authHeader = useAuthHeader();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [changingPass, setChangingPass] = React.useState(false);

  const [form, setForm] = React.useState({
    name: '', email: '', phone_number: '', preferred_contact: 'email', offers_opt_out: false,
  });
  const [notifPrefs, setNotifPrefs] = React.useState({});

  // Locations (optional)
  const [locationsApi, setLocationsApi] = React.useState(true);
  const [addrLoading, setAddrLoading] = React.useState(true);
  const [addrSaving, setAddrSaving] = React.useState(false);
  const [addresses, setAddresses] = React.useState([]);
  const [draftNew, setDraftNew] = React.useState({
    label: '', street: '', city: '', state: '', zip: '', is_default: false,
  });

  const setFormVal = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setDraftNewVal = (k, v) => setDraftNew((p) => ({ ...p, [k]: v }));

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: u } = await axios.get('/api/users/me', { headers: authHeader, withCredentials: true });
        if (!mounted) return;
        const rawName = u.name ?? '';
        const safeName = cleanName(rawName);
        const np = u.notification_prefs || {};
        setNotifPrefs(np);
        setForm({
          name: safeName,
          email: u.email || '',
          phone_number: u.phone_number || '',
          preferred_contact: u.preferred_contact || np.preferred_contact || 'email',
          offers_opt_out: !!(u.offers_opt_out ?? np.offers_opt_out),
        });
      } catch (e) {
        // noop
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authHeader]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAddrLoading(true);
        const { data } = await axios.get('/api/users/locations', { headers: authHeader, withCredentials: true });
        if (!mounted) return;
        setAddresses(Array.isArray(data) ? data : []);
        setLocationsApi(true);
      } catch {
        setLocationsApi(false);
      } finally {
        if (mounted) setAddrLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authHeader]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      const nextPrefs = { ...(notifPrefs || {}), preferred_contact: form.preferred_contact, offers_opt_out: !!form.offers_opt_out };
      await axios.put(
        '/api/users/update-me',
        {
          name: cleanName(form.name).trim() || null,
          email: form.email,
          phone_number: form.phone_number,
          preferred_contact: form.preferred_contact,
          offers_opt_out: !!form.offers_opt_out,
          notification_prefs: nextPrefs,
        },
        { headers: authHeader, withCredentials: true }
      );
      setNotifPrefs(nextPrefs);
      showToast('Account saved');
    } catch (e) {
      console.error('saveProfile failed', e?.response?.data || e);
      showToast('Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    try {
      setChangingPass(true);
      const { data } = await axios.post('/api/users/password-change-ticket', {}, { headers: authHeader, withCredentials: true });
      if (data?.url) window.location.assign(data.url);
      else showToast('Could not start password change');
    } catch (e) {
      console.error('password-change-ticket failed', e?.response?.data || e);
      showToast('Could not start password change');
    } finally {
      setChangingPass(false);
    }
  };

  const addAddress = async () => {
    if (!draftNew.street || !draftNew.city || !draftNew.state || !draftNew.zip) {
      showToast('Please complete street, city, state, and ZIP.');
      return;
    }
    try {
      setAddrSaving(true);
      const { data } = await axios.post('/api/users/locations', { ...draftNew }, { headers: authHeader, withCredentials: true });
      const created = data?.id
        ? { ...draftNew, id: data.id }
        : { ...draftNew, id: Math.random().toString(36).slice(2) };
      setAddresses((p) => {
        const list = [...p, created];
        if (created.is_default) return list.map(a => ({ ...a, is_default: a.id === created.id }));
        return list;
      });
      setDraftNew({ label: '', street: '', city: '', state: '', zip: '', is_default: false });
      showToast('Address added');
    } catch (e) {
      console.error('addAddress failed', e?.response?.data || e);
      showToast('Failed to add address');
    } finally {
      setAddrSaving(false);
    }
  };

  const saveAddress = async (addr) => {
    try {
      setAddrSaving(true);
      await axios.put(`/api/users/locations/${addr.id}`, { ...addr }, { headers: authHeader, withCredentials: true });
      setAddresses((p) => {
        const next = p.map(a => (a.id === addr.id ? { ...addr } : a));
        if (addr.is_default) return next.map(a => ({ ...a, is_default: a.id === addr.id }));
        return next;
      });
      showToast('Address saved');
    } catch (e) {
      console.error('saveAddress failed', e?.response?.data || e);
      showToast('Failed to save address');
    } finally {
      setAddrSaving(false);
    }
  };

  const deleteAddress = async (addr) => {
    try {
      setAddrSaving(true);
      await axios.delete(`/api/users/locations/${addr.id}`, { headers: authHeader, withCredentials: true });
      setAddresses((p) => p.filter(a => a.id !== addr.id));
      showToast('Address removed');
    } catch (e) {
      console.error('deleteAddress failed', e?.response?.data || e);
      showToast('Failed to remove address');
    } finally {
      setAddrSaving(false);
    }
  };

  const setDefaultAddress = async (addr) => {
    try {
      setAddrSaving(true);
      try {
        // Preferred endpoint (added in backend)
        await axios.put(`/api/users/locations/${addr.id}/default`, {}, { headers: authHeader, withCredentials: true });
      } catch {
        // Fallback: update flag directly
        await axios.put(`/api/users/locations/${addr.id}`, { ...addr, is_default: true }, { headers: authHeader, withCredentials: true });
      }
      setAddresses((p) => p.map(a => ({ ...a, is_default: a.id === addr.id })));
      showToast('Default location updated');
    } catch (e) {
      console.error('setDefaultAddress failed', e?.response?.data || e);
      showToast('Failed to update default');
    } finally {
      setAddrSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card
        title="Profile"
        actions={
          <>
            <button
              onClick={changePassword}
              disabled={changingPass}
              className={cx('px-4 py-2 rounded border', changingPass && 'opacity-60')}
              type="button"
            >
              {changingPass ? 'Starting…' : 'Change Password'}
            </button>
            <button
              onClick={saveProfile}
              disabled={saving}
              className={cx('px-4 py-2 rounded text-white', saving ? 'bg-gray-400' : 'bg-zinc-600')}
              type="button"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-neutral-600">Loading…</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                className="border p-2 w-full"
                value={form.name}
                onChange={(e) => setFormVal('name', e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                className="border p-2 w-full"
                value={form.email}
                onChange={(e) => setFormVal('email', e.target.value)}
                type="email"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input
                className="border p-2 w-full"
                value={form.phone_number}
                onChange={(e) => setFormVal('phone_number', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <FieldLabel>Preferred contact</FieldLabel>
              <Dropdown
                value={form.preferred_contact}
                onChange={(v) => setFormVal('preferred_contact', v)}
                options={preferredContactOptions}
              />
            </div>
          </div>
        )}
      </Card>

      <Card title="Offer texts" subtitle="Manage seasonal offer texts and reminders.">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-800">
            Receive seasonal offers by text
            <div className="text-xs text-neutral-600">You can opt out anytime. Reply STOP to any message.</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!form.offers_opt_out}
              onChange={(e) => setFormVal('offers_opt_out', !e.target.checked)}
            />
            {form.offers_opt_out ? 'Opted out' : 'Opted in'}
          </label>
        </div>
      </Card>

      <Card title="Security" subtitle="Manage your account security settings.">
        <Link
          to="/app/user/passkeys"
          className="flex items-center justify-between p-3 -m-2 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-neutral-500" />
            <div>
              <div className="font-medium text-neutral-900">Passkeys</div>
              <div className="text-sm text-neutral-500">Manage your passkeys for passwordless login</div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-neutral-400" />
        </Link>
      </Card>

      {/* Locations */}
      {locationsApi && (
        <Card
          title="Service locations"
          actions={
            <button
              onClick={addAddress}
              disabled={addrSaving}
              className={cx('px-4 py-2 rounded text-white', addrSaving ? 'bg-gray-400' : 'bg-zinc-600')}
              type="button"
            >
              {addrSaving ? 'Saving…' : 'Add'}
            </button>
          }
        >
          {addrLoading ? (
            <div className="text-neutral-600">Loading…</div>
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-3 mb-3">
                <input className="border p-2 w-full" placeholder="Label (optional)" value={draftNew.label} onChange={(e)=>setDraftNewVal('label', e.target.value)} />
                <input className="border p-2 w-full" placeholder="Street" value={draftNew.street} onChange={(e)=>setDraftNewVal('street', e.target.value)} />
                <input className="border p-2 w-full" placeholder="City" value={draftNew.city} onChange={(e)=>setDraftNewVal('city', e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="border p-2 w-full uppercase" maxLength={2} placeholder="ST" value={draftNew.state} onChange={(e)=>setDraftNewVal('state', e.target.value.toUpperCase())} />
                  <input className="border p-2 w-full" placeholder="ZIP" value={draftNew.zip} onChange={(e)=>setDraftNewVal('zip', e.target.value)} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draftNew.is_default} onChange={(e)=>setDraftNewVal('is_default', e.target.checked)} />
                    Default
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                {addresses.length === 0 ? (
                  <div className="text-neutral-600">No saved locations yet.</div>
                ) : (
                  addresses.map((addr) => (
                    <div key={addr.id} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {addr.label || 'Address'} {addr.is_default && <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700">Default</span>}
                        </div>
                        <div className="flex gap-2">
                          {!addr.is_default && (
                            <button className="px-3 py-1 rounded border" onClick={() => setDefaultAddress(addr)} type="button">
                              Make Default
                            </button>
                          )}
                          <button className="px-3 py-1 rounded border" onClick={() => saveAddress(addr)} type="button">
                            Save
                          </button>
                          <button className="px-3 py-1 rounded border" onClick={() => deleteAddress(addr)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-2 mt-2">
                        <input className="border p-2 w-full" value={addr.label || ''} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,label:e.target.value}:a))} placeholder="Label" />
                        <input className="border p-2 w-full" value={addr.street || ''} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,street:e.target.value}:a))} placeholder="Street" />
                        <input className="border p-2 w-full" value={addr.city || ''} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,city:e.target.value}:a))} placeholder="City" />
                        <div className="grid grid-cols-3 gap-2">
                          <input className="border p-2 w-full uppercase" maxLength={2} value={addr.state || ''} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,state:e.target.value.toUpperCase()}:a))} placeholder="ST" />
                          <input className="border p-2 w-full" value={addr.zip || ''} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,zip:e.target.value}:a))} placeholder="ZIP" />
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!addr.is_default} onChange={(e)=>setAddresses(p=>p.map(a=>a.id===addr.id?{...a,is_default:e.target.checked}:a))} />
                            Default
                          </label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

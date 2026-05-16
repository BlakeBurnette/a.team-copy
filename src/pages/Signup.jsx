import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Toast from '../components/Toast';
import LogoMark from '../components/LogoMark';
import { useAuth } from '../context/AuthContext';
import AddressAutocomplete from '../components/AddressAutocomplete';

/* ---------------------------------- API ---------------------------------- */
const API = (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '');

// --- PayHive brand palette (style only) ---
const UI = {
  pageBg: '#F5F5F5',
  heroTop: '#FFBF47',
  heroBottom: '#FFA11E',
  textDark: '#2E2E2E',
  altDark: '#0D4C55',
  cardBorder: '#E5E7EB',
  btnHover: '#FFB033',
};

/* ------------------------------ Constants --------------------------- */
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABEL = { sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday' };

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s().-]{10,}$/;
const stateRe = /^[A-Za-z]{2}$/;

/* ------------------------------ Helpers --------------------------- */
const normalizeHours = (raw) => {
  const out = {}; DAY_KEYS.forEach(k => (out[k] = { open:null, close:null, closed:true }));
  if (!raw || typeof raw !== 'object') return out;
  const str = (x) => (x == null ? null : (String(x).trim() || null));
  const toBool = (x) => {
    if (typeof x === 'boolean') return x;
    if (x == null) return undefined;
    const s = String(x).toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return undefined;
  };
  for (const [k0, v0] of Object.entries(raw)) {
    const low = String(k0).toLowerCase();
    const key = DAY_KEYS.includes(low) ? low : (['sun','mon','tue','wed','thu','fri','sat'].find(k => low.startsWith(k)) || null);
    if (!key) continue;
    const v = (typeof v0 === 'object' && v0) ? v0 : {};
    let open = v.open ?? v.start ?? v.open_time ?? v.from ?? null;
    let close = v.close ?? v.end ?? v.close_time ?? v.to ?? null;
    open = str(open); close = str(close);
    const hasAny = !!(open || close);
    const explicitClosed = toBool(v.closed);
    const closed = explicitClosed !== undefined ? explicitClosed : !hasAny;
    out[key] = { open, close, closed };
  }
  return out;
};

const fmtUSD = (cents) =>
  (Number(cents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

// Feature toggle: disable ZIP lookups if the endpoint is unavailable.
const ENABLE_ZIP_LOOKUP = false;

/* ------------------------------- UI helpers ------------------------------- */
const Card = ({ title, children, actions }) => (
  <div className="bg-white rounded-2xl shadow-lg border">
    <div className="px-5 py-4 border-b" style={{ borderColor: UI.cardBorder }}>
      <h3 className="text-xl font-semibold" style={{ color: UI.textDark }}>{title}</h3>
    </div>
    <div className="p-5">{children}</div>
    {actions && (
      <div className="px-5 py-4 border-t flex gap-2 justify-end" style={{ borderColor: UI.cardBorder }}>
        {actions}
      </div>
    )}
  </div>
);

/* --------------------------------- Page ---------------------------------- */
export default function Signup() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshMe, setProfile } = useAuth() || {};

  // Org context + hours + services
  const [org, setOrg] = useState(null);
  const [services, setServices] = useState([]);
  const [availTemplate, setAvailTemplate] = useState(null);

  // Wizard steps
  // 0 email -> 1 password (create + login) -> address -> availability -> services -> frequency -> disclosures -> post-auth name -> post-auth phone
  const STEPS = [
    'email',
    'password',
    'address',
    'availability',
    'services',
    'frequency',
    'disclosures',
    'postauth_phone',
  ];
  const PRE_AUTH_LAST_INDEX = 6;

  const [step, setStep] = useState(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // Lead fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');

  // Address fields (always visible)
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [street, setStreet] = useState('');

  // Other selections
  const [availableDays, setAvailableDays] = useState(new Set());
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [freq, setFreq] = useState('weekly');
  const [freqInterval, setFreqInterval] = useState(2);

  // Disclosures
  const [smsConsent, setSmsConsent] = useState(false);
  const [autopayOneOffs, setAutopayOneOffs] = useState(false);

  // Track last looked-up ZIP to avoid duplicate fetches
  const lastZipLookedUp = useRef('');

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show:false, msg:'' }), 2200);
  };

  /* ------------------------------ Bootstrap ------------------------------ */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/public/signup/${code}`);
        const organization = res.data.organization || null;
        const bizHours = organization?.business_hours || {};
        setOrg(organization);
        setAvailTemplate(normalizeHours(bizHours));
        const svcList = (Array.isArray(res.data.services) ? res.data.services : [])
          .filter(s => s?.active !== false)
          .map(s => ({
            ...s,
            key: s.key || s.id || s.service_id,
            label: s.label || s.name,
          }));
        setServices(svcList);
        try { sessionStorage.setItem('signup:service_catalog', JSON.stringify(svcList)); } catch {}

        // Prefill email from URL (?email=) or previous session
        try {
          const sp = new URLSearchParams(location.search);
          const emailFromQs = (sp.get('email') || '').trim();
          const storedEmail = (sessionStorage.getItem('signup:email') || '').trim();
          const storedName = (() => {
            try {
              const ctx = JSON.parse(sessionStorage.getItem('signup:ctx') || '{}');
              return (ctx?.name || '').trim();
            } catch { return ''; }
          })();
          const prefill = emailFromQs || storedEmail;
          if (prefill && emailRe.test(prefill)) {
            setEmail(prefill);
            sessionStorage.setItem('signup:email', prefill);
            sessionStorage.setItem('signup:ctx', JSON.stringify({
              ...(JSON.parse(sessionStorage.getItem('signup:ctx') || '{}')),
              code, org_id: organization?.id ?? null, org_name: organization?.name ?? '', email: prefill,
            }));
          }
          if (storedName) setName(storedName);
        } catch {}

        // Force fresh start on every load (no resume)
        try { sessionStorage.removeItem('signup:resumePostAuth'); } catch {}
        setStep(0);
      } catch (e) {
        console.error('[Signup] bootstrap error', e?.response?.data || e);
        showToast('Invite not found or expired');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [code, location.search]);

  /* ---------------------------- Derived helpers --------------------------- */
  const selectableDays = useMemo(() => {
    if (!availTemplate) return [];
    return DAY_KEYS
      .map(k => ({ key: k, label: DAY_LABEL[k], ...(availTemplate[k] || {}) }))
      .filter(d => d && !d.closed && (d.open || d.close));
  }, [availTemplate]);

  const storedServiceCatalog = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('signup:service_catalog');
      const arr = JSON.parse(raw || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }, []);

  const estimatedSelectionTotal = useMemo(() => {
    let sum = 0;
    for (const s of services) {
      if (selectedServices.has(s.key) && typeof s.price_cents === 'number') sum += s.price_cents;
    }
    return sum;
  }, [services, selectedServices]);

  // Shorter, clearer authorization copy (no checkbox required here)
  const buildAuthorizationText = useCallback(() => {
    const orgName = org?.name || 'this provider';
    const capText = estimatedSelectionTotal > 0
      ? (estimatedSelectionTotal / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
      : 'the displayed estimate';
    return [
      `By adding a card, you allow ${orgName} to save it and to charge it after each visit you request and receive — including off-session when your invoice is issued.`,
      `For each visit, we’ll charge the price of the option you select (plus taxes/fees).`,
      `We won’t exceed ${capText} unless you approve additional work.`,
      `You can turn off auto-charge or remove this card anytime in Account → Payments.`,
      `If a charge fails, we may retry for a limited period.`,
      `We’ll send a receipt for every charge.`,
    ].join(' ');
  }, [org?.name, estimatedSelectionTotal]);

  /* ------------------------------ ZIP handlers ------------------------------ */
  const lookupZipInline = async (zIn) => {
    if (!ENABLE_ZIP_LOOKUP) return;
    const z = String(zIn ?? zip).replace(/\D/g, '').slice(0, 5);
    if (z.length !== 5) return;

    if (lastZipLookedUp.current === z) return;
    lastZipLookedUp.current = z;

    try {
      const { data } = await axios.get(`${API}/api/public/zip/${z}`);
      setCity(data?.city || '');
      setState((data?.state || '').toUpperCase());
    } catch {
      setCity('');
      setState('');
      showToast('ZIP not found. Please enter city/state.');
    }
  };

  const onZipChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZip(v);
    if (v.length === 5) lookupZipInline(v);
  };

  /* ------------------------------ API calls ------------------------------ */
  const saveEmail = async () => {
    const v = String(email || '').trim();
    const n = String(name || '').trim();
    if (!n) return showToast('Enter your name');
    if (!emailRe.test(v)) return showToast('Enter a valid email');
    try {
      await axios.post(`${API}/api/public/signup/${code}/lead`, { email: v, name: n || null });

      // ✅ Persist as a dedicated key handoff flows can read later
      try {
        sessionStorage.setItem('signup:email', v);
      } catch {}

      sessionStorage.setItem('signup:ctx', JSON.stringify({
        ...(JSON.parse(sessionStorage.getItem('signup:ctx') || '{}')),
        code,
        org_id: org?.id ?? null,
        org_name: org?.name ?? '',
        email: v,
        name: n,
      }));
      setStep(step + 1);
    } catch (e) {
      console.error('saveEmail', e?.response?.data || e);
      showToast('Could not save email');
    }
  };

  const deriveNameFromEmail = (v) => {
    const local = String(v || '').split('@')[0] || '';
    if (!local) return 'New Customer';
    const clean = local.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
    return clean ? clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'New Customer';
  };

  const savePassword = async () => {
    const vEmail = String(email || '').trim();
    const pw = String(password || '');
    const pw2 = String(passwordConfirm || '');
    if (!emailRe.test(vEmail)) return showToast('Enter a valid email');
    if (pw !== pw2) return showToast('Passwords must match');
    const strong = pw.length >= 12 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
    if (!strong) return showToast('Use 12+ chars with upper, lower, number, symbol');

    try {
      setSubmitting(true);
      // Create account + session in one call. Fallback if the primary endpoint is missing on older servers.
      const basePayload = { email: vEmail, password: pw, name: (name || '').trim() || undefined };
      const endpoints = [
        { url: `${API}/api/public/signup/${code}/accept-user`, payload: basePayload },
        { url: `${API}/api/public/signup/${code}/accept`, payload: basePayload },
        // Older handler may expect more fields; send safe nulls to satisfy validators.
        {
          url: `${API}/api/public/signup/${code}`,
          payload: {
            ...basePayload,
            name: name || deriveNameFromEmail(vEmail),
            phone_number: phone || '0000000000',
            street: null, city: null, state: null, zip: null,
          },
        },
      ];

      let created = false;
      let lastErr = null;
      let createdData = null;
      for (const { url, payload } of endpoints) {
        try {
          const res = await axios.post(url, payload, { withCredentials: true });
          if (res?.status && res.status < 300) {
            created = true;
            createdData = res?.data || null;
            break;
          }
        } catch (err) {
          const status = err?.response?.status;
          const codeErr = err?.response?.data?.error;
          // On 404/public_not_found, try the next endpoint; otherwise surface the error.
          if (status === 404 || codeErr === 'public_not_found') {
            lastErr = err;
            continue;
          }
          lastErr = err;
          break;
        }
      }

      if (!created) {
        const msg = lastErr?.response?.data?.message || lastErr?.response?.data?.error || 'Could not create account';
        throw new Error(msg);
      }

      // If the endpoint returns a user, hydrate profile without extra auth/me.
      if (created && createdData && typeof createdData === 'object' && typeof setProfile === 'function') {
        try { setProfile(createdData); } catch {}
      }

      sessionStorage.setItem('signup:ctx', JSON.stringify({
        ...(JSON.parse(sessionStorage.getItem('signup:ctx') || '{}')),
        code, org_id: org?.id ?? null, org_name: org?.name ?? '', email: vEmail, name: (name || '').trim() || undefined,
      }));
      setStep(step + 1);
    } catch (e) {
      console.error('savePassword', e?.response?.data || e);
      const msg = e?.message || e?.response?.data?.error || e?.response?.data?.message || 'Could not create account';
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const saveAddress = async () => {
    const z = String(zip || '').trim();
    const c = String(city || '').trim();
    const s = String(state || '').trim().toUpperCase();
    const st = String(street || '').trim();
    if (!st) return showToast('Enter your street address');
    if (!c) return showToast('Enter your city');
    if (!stateRe.test(s)) return showToast('Use 2-letter state code (e.g., NC)');
    if (!/^\d{5}$/.test(z)) return showToast('Enter a valid 5-digit ZIP');
    try {
      await axios.patch(`${API}/api/public/signup/${code}/lead`, {
        email: String(email).trim(),
        street: st, city: c, state: s, zip: z,
      });
      setStep(step + 1);
    } catch (e) {
      console.error('saveAddress', e?.response?.data || e);
      showToast('Could not save address');
    }
  };

  const saveAvailabilityServer = async (emailVal) => {
    await axios.patch(`${API}/api/public/signup/${code}/lead/availability`, {
      email: emailVal,
      available_days: [...availableDays],
    });
  };

  const saveServicesServer = async (emailVal) => {
    const selected = services.filter(s => selectedServices.has(s.key)).map(s => ({ key: s.key }));
    await axios.patch(`${API}/api/public/signup/${code}/lead/services`, { email: emailVal, services_selected: selected });
  };

  const saveFrequencyServer = async (emailVal) => {
    await axios.patch(`${API}/api/public/signup/${code}/lead/frequency`, {
      email: emailVal,
      service_frequency: freq,
      service_interval: (freq === 'every_x_weeks') ? Number(freqInterval) || 2 : null,
    });
  };

  const saveAvailabilityAndNext = async () => {
    try { await saveAvailabilityServer(String(email).trim()); setStep(step + 1); }
    catch (e) { console.error('saveAvailability', e?.response?.data || e); showToast('Could not save availability'); }
  };

  const saveServicesAndNext = async () => {
    try { await saveServicesServer(String(email).trim()); setStep(step + 1); }
    catch (e) { console.error('saveServices', e?.response?.data || e); showToast('Could not save services'); }
  };

  const saveFrequencyAndNext = async () => {
    try { await saveFrequencyServer(String(email).trim()); setStep(step + 1); }
    catch (e) { console.error('saveFrequency', e?.response?.data || e); showToast('Could not save frequency'); }
  };

  const finalizeAndGoAuth = async () => {
    try {
      sessionStorage.setItem('signup:ctx', JSON.stringify({
        ...(JSON.parse(sessionStorage.getItem('signup:ctx') || '{}')),
        name,
      }));
      sessionStorage.setItem('signup:billing', JSON.stringify({
        autopay_authorized: !!autopayOneOffs,
        autopay_oneoffs: !!autopayOneOffs,
        authorization_text: buildAuthorizationText(),
        estimated_selected_total_cents: estimatedSelectionTotal,
      }));
      sessionStorage.setItem('signup:prefs', JSON.stringify({
        service_frequency: freq,
        ...(freq === 'every_x_weeks' ? { service_interval: Number(freqInterval) || 2 } : {}),
      }));
      sessionStorage.setItem('signup:location', JSON.stringify({
        label: 'Home',
        street: street || '',
        city,
        state: String(state || '').toUpperCase().slice(0,2),
        zip,
        is_default: true,
      }));
      sessionStorage.setItem('signup:availability', JSON.stringify([...availableDays]));
      sessionStorage.setItem('signup:services', JSON.stringify([...selectedServices]));
      sessionStorage.setItem('signup:resumePostAuth', '1');
      sessionStorage.setItem('signup:sms_opt_in', smsConsent ? '1' : '0');
    } catch {}

    // ✅ Already authenticated after password step; go straight to payment
    const next = `/signup/${code}/pay`;
    navigate(next, { replace: true });
  };

  const postAuthPersistAll = async () => {
    const vEmail = String(email || '').trim();
    if (!emailRe.test(vEmail)) return showToast('Enter a valid email');
    if (!phoneRe.test(String(phone || '').trim())) return showToast('Enter a valid phone number');

    const services_selected = services
      .filter(s => selectedServices.has(s.key))
      .map(s => ({ key: s.key }));

    // Recover SMS opt-in from session if present
    let smsOpt = smsConsent;
    try {
      const stash = sessionStorage.getItem('signup:sms_opt_in');
      if (stash === '1') smsOpt = true;
      if (stash === '0') smsOpt = false;
    } catch {}

    setSubmitting(true);
    try {
      await axios.patch(`${API}/api/public/signup/${code}/lead`, {
        email: vEmail,
        name: String(name || '').trim() || null,
        phone_number: String(phone || '').trim(),
        street: street || null,
        city: city || null,
        state: String(state || '').toUpperCase() || null,
        zip: String(zip || '').trim() || null,
      });

      await saveAvailabilityServer(vEmail);
      await saveServicesServer(vEmail);
      await saveFrequencyServer(vEmail);

      await axios.post(`${API}/api/public/signup/${code}`, {
        name: String(name || '').trim() || null,
        email: vEmail,
        phone_number: String(phone || '').trim(),
        street: street || null, city, state, zip,
        services_selected,
        available_days: [...availableDays],
        service_frequency: freq,
        service_interval: (freq === 'every_x_weeks') ? Number(freqInterval) || 2 : null,
        sms_opt_in: !!smsOpt,
        autopay_authorized: !!autopayOneOffs,
        autopay_oneoffs: !!autopayOneOffs,
        authorization_text: buildAuthorizationText(),
      });

      sessionStorage.removeItem('signup:resumePostAuth');

      // 🚦 After saving, head to dashboard
      navigate('/app', { replace: true });
    } catch (e) {
      console.error('postAuthPersistAll', e?.response?.data || e);
      showToast('Could not save your info');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubcopy = () => {
    if (STEPS[step] === 'email') return "Tell us your name and email to get started.";
    if (STEPS[step] === 'password') return "Create a password to secure your new account.";
    if (STEPS[step] === 'address') return "Enter your full address — we’ll auto-fill city & state from ZIP when possible.";
    if (STEPS[step] === 'postauth_phone') return "Add a phone number for scheduling updates.";
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: UI.pageBg }}>
        <div className="text-neutral-600">Loading…</div>
      </div>
    );
  }

  const totalStepsVisible = STEPS.length;
  const StepNav = () => (
    <div className="border-t" style={{ borderColor: UI.cardBorder }}>
      <div className="px-6 py-4 text-center text-sm text-neutral-600">
        <div className="font-medium">Step {Math.min(step + 1, totalStepsVisible)} of {totalStepsVisible}</div>
        {org && (
          <div className="mt-1">
            for <span className="font-semibold">{org.name}</span>
          </div>
        )}
      </div>
    </div>
  );

  const selectedCount = availableDays.size;
  const totalSelectable = selectableDays.length;

  const handleSelectAll = () => {
    const all = new Set(selectableDays.map(d => d.key));
    setAvailableDays(all);
  };

  const isPostAuth = step >= 6;

  return (
    <div className="min-h-screen w-full" style={{ background: UI.pageBg }}>
      <style>{`
        .hero-curve { border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; }
        @media (min-width: 640px) { .hero-curve { border-bottom-left-radius: 35vw 8vh; border-bottom-right-radius: 35vw 8vh; } }
        @media (min-width: 1024px) { .hero-curve { border-bottom-left-radius: 50vw 12vh; border-bottom-right-radius: 50vw 12vh; } }

        .fade-in { opacity: 0; transform: translateY(-4px); transition: opacity .25s ease, transform .25s ease; }
        .fade-in.revealed { opacity: 1; transform: translateY(0); }
      `}</style>

      <Toast show={toast.show} onClose={() => setToast({ show:false, msg:'' })}>{toast.msg}</Toast>

      {/* Top hero */}
      <div
        className="w-full hero-curve"
        style={{ background: `linear-gradient(180deg, ${UI.heroTop} 0%, ${UI.heroBottom} 100%)` }}
      >
        <div className="max-w-xl mx-auto px-4 pt-10 pb-20 text-center">
          <LogoMark className="h-10 w-auto mx-auto text-[#2E2E2E]" />
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight" style={{ color: UI.textDark }}>
            Welcome to the Hive!
          </h1>
        </div>
      </div>

      {/* Floating white form card */}
      <div className="max-w-xl mx-auto px-4 -mt-12 pb-10">
        <div className="rounded-2xl shadow-xl border bg-white" style={{ borderColor: UI.cardBorder }}>
          <div className="px-6 pt-6 pb-2 text-center">
            <h2 className="text-3xl font-extrabold" style={{ color: UI.textDark }}>
              {isPostAuth ? 'Finish setting up' : 'Create Account'}
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {getSubcopy()}
            </p>
          </div>

          <div className="px-5 pb-2">
            <h1 className="sr-only">Request service</h1>

            {/* STEP 1: Name + Email */}
            {STEPS[step] === 'email' && (
              <Card
                title="Your info"
                actions={
                  <button
                    className="w-full px-5 py-3 rounded-full font-semibold shadow-sm transition-colors"
                    style={{ background: UI.heroBottom, color: '#111111' }}
                    onClick={saveEmail}
                    onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                    onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                  >
                    Continue
                  </button>
                }
              >
                <div className="space-y-3">
                  <input
                    className="border p-3 rounded-full w-full"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEmail()}
                    autoFocus
                    style={{ borderColor: UI.cardBorder }}
                  />
                  <input
                    className="border p-3 rounded-full w-full"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEmail()}
                    style={{ borderColor: UI.cardBorder }}
                  />
                </div>
              </Card>
            )}

            {/* STEP 2: Password */}
            {STEPS[step] === 'password' && (
              <Card
                title="Create password"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''} transition-colors`}
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      disabled={submitting}
                      onClick={savePassword}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      {submitting ? 'Creating…' : 'Create account'}
                    </button>
                  </>
                }
              >
                <div className="grid gap-3">
                  <input
                    className="border p-3 rounded-full w-full"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePassword()}
                    autoFocus
                    style={{ borderColor: UI.cardBorder }}
                  />
                  <input
                    className="border p-3 rounded-full w-full"
                    placeholder="Confirm password"
                    type="password"
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && savePassword()}
                    style={{ borderColor: UI.cardBorder }}
                  />
                  <div className="text-xs text-neutral-600">
                    Use at least 12 characters with uppercase, lowercase, a number, and a symbol.
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 2: Address */}
            {STEPS[step] === 'address' && (
              <Card
                title="Your address"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors"
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={saveAddress}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      Continue
                    </button>
                  </>
                }
              >
                <div className="grid gap-3">
                  <div>
                    <label className="block text-sm text-neutral-700 mb-1">Street address</label>
                    <AddressAutocomplete
                      value={{ street, city, state, zip }}
                      onChange={(address) => {
                        setStreet(address.street || '');
                        setCity(address.city || '');
                        setState(address.state || '');
                        setZip(address.zip || '');
                      }}
                      placeholder="Start typing your address..."
                      className="border p-3 rounded-full w-full"
                      countryCode="us"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Start typing to search, or enter manually below</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                    <input
                      className="border p-3 rounded-full sm:col-span-3"
                      placeholder="City"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      style={{ borderColor: UI.cardBorder }}
                    />
                    <input
                      className="border p-3 rounded-full sm:col-span-1 uppercase"
                      placeholder="ST"
                      maxLength={2}
                      value={state}
                      onChange={e => setState(e.target.value.toUpperCase())}
                      style={{ borderColor: UI.cardBorder }}
                    />
                    <input
                      className="border p-3 rounded-full sm:col-span-2 text-center"
                      placeholder="ZIP"
                      inputMode="numeric"
                      value={zip}
                      onChange={onZipChange}
                      onBlur={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0,5);
                        if (v.length === 5) lookupZipInline(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = e.currentTarget.value.replace(/\D/g, '').slice(0,5);
                          if (v.length === 5) lookupZipInline(v);
                        }
                      }}
                      style={{ borderColor: UI.cardBorder }}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 3: Availability */}
            {STEPS[step] === 'availability' && (
              <Card
                title="Available to receive services"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors"
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={saveAvailabilityAndNext}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      Continue
                    </button>
                  </>
                }
              >
                {selectableDays.length === 0 ? (
                  <div className="text-neutral-600">
                    This organization hasn’t published business hours yet. You can continue without selecting availability.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-2">
                        <button type="button" className="px-3 py-1.5 text-sm rounded-full border"
                                style={{ borderColor: UI.cardBorder }}
                                onClick={handleSelectAll}
                                disabled={availableDays.size === totalSelectable}>
                          Select all
                        </button>
                      </div>
                      <div className="text-sm text-neutral-600">
                        Selected {selectedCount} / {totalSelectable}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      {selectableDays.map(d => (
                        <label key={d.key} className="flex items-center justify-between gap-3 border rounded-xl px-4 py-3"
                               style={{ borderColor: UI.cardBorder }}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={availableDays.has(d.key)}
                              onChange={() => {
                                const n = new Set(availableDays);
                                n.has(d.key) ? n.delete(d.key) : n.add(d.key);
                                setAvailableDays(n);
                              }}
                            />
                            <div className="font-medium">{d.label}</div>
                          </div>
                          <div className="text-sm text-neutral-600">{(d.open || '--:--')} – {(d.close || '--:--')}</div>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* STEP 4: Services */}
            {STEPS[step] === 'services' && (
              <Card
                title="Services requested"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors"
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={saveServicesAndNext}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      Continue
                    </button>
                  </>
                }
              >
                {services.length === 0 ? (
                  <div className="text-neutral-600">No services are currently offered.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {services.map(s => (
                      <label key={s.key} className="flex items-center gap-3 border rounded-xl px-4 py-3"
                             style={{ borderColor: UI.cardBorder }}>
                        <input
                          type="checkbox"
                          checked={selectedServices.has(s.key)}
                          onChange={() => {
                            const n = new Set(selectedServices);
                            n.has(s.key) ? n.delete(s.key) : n.add(s.key);
                            setSelectedServices(n);
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{s.label}</div>
                          {typeof s.price_cents === 'number' && s.price_cents > 0 && (
                            <div className="text-sm text-neutral-600">{fmtUSD(s.price_cents)}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {estimatedSelectionTotal > 0 && (
                  <div className="text-xs text-neutral-500 mt-2">
                    Estimated per-visit total:&nbsp;{fmtUSD(estimatedSelectionTotal)} (taxes/discounts may apply).
                  </div>
                )}
              </Card>
            )}

            {/* STEP 5: Frequency */}
            {STEPS[step] === 'frequency' && (
              <Card
                title="Service frequency"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors"
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={saveFrequencyAndNext}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      Continue
                    </button>
                  </>
                }
              >
                <div className="grid gap-2">
                  {[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Every 2 weeks' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'once', label: 'One-time' },
                    { value: 'every_x_weeks', label: 'Every X weeks' },
                  ].map(opt => (
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
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-neutral-700">Every</span>
                    <input
                      type="number"
                      min={1}
                      max={26}
                      className="border p-2 w-20 rounded-full"
                      value={freqInterval}
                      onChange={(e) => setFreqInterval(e.target.value)}
                      style={{ borderColor: UI.cardBorder }}
                    />
                    <span className="text-sm text-neutral-600">weeks</span>
                  </div>
                )}
              </Card>
            )}

            {/* STEP 6: Disclosures */}
            {STEPS[step] === 'disclosures' && (
              <Card
                title="Billing & Disclosures"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''} transition-colors`}
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      disabled={submitting}
                      onClick={finalizeAndGoAuth}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      Next Step
                    </button>
                  </>
                }
              >
                <div className="space-y-3">
                  <div className="text-sm text-neutral-700">
                    {buildAuthorizationText()}
                  </div>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="autopayOneOffs"
                      checked={autopayOneOffs}
                      onChange={(e) => setAutopayOneOffs(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-neutral-700">
                      Auto-charge this card after each visit. <span className="text-neutral-600">(You can turn this off anytime.)</span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="smsConsent"
                      checked={smsConsent}
                      onChange={(e) => setSmsConsent(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-neutral-700">
                      I agree to receive service updates by SMS from <strong>{org?.name || 'this provider'}</strong>.
                      Msg &amp; data rates may apply. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help. Frequency varies.
                    </span>
                  </label>

                  <p className="text-xs text-neutral-500">
                    You can update your payment method or turn off auto-charge in <strong>Account → Payments</strong>.
                  </p>
                </div>
              </Card>
            )}

            {STEPS[step] === 'postauth_phone' && (
              <Card
                title="Phone number"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium"
                            style={{ borderColor: UI.cardBorder }}
                            onClick={() => setStep(step - 1)}>Back</button>
                    <button
                      className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''} transition-colors`}
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={postAuthPersistAll}
                      disabled={submitting}
                      onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                      onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                    >
                      {submitting ? 'Saving…' : 'Finish'}
                    </button>
                  </>
                }
              >
                <input
                  className="border p-3 rounded-full w-full"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postAuthPersistAll()}
                  autoFocus
                  style={{ borderColor: UI.cardBorder }}
                />
              </Card>
            )}
          </div>

          <StepNav />

          <div className="px-6 pb-6 pt-2 text-center">
            <p className="text-sm text-neutral-700">
              Already have an account?{' '}
              <a href="/login" className="font-semibold underline">Log in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

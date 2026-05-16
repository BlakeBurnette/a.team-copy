// src/pages/OwnerOnboard.jsx
// v2.7.6 — remove "Service area" step
//          • deleted step + state, imports, persistence, API calls
//          • hours now proceeds directly to estimated customers
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { useParams, useNavigate } from 'react-router-dom';

import usePlatformBilling from '../hooks/usePlatformBilling';
import PlatformBillingPanel from '../components/owner/PlatformBillingPanel';
import Toast from '../components/Toast';
import LogoMark from '../components/LogoMark';
import { useAuth } from '../context/AuthContext';
import { newTraceId } from '../lib/trace';
import { debugFetch } from '../lib/debugFetch';

// Post-Stripe questions
import ScheduleHoursEditor from '../components/admin/ScheduleHoursEditor';
import AddressAutocomplete from '../components/AddressAutocomplete';

const DEBUG_AUTH = (typeof window !== 'undefined' && window?.localStorage?.getItem('DEBUG_AUTH') === '1');
const dlog = (...args) => { if (DEBUG_AUTH) console.log(...args); };

const API_BASE =
  (import.meta.env?.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/$/, '') : '') ||
  (config?.apiBasePath ? String(config.apiBasePath).replace(/\/$/, '') : '') ||
  (config?.apiOrigin ? `${String(config.apiOrigin).replace(/\/$/, '')}/api` : '');
const AXIOS_OPTS = { withCredentials: true };

const UI = {
  pageBg: '#F5F5F5', heroTop: '#FFBF47', heroBottom: '#FFA11E',
  textDark: '#2E2E2E', cardBorder: '#E5E7EB', btnHover: '#FFB033',
};

// Removed 'service_area'
const STEPS = ['account', 'org_name', 'phone', 'address', 'hours', 'org_stub', 'billing', 'enable_quotes', 'kyc'];
const BASE_INDUSTRIES = [
  'Pressure Washing',
  'Pest Control',
  'Maid Services',
  'Landscaping',
  'HVAC',
  'Concrete',
  'General Contractor',
  'Other',
];

function titleify(s){const keepUpper=new Set(['llc','inc','co','usa']);return String(s||'').trim().split(/\s+/).filter(Boolean).map(w=>keepUpper.has(w.toLowerCase())?w.toUpperCase():w.charAt(0).toUpperCase()+w.slice(1)).join(' ');}
function looksEmailDerived(name,email){if(!name)return false;const n=String(name).toLowerCase();const local=String(email||'').split('@')[0]?.toLowerCase()||'';return n.includes('@')||/'s\s+organization$/.test(n)||(local&&n.includes(local));}
function deriveOrgFromEmail(email){if(!email)return'';const local=String(email).split('@')[0]||'';const [base,plus]=local.split('+',2);let source=(plus&&plus.length>=4?plus:base)||'';source=source.replace(/[._-]+/g,' ').replace(/\d+/g,' ').replace(/\s+/g,' ').trim();if(!source||source.length<3)return'';return titleify(source);}
const calcMonthlyCents=(n)=>{const cap=34900;let remaining=Math.max(0,Number(n)||0);let cents=0;const tiers=[{size:50,rate:300},{size:100,rate:200},{size:150,rate:100},{size:Infinity,rate:50},];for(const {size,rate} of tiers){if(remaining<=0)break;const chunk=size===Infinity?remaining:Math.min(remaining,size);cents+=chunk*rate;remaining-=chunk;}return Math.min(cents,cap);};
const fmtUSD=(c)=>`$${(Number(c||0)/100).toFixed(2)}`;

const Field=({label,children,hint})=>(
  <label className="grid gap-1">
    <span className="text-sm font-medium text-neutral-700">{label}</span>
    {children}
    {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
  </label>
);
const Card=({title,children,actions,subtitle})=>(
  <div className="bg-white rounded-2xl shadow-lg border overflow-visible" style={{borderColor:UI.cardBorder}}>
    <div className="px-5 py-4 border-b" style={{borderColor:UI.cardBorder}}>
      <h3 className="text-xl font-semibold" style={{color:UI.textDark}}>{title}</h3>
      {subtitle ? <p className="text-sm text-neutral-500 mt-1">{subtitle}</p> : null}
    </div>
    <div className="p-5">{children}</div>
    {actions && <div className="px-5 py-4 border-t flex gap-2 justify-end" style={{borderColor:UI.cardBorder}}>{actions}</div>}
  </div>
);

export default function OwnerOnboard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();

  const mountedRef = useRef(true);
  const resumedRef = useRef(false);

  const STEP_KEY = useMemo(() => `ownerOnboard:step:${code}`, [code]);
  // Always start at the first step to avoid stale resume state
  const initialStep = 0;

  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  const [invite, setInvite] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const [organizationName, setOrganizationName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [cityDirty, setCityDirty] = useState(false);
  const [stateDirty, setStateDirty] = useState(false);
  const lastZipLookedUp = useRef('');

  const [businessHours, setBusinessHours] = useState({});

  const [estimatedCustomers, setEstimatedCustomers] = useState('');
  const [pricingPreview, setPricingPreview] = useState(null);
  const [enableQuotes, setEnableQuotes] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [ctxError, setCtxError] = useState('');

  const authHeader = useMemo(() => ({}), []);
  const billingHook = usePlatformBilling(authHeader);

  const industryOptions = useMemo(() => {
    const opts = [...BASE_INDUSTRIES];
    const current = String(industry || '').trim();
    if (current && !opts.includes(current)) opts.unshift(current);
    return opts;
  }, [industry]);

  // persist step after first paint (avoid clobber)
  // We no longer persist step; always start fresh

  const showToast = (msg) => { setToast({ show: true, msg: String(msg || '') }); setTimeout(()=> mountedRef.current && setToast({ show: false, msg: '' }), 2400); };

  const buildPayload = (extra = {}) => {
    const payload = {
      organization_name: String(organizationName || '').trim() || null,
      name: String(organizationName || '').trim() || null,
      industry: industry || null,
      website: String(website || '').trim() || null,
      phone_number: String(phoneNumber || '').trim() || null,
      email: String(inviteEmail || '').trim() || null,
      street: street?.trim() || null,
      city: city?.trim() || null,
      state: String(state || '').trim().toUpperCase() || null,
      zip: String(zip || '').trim() || null,
      ...extra,
    };
    if (!payload.website || !/^https?:\/\//i.test(payload.website)) delete payload.website;
    return payload;
  };

  const normalizeBusinessHours = (raw) => {
    const out = {};
    Object.entries(raw || {}).forEach(([day, val]) => {
      const open = String(val?.open || '').trim();
      const close = String(val?.close || '').trim();
      const closed = !!val?.closed || (!open && !close);
      out[day] = { open, close, closed };
    });
    return out;
  };

  const persistCtx = () => {
    try {
      sessionStorage.setItem('ownerOnboard:ctx', JSON.stringify({
        organization_name: organizationName, industry, phone_number: phoneNumber,
        website,
        street, city, state, zip, email: inviteEmail || '',
        business_hours: businessHours,
        // removed service area persistence
        estimated_customers: estimatedCustomers === '' ? null : Number(estimatedCustomers),
        enable_quotes: !!enableQuotes,
        code,
      }));
    } catch {}
  };
  const loadCtx = () => {
    try {
      const raw = sessionStorage.getItem('ownerOnboard:ctx'); if (!raw) return;
      const ctx = JSON.parse(raw);
      if (ctx.organization_name) setOrganizationName(ctx.organization_name);
      if (ctx.industry) setIndustry(ctx.industry);
      if (ctx.phone_number) setPhoneNumber(ctx.phone_number);
      if (ctx.website) setWebsite(ctx.website);
      if (ctx.street) setStreet(ctx.street);
      if (ctx.city) setCity(ctx.city);
      if (ctx.state) setStateVal(ctx.state);
      if (ctx.zip) setZip(ctx.zip);
      if (ctx.business_hours) setBusinessHours(ctx.business_hours);
      if (ctx.estimated_customers !== undefined && ctx.estimated_customers !== null) setEstimatedCustomers(String(ctx.estimated_customers));
      if (ctx.enable_quotes !== undefined) setEnableQuotes(!!ctx.enable_quotes);
      if (ctx.code) setCtxError('');
    } catch {}
  };

  // ZIP lookup removed; manual entry only.

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}`, AXIOS_OPTS);
        setInvite(data || {});
        const pf = data?.prefill || {};
        const invitedEmail = data?.invited_email || '';
        setInviteEmail(invitedEmail || '');

        if (pf?.industry) setIndustry(pf.industry);
        if (pf?.phone_number) setPhoneNumber(pf.phone_number);
        if (pf?.website) setWebsite(pf.website);
        if (pf?.street) setStreet(pf.street);
        if (pf?.city) setCity(pf.city);
        if (pf?.state) setStateVal(pf.state);
        if (pf?.zip) setZip(pf.zip);
        if (pf?.business_hours) setBusinessHours(pf.business_hours);

        if (pf?.estimated_customers != null) setEstimatedCustomers(String(pf.estimated_customers));
        if (pf?.enable_quotes !== undefined) setEnableQuotes(!!pf.enable_quotes);
        else if (data?.enable_quotes !== undefined) setEnableQuotes(!!data.enable_quotes);
        if (data?.pricing_preview) setPricingPreview(data.pricing_preview);

        try {
          sessionStorage.setItem('ownerOnboard:ctx', JSON.stringify({
            email: invitedEmail || '',
            code: code || '',
            organization_name: initialOrg || '',
            industry: pf?.industry || '',
            phone_number: pf?.phone_number || '',
            website: pf?.website || '',
            street: pf?.street || '',
            city: pf?.city || '',
            state: pf?.state || '',
            zip: pf?.zip || '',
            business_hours: pf?.business_hours || {},
            estimated_customers: pf?.estimated_customers ?? null,
            enable_quotes: pf?.enable_quotes ?? data?.enable_quotes ?? null,
          }));
        } catch {}

        let initialOrg='';
        if (pf?.org_name && !looksEmailDerived(pf.org_name, invitedEmail)) initialOrg = pf.org_name;
        else { const guess = deriveOrgFromEmail(invitedEmail); if (guess) initialOrg = guess; }
        if (initialOrg) setOrganizationName(initialOrg);

        const hadResume = new URLSearchParams(window.location.search).get('resume') === '1' ||
          sessionStorage.getItem('ownerOnboard:resumeAfterStripe') === '1';
        if (hadResume && !resumedRef.current) { resumedRef.current = true; loadCtx(); try{sessionStorage.removeItem('ownerOnboard:resumeAfterStripe');}catch{} }
        if (!invitedEmail || !code) setCtxError('Invite context missing. Please reopen from your invite link.');
      } catch (e) {
        console.error('OwnerOnboard bootstrap failed:', e?.response?.data || e);
        showToast(e?.response?.data?.error || 'Failed to load onboarding link');
        navigate('/app', { replace: true });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [code, navigate, STEP_KEY]);

  useEffect(() => { // tidy resume=1
    const url = new URL(window.location.href);
    if (url.searchParams.get('resume') === '1') { url.searchParams.delete('resume'); window.history.replaceState({}, '', url.toString()); }
  }, []);

  // guard ScheduleHoursEditor to avoid setState-during-render warning
  const [hoursEditorReady, setHoursEditorReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHoursEditorReady(true), 0); return () => clearTimeout(t); }, []);

  const StepNav = () => {
    const total = STEPS.length;
    return (
      <div className="border-t" style={{ borderColor: UI.cardBorder }}>
        <div className="px-6 py-4 text-center text-sm text-neutral-600">
          <div className="font-medium">Step {Math.min(step + 1, total)} of {total}</div>
          {organizationName && <div className="mt-1">for <span className="font-semibold">{organizationName}</span></div>}
        </div>
      </div>
    );
  };

  const subcopy = useMemo(() => {
    switch (STEPS[step]) {
      case 'account': return 'Create your login with the invited email to track onboarding progress.';
      case 'org_name': return 'Tell us your business name and industry. This shows on invoices and Stripe.';
      case 'phone': return 'Add a phone number customers can reach you at.';
      case 'address': return 'Where is your business based? This appears on receipts.';
      case 'kyc': return 'We’ll send you to Stripe to securely verify your business (destination charges).';
      case 'hours': return 'Add your business hours so customers know when you’re available.';
      case 'org_stub': return 'Roughly how many customers do you expect to serve monthly?';
      case 'billing': return 'Add a payment method and start your platform subscription. You can also do this later.';
      case 'enable_quotes': return 'Decide whether to allow quotes for your services (you can change this later in Settings).';
      default: return '';
    }
  }, [step, organizationName]);

  const nextFromAccount = async () => {
    const email = String(inviteEmail || '').trim();
    if (!email || !code) {
      setCtxError('Invite link expired or opened in a new tab. Reopen from your invite email.');
      return;
    }
    const pw = String(accountPassword || '');
    const strong = pw.length >= 12 &&
      /[a-z]/.test(pw) && /[A-Z]/.test(pw) &&
      /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
    if (!strong) return showToast('Use at least 12 chars with upper, lower, number, and symbol.');
    if (submitting) return;
    setSubmitting(true);
    persistCtx();
    try {
      const traceId = newTraceId();
      const payload = buildPayload({
        password: pw,
        create_stripe_link: false,
      });
      const acceptRes = await debugFetch(traceId, `${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('[http] accept', { traceId, status: acceptRes.res.status, ok: acceptRes.res.ok });
      if (!acceptRes.res.ok) {
        showToast(acceptRes.data?.error || 'Could not create account');
        return;
      }
      const meRes = await debugFetch(traceId, '/api/auth/me', { method: 'GET' });
      if (!meRes.res.ok) {
        showToast('Session creation failed, please retry');
        return;
      }
      auth?.setProfile?.(meRes.data || null);
      console.log('[onboard] auth set', { traceId, userId: meRes.data?.user?.id, role: meRes.data?.user?.role, orgId: meRes.data?.user?.organization_id });
      setStep((s) => s + 1);
    } catch (e) {
      console.error('Create account failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not create account');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const nextFromOrgName = () => {
    if (!String(organizationName || '').trim()) return showToast('Enter your company/organization name');
    setStep((s) => s + 1);
  };
  const nextFromPhone = () => {
    const phoneRe = /^\+?[\d\s().-]{10,}$/;
    if (!phoneRe.test(String(phoneNumber || '').trim())) return showToast('Enter a valid phone number');
    setStep((s) => s + 1);
  };
  const nextFromAddress = () => {
    const z = String(zip || '').trim();
    const c = String(city || '').trim();
    const s = String(state || '').trim().toUpperCase();
    const st = String(street || '').trim();
    if (!st) return showToast('Enter your street address');
    if (!c) return showToast('Enter your city');
    if (!/^[A-Za-z]{2}$/.test(s)) return showToast('Use 2-letter state code (e.g., NC)');
    if (!/^\d{5}$/.test(z)) return showToast('Enter a valid 5-digit ZIP');
    setStep((sPrev) => sPrev + 1);
  };

  const startStripeKyc = async () => {
    persistCtx();
    try { sessionStorage.setItem('ownerOnboard:resumeAfterStripe', '1'); } catch {}
    try { sessionStorage.setItem('postAuth:next', `/admin/owner-onboard/${encodeURIComponent(code)}`); } catch {}
    try { const hoursIdx = STEPS.indexOf('hours'); if (hoursIdx >= 0) sessionStorage.setItem(STEP_KEY, String(hoursIdx)); } catch {}
    setSubmitting(true);
    try {
      const traceId = newTraceId();
      const payload = buildPayload({
        enable_quotes: !!enableQuotes,
        business_hours: normalizeBusinessHours(businessHours),
        estimated_customers: estimatedCustomers === '' ? null : Number(estimatedCustomers),
        create_stripe_link: true,
        password: accountPassword || undefined,
      });
      const acceptRes = await debugFetch(traceId, `${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('[http] accept', { traceId, status: acceptRes.res.status, ok: acceptRes.res.ok });
      if (!acceptRes.res.ok) {
        showToast(acceptRes.data?.error || 'Failed to start Stripe onboarding');
        return;
      }

      const meRes = await debugFetch(traceId, '/api/auth/me', { method: 'GET' });
      if (!meRes.res.ok) {
        showToast('Session creation failed. Please retry.');
        return;
      }
      auth?.setProfile?.(meRes.data || null);
      console.log('[onboard] auth set', {
        traceId,
        userId: meRes.data?.user?.id,
        role: meRes.data?.user?.role,
        orgId: meRes.data?.user?.organization_id,
      });

      const punchRes = await debugFetch(traceId, `${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}/punchout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!punchRes.res.ok) {
        showToast(punchRes.data?.error || 'Could not finish onboarding');
        return;
      }
      const acceptBody = punchRes.data || {};
      const onboardingUrl =
        acceptBody?.stripe?.onboarding_url ||
        acceptBody?.stripe?.onboardingUrl ||
        acceptBody?.onboarding_url ||
        acceptBody?.stripe_onboarding_url ||
        null;
      const accountId =
        acceptBody?.stripe?.account_id ||
        acceptBody?.stripe?.accountId ||
        acceptBody?.organization?.stripe_account_id ||
        null;
      console.log('[punchout] stripe fields', { traceId, hasUrl: !!onboardingUrl, accountId, keys: Object.keys(acceptBody || {}) });
      if (onboardingUrl) {
        console.log('[onboard] redirect', { traceId, url: onboardingUrl });
        window.location.assign(onboardingUrl);
      } else {
        console.error('Punchout missing onboarding_url', { keys: Object.keys(acceptBody || {}), stripe: acceptBody?.stripe });
        showToast('Stripe onboarding link missing (create_stripe_link=true?)');
      }
    } catch (e) {
      console.error('Start Stripe onboarding failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Failed to start Stripe onboarding');
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  const saveHoursAndNext = async () => {
    if (submitting) return;
    setSubmitting(true);
    const normalizedHours = normalizeBusinessHours(businessHours);
    setBusinessHours(normalizedHours); // ensure state reflects normalized values
    persistCtx();
    console.log('[onboard] saveHours start', { code, businessHours: normalizedHours });
    try {
      await axios.patch(`${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}`, { business_hours: normalizedHours }, AXIOS_OPTS);
      console.log('[onboard] saveHours success');
      setStep((s) => s + 1); // now advances to org_stub (since service_area was removed)
    } catch (e) {
      console.error('Save hours failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not save hours (will retry later)');
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  const saveEstimateAndNext = async () => {
    const n = estimatedCustomers === '' ? null : Number(estimatedCustomers);
    if (n === null || Number.isNaN(n) || n < 0) return showToast('Enter a non-negative number');
    if (submitting) return;
    const normalizedHours = normalizeBusinessHours(businessHours);
    setBusinessHours(normalizedHours);
    persistCtx();
    setSubmitting(true);
    console.log('[onboard] saveEstimate start', { code, estimated: n });
    try {
      await axios.patch(`${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}`, { estimated_customers: n }, AXIOS_OPTS);
      console.log('[onboard] saveEstimate success');
      setStep((s) => s + 1);
    } catch (e) {
      console.error('Save estimate failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not save estimate (will retry later)');
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  };

  const saveQuotesAndFinish = async () => {
    setSubmitting(true);
    try {
      await axios.patch(
        `${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}`,
        { enable_quotes: !!enableQuotes },
        AXIOS_OPTS
      );
    } catch (e) {
      console.error('Save enable_quotes failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not save quotes setting');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep((s) => s + 1);
  };

  const finalizeAndExit = async () => {
    persistCtx();
    setSubmitting(true);
    const redirectPath = '/app/admin/service-types?onboard=1';
    const clearBreadcrumbs = () => {
      try {
        sessionStorage.removeItem('ownerOnboard:ctx');
        sessionStorage.removeItem('ownerOnboard:resumeAfterStripe');
        sessionStorage.removeItem('postAuth:next');
        sessionStorage.removeItem(STEP_KEY);
      } catch {}
    };
    try {
      const payload = buildPayload({
        completed: true,
        enable_quotes: !!enableQuotes,
        business_hours: normalizeBusinessHours(businessHours),
        estimated_customers: estimatedCustomers === '' ? null : Number(estimatedCustomers),
      });
      const res = await fetch(`${API_BASE}/public/owner-onboard/${encodeURIComponent(code)}/punchout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        showToast('Please complete Step 0 (Create account) first.');
        return;
      }
      if (res.status === 403) {
        showToast('Owner access required.');
        return;
      }
      if (!res.ok) {
        console.error('Punchout failed:', data);
        showToast(data?.error || 'Could not finish onboarding');
        return;
      }
      clearBreadcrumbs();
      const url = data?.onboarding_url || data?.stripe_onboarding_url;
      if (url) {
        window.location.assign(url);
      } else {
        console.error('Punchout missing onboarding_url', data);
        showToast('Could not start Stripe onboarding. Please try again.');
      }
    } catch (e) {
      console.error('Finalize/punchout failed:', e?.response?.data || e);
      showToast(e?.response?.data?.error || 'Could not finish onboarding');
    } finally { if (mountedRef.current) setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: UI.pageBg }}>
        <div className="text-neutral-600">Loading…</div>
      </div>
    );
  }

  const currentUsers = pricingPreview?.actual_users ?? 1; // first-run fallback
  const currentAmount = fmtUSD(calcMonthlyCents(currentUsers));
  const estUsers = estimatedCustomers !== '' ? Number(estimatedCustomers) : (pricingPreview?.estimated_users ?? 0);
  const estAmount = fmtUSD(calcMonthlyCents(estUsers));

  return (
    <div className="min-h-screen w-full" style={{ background: UI.pageBg }}>
      <style>{`
        .hero-curve { border-bottom-left-radius: 28px; border-bottom-right-radius: 28px; }
        @media (min-width: 640px) { .hero-curve { border-bottom-left-radius: 35vw 8vh; border-bottom-right-radius: 35vw 8vh; } }
        @media (min-width: 1024px) { .hero-curve { border-bottom-left-radius: 50vw 12vh; border-bottom-right-radius: 50vw 12vh; } }
      `}</style>

      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>{toast.msg}</Toast>

      {/* Top hero */}
      <div className="w-full hero-curve" style={{ background: `linear-gradient(180deg, ${UI.heroTop} 0%, ${UI.heroBottom} 100%)` }}>
        <div className="max-w-xl mx-auto px-4 pt-10 pb-20 text-center">
          <LogoMark className="h-10 w-auto mx-auto text-[#2E2E2E]" />
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight" style={{ color: UI.textDark }}>Set up your business</h1>
        </div>
      </div>

      {/* Floating white form card */}
      <div className="max-w-xl mx-auto px-4 -mt-12 pb-10 overflow-visible">
        <div className="rounded-2xl shadow-xl border bg-white overflow-visible" style={{ borderColor: UI.cardBorder }}>
          <div className="px-6 pt-6 pb-2 text-center">
            <h2 className="text-3xl font-extrabold" style={{ color: UI.textDark }}>Organization details</h2>
            <p className="mt-2 text-sm text-neutral-500">{subcopy}</p>
            {ctxError ? (
              <div className="mt-3 text-sm text-rose-600">
                {ctxError}
              </div>
            ) : null}
          </div>

          {/* Wrap steps inside a real <form> */}
          <form
            autoComplete="on"
            name="owner-onboard"
            className="px-5 pb-2 overflow-visible"
            onSubmit={(e) => {
              e.preventDefault();
              if (STEPS[step] === 'account') return nextFromAccount();
              if (STEPS[step] === 'org_name') return nextFromOrgName();
              if (STEPS[step] === 'phone') return nextFromPhone();
              if (STEPS[step] === 'address') return nextFromAddress();
            }}
          >
            {/* STEP 0: Create Account */}
            {STEPS[step] === 'account' && (
              <Card
                title="Create account"
                subtitle="Use your invited email to create your password."
                actions={
                  <button
                    className="w-full px-5 py-3 rounded-full font-semibold shadow-sm transition-colors"
                    style={{ background: UI.heroBottom, color: '#111111' }}
                    onClick={nextFromAccount}
                    type="button"
                    disabled={submitting}
                    onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                    onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                  >
                    {submitting ? 'Creating…' : 'Continue'}
                  </button>
                }
              >
                <div className="grid gap-3">
                  <Field label="Email">
                    <input
                      className="border p-3 rounded-full w-full bg-neutral-50 text-neutral-600"
                      value={inviteEmail}
                      readOnly
                      style={{ borderColor: UI.cardBorder }}
                    />
                  </Field>
                  <Field label="Password" hint="Use at least 12 characters with uppercase, lowercase, a number, and a symbol.">
                    <input
                      className="border p-3 rounded-full w-full"
                      type="password"
                      autoComplete="new-password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      style={{ borderColor: UI.cardBorder }}
                    />
                  </Field>
                  {!inviteEmail || !code ? (
                    <div className="text-sm text-rose-600">
                      Invite link missing or expired. Please reopen from your invite email.
                    </div>
                  ) : null}
                </div>
              </Card>
            )}

            {/* STEP 1: Organization name + Industry */}
            {STEPS[step] === 'org_name' && (
              <Card
                title="Company"
                subtitle="Tell us who you are."
                actions={
                  <button
                    className="w-full px-5 py-3 rounded-full font-semibold shadow-sm transition-colors"
                    style={{ background: UI.heroBottom, color: '#111111' }}
                    onClick={nextFromOrgName}
                    type="button"
                    onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)}
                    onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}
                  >
                    Continue
                  </button>
                }
              >
                <div className="grid gap-3">
                  <Field label="Organization / Company name">
                    <input
                      className="border p-3 rounded-full w-full"
                      placeholder="Acme Lawn &amp; Home"
                      value={organizationName}
                      onChange={e => setOrganizationName(e.target.value)}
                      autoComplete="organization"
                      name="organization"
                      style={{ borderColor: UI.cardBorder }}
                      autoFocus
                    />
                  </Field>
                  <Field label="Industry">
                    <select
                      className="border p-3 rounded-full w-full bg-white"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      name="industry"
                      style={{ borderColor: UI.cardBorder }}
                    >
                      <option value="">-- Select Industry --</option>
                      {industryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </Field>
                </div>
              </Card>
            )}

            {/* STEP 2: Phone */}
            {STEPS[step] === 'phone' && (
              <Card
                title="Phone number"
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium" style={{ borderColor: UI.cardBorder }} onClick={() => setStep((s) => Math.max(0, s - 1))} type="button">Back</button>
                    <button className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors" style={{ background: UI.heroBottom, color: '#111111' }} onClick={nextFromPhone} type="button" onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)} onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}>Continue</button>
                  </>
                }
              >
                <Field label="Primary business phone">
                  <input
                    className="border p-3 rounded-full w-full"
                    placeholder="(555) 555-5555"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && nextFromPhone()}
                    autoComplete="tel"
                    inputMode="tel"
                    name="tel"
                    style={{ borderColor: UI.cardBorder }}
                    autoFocus
                  />
                </Field>
              </Card>
            )}

            {/* STEP 3: Address */}
            {STEPS[step] === 'address' && (
              <Card
                title="Address"
                subtitle="Shown on receipts and used for Stripe verification."
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium" style={{ borderColor: UI.cardBorder }} onClick={() => setStep((s) => Math.max(0, s - 1))} type="button">Back</button>
                    <button className="rounded-full px-5 py-3 font-semibold shadow-sm transition-colors" style={{ background: UI.heroBottom, color: '#111111' }} onClick={nextFromAddress} type="button" onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)} onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}>Continue</button>
                  </>
                }
              >
                <input type="text" hidden readOnly value="United States" name="country" autoComplete="section-biz country" />
                <div className="grid gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Street</label>
                    <AddressAutocomplete
                      value={{ street, city, state, zip }}
                      onChange={(address) => {
                        setStreet(address.street || '');
                        setCity(address.city || '');
                        setStateVal((address.state || '').toUpperCase());
                        // Extract just the 5-digit ZIP in case Google returns ZIP+4 format
                        setZip((address.zip || '').replace(/\D/g, '').slice(0, 5));
                      }}
                      placeholder="Start typing your address..."
                      className="border p-3 rounded-full w-full"
                      countryCode="us"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Start typing to search, or enter manually below</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-11 gap-3">
                    <div className="sm:col-span-6">
                      <Field label="City">
                        <input
                          className="border p-3 rounded-full w-full"
                          value={city}
                          onChange={e => { setCity(e.target.value); setCityDirty(true); }}
                          autoComplete="section-biz address-level2"
                          name="address-level2"
                          style={{ borderColor: UI.cardBorder }}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-2">
                      <Field label="State">
                        <input
                          className="border p-3 rounded-full w-full uppercase"
                          maxLength={2}
                          value={state}
                          onChange={e => { setStateVal(e.target.value.toUpperCase()); setStateDirty(true); }}
                          autoComplete="section-biz address-level1"
                          name="address-level1"
                          style={{ borderColor: UI.cardBorder }}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-3">
                      <Field label="ZIP">
                        <input
                          className="border p-3 rounded-full w-full"
                          inputMode="numeric"
                          value={zip}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0,5);
                            setZip(v);
                            setCityDirty(false); setStateDirty(false);
                          }}
                          onBlur={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0,5);
                            setZip(v);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = e.currentTarget.value.replace(/\D/g, '').slice(0,5);
                              setZip(v);
                            }
                          }}
                          autoComplete="section-biz postal-code"
                          name="postal-code"
                          style={{ borderColor: UI.cardBorder }}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 4: Business Hours */}
            {STEPS[step] === 'hours' && (
              <Card
                title="Business hours"
                subtitle="Let customers know when you’re open."
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium" style={{ borderColor: UI.cardBorder }} onClick={() => setStep((s) => Math.max(0, s - 1))} type="button">Back</button>
                    <button className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`} style={{ background: UI.heroBottom, color: '#111111' }} onClick={saveHoursAndNext} disabled={submitting} type="button" onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)} onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}>{submitting ? 'Saving…' : 'Continue'}</button>
                  </>
                }
              >
                <div className="md:overflow-x-auto overflow-visible">
                  {hoursEditorReady && (
                    <ScheduleHoursEditor value={businessHours} onChange={setBusinessHours} />
                  )}
                </div>
              </Card>
            )}

            {/* STEP 5: Estimated customers */}
            {STEPS[step] === 'org_stub' && (
              <Card
                title="Estimated monthly customers"
                subtitle="This helps us show an estimated subscription amount. You can change this later."
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium" style={{ borderColor: UI.cardBorder }} onClick={() => setStep((s) => Math.max(0, s - 1))} type="button">Back</button>
                    <button className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`} style={{ background: UI.heroBottom, color: '#111111' }} onClick={saveEstimateAndNext} disabled={submitting} type="button" onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)} onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}>{submitting ? 'Saving…' : 'Continue'}</button>
                  </>
                }
              >
                <div className="grid gap-3">
                  <Field label="Estimated number of customers per month">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="border p-3 rounded-full w-full"
                      placeholder="e.g., 25"
                      value={estimatedCustomers}
                      onChange={(e) => setEstimatedCustomers(e.target.value.replace(/[^\d]/g, ''))}
                      style={{ borderColor: UI.cardBorder }}
                      autoFocus
                    />
                  </Field>
                  <div className="text-xs text-neutral-500">
                    We’ll use this only for an estimate. Your actual charge is based on your real active users each month.
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 6: Billing (optional) */}
            {STEPS[step] === 'billing' && (
              <Card
                title="Billing (optional)"
                subtitle="Add a payment method and start your platform subscription. You can also do this later from Settings → Organization."
                actions={
                  <button
                    type="button"
                    className={`rounded-full border px-5 py-3 font-medium ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                    style={{ borderColor: UI.cardBorder }}
                    onClick={() => setStep((s) => s + 1)}
                    disabled={submitting}
                  >
                    {submitting ? 'Continuing…' : 'Continue'}
                  </button>
                }
              >
                <div className="mb-4 grid gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Current amount (based on {currentUsers} active user{currentUsers === 1 ? '' : 's'})</span>
                    <span className="font-medium">{currentAmount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Estimated monthly amount (based on {estUsers} customers)</span>
                    <span className="font-medium">{estAmount}</span>
                  </div>
                </div>

                {/* PlatformBillingPanel v2.8.5 ignores calls when no owner token is present */}
                <PlatformBillingPanel authHeader={authHeader} hideDueDay seedEstimateCustomers={estUsers} />

                <div className="mt-4 text-xs text-neutral-600 leading-relaxed">
                  <strong>Pricing notice:</strong> Your monthly SaaS fee is based on your organization’s <strong>active users</strong>. Tiers:
                  $3/user (0–50), $2 (51–150), $1 (151–300), $0.50 (300+), capped at <strong>$349/month</strong>. The estimated amount shown here is for convenience only; the actual monthly charge is computed from your real active users for each period and may vary.
                </div>
              </Card>
            )}

            {/* STEP 7: Enable quotes */}
            {STEPS[step] === 'enable_quotes' && (
              <Card
                title="Enable Quotes"
                subtitle="Allow your team to attach quote templates to services so customers can receive structured quotes."
                actions={
                  <>
                    <button
                      type="button"
                      className="rounded-full border px-5 py-3 font-medium"
                      style={{ borderColor: UI.cardBorder }}
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={{ background: UI.heroBottom, color: '#111111' }}
                      onClick={saveQuotesAndFinish}
                      disabled={submitting}
                    >
                      {submitting ? 'Saving…' : 'Continue to Stripe'}
                    </button>
                  </>
                }
              >
                <div className="space-y-3 text-sm text-neutral-700">
                  <p>Quotes let you attach structured templates to your services so customers can request or accept scoped work with clear line items.</p>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enableQuotes}
                      onChange={(e) => setEnableQuotes(e.target.checked)}
                    />
                    <span className="font-medium text-neutral-900">Enable quotes for this organization</span>
                  </label>
                  <div className="text-xs text-neutral-500">
                    You can change this anytime from Settings → Quotes.
                  </div>
                </div>
              </Card>
            )}

            {/* STEP 8: KYC/KYB via Stripe */}
            {STEPS[step] === 'kyc' && (
              <Card
                title="Verify your business"
                subtitle="We’ll send you to Stripe Connect to complete verification (destination charges)."
                actions={
                  <>
                    <button className="rounded-full border px-5 py-3 font-medium" style={{ borderColor: UI.cardBorder }} onClick={() => setStep((s) => Math.max(0, s - 1))} type="button">Back</button>
                    <button className={`rounded-full px-5 py-3 font-semibold shadow-sm ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`} style={{ background: UI.heroBottom, color: '#111111' }} onClick={startStripeKyc} disabled={submitting} type="button" onMouseEnter={(e)=> (e.currentTarget.style.background = UI.btnHover)} onMouseLeave={(e)=> (e.currentTarget.style.background = UI.heroBottom)}>{submitting ? 'Starting…' : 'Continue to Stripe'}</button>
                  </>
                }
              >
                <div className="space-y-3 text-sm text-neutral-700">
                  <p>Stripe will guide you through business info, owners, and bank details. This keeps payments secure and compliant.</p>
                  <p>You can come back here after Stripe to finish setup.</p>
                </div>
              </Card>
            )}
          </form>

          {/* Step nav */}
          <StepNav />

          {/* Bottom helper link */}
          <div className="px-6 pb-6 pt-2 text-center">
            <p className="text-sm text-neutral-700">
              Need to finish later? You can return to this page from your invite link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

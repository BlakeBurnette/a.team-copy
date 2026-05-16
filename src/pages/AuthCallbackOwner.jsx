import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ✅ Only treat as an owner-onboard path if it already has a code segment
const isOwnerOnboardPathWithCode = (p) =>
  typeof p === 'string' && /^\/admin\/owner-onboard\/[^/?#]+/.test(p);

const sanitize = (next) =>
  !next || next === '/login' || next.startsWith('/login?') ? '/app' : next;

export default function AuthCallbackOwner() {
  const { user } = useAuth() || {};

  const { search } = useLocation();
  const navigate = useNavigate();

  const [errMsg, setErrMsg] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      const params = new URLSearchParams(search);
      const hasAuthParams = params.has('code') && params.has('state');
      const oauthErr = params.get('error');

      // Resolve an email from user/storage
      async function resolveEmail() {
        if (user?.email) return user.email;
        const read = (k) => {
          try { return sessionStorage.getItem(k) || localStorage.getItem(k) || ''; } catch { return ''; }
        };
        const keys = ['auth:emailHint', 'onboarding:email', 'bnk:onboard_email', 'signup:ctx'];
        for (const k of keys) {
          const v = read(k);
          if (!v) continue;
          if (k === 'signup:ctx') {
            try { const ctx = JSON.parse(v); if (ctx?.email) return ctx.email; } catch {}
          } else {
            return v;
          }
        }
        return '';
      }

      try {
        if (oauthErr) setErrMsg(params.get('error_description') || 'Login failed.');

        // Compute intended next path (may be /admin/owner-onboard)
        const urlNext      = params.get('next') || '';
        const storedNext   = (() => { try { return sessionStorage.getItem('postAuth:next') || ''; } catch { return ''; }})();
        const explicitNext = sanitize(urlNext || storedNext);

        // 4) If the next path ALREADY includes a code, honor it immediately
        if (isOwnerOnboardPathWithCode(explicitNext)) {
          try {
            ['auth:returnTo','postAuth:next','owner:started','owner:intent','lead:company','postAuth:needApiToken']
              .forEach((k) => sessionStorage.removeItem(k));
          } catch {}
          navigate(explicitNext, { replace: true });
          return;
        }

        // 5) Otherwise, bootstrap a code and route there
        let email = '';
        for (let i = 0; i < 6 && !email; i++) {
          email = (await resolveEmail())?.trim() || '';
          if (!email) await sleep(75 + i * 50);
        }

        let code = null;
        const payload = {
          email: email || undefined,
          company: (sessionStorage.getItem('lead:company') || '').trim() || undefined,
        };

        try {
          const { data } = await axios.post('/api/public/owner-onboard/bootstrap', payload, { withCredentials: true });
          code = data?.code || null;
        } catch (e) {
          console.warn('[AuthCallbackOwner] POST bootstrap error:', e?.response?.data || e?.message || e);
        }

        if (!code) {
          try {
            const { data } = await axios.get('/api/public/owner-onboard/bootstrap', { params: payload, withCredentials: true });
            code = data?.code || null;
          } catch (e) {
            console.warn('[AuthCallbackOwner] GET bootstrap error:', e?.response?.data || e?.message || e);
          }
        }

        // 6) Cleanup and route
        try {
          ['auth:returnTo','postAuth:next','owner:started','owner:intent','lead:company','postAuth:needApiToken']
            .forEach((k) => sessionStorage.removeItem(k));
        } catch {}

        if (code) {
          navigate(`/admin/owner-onboard/${encodeURIComponent(code)}`, { replace: true });
          return;
        }

        // Fallback safe landing
        navigate(explicitNext || '/app', { replace: true });
      } catch (e) {
        console.error('[AuthCallbackOwner] callback flow error', e);
        setErrMsg('Owner onboarding failed.');
        navigate('/app', { replace: true });
      }
    })();
  }, [search, navigate, user]);

  return <div className="p-6 text-gray-600">{errMsg || 'Preparing owner onboarding…'}</div>;
}

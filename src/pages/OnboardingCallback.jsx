// src/pages/OnboardingCallback.jsx
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OnboardingCallback() {
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
      const nextParam = params.get('next'); // may be "/signup/:code/pay"
      const oauthErr = params.get('error');

      let appReturnTo;

      try {
        if (oauthErr) {
          setErrMsg(params.get('error_description') || 'Login failed.');
        }

        // Pull stashed target if missing
        if (!appReturnTo) {
          try {
            const stash = sessionStorage.getItem('auth:returnTo');
            if (stash) appReturnTo = stash;
          } catch {}
        }

        // Strong hint from URL ?next=
        if (!appReturnTo && nextParam) appReturnTo = nextParam;

        // If we came from signup-pay, prefer that if user has no PM yet
        let wasSignupPay = false;
        try { wasSignupPay = sessionStorage.getItem('auth:wasSignupPay') === '1'; } catch {}

        const extractCode = (path) => {
          if (!path) return null;
          const m = path.match(/\/signup\/([^/]+)\/pay$/);
          return m ? m[1] : null;
        };
        let signupCode =
          extractCode(appReturnTo) ||
          extractCode(nextParam) ||
          (() => {
            try {
              const ctx = JSON.parse(sessionStorage.getItem('signup:ctx') || '{}');
              return ctx?.code || null;
            } catch { return null; }
          })();

        if (wasSignupPay && signupCode) {
          try {
            const { data } = await axios.get('/api/users/billing/status', { withCredentials: true });
            const hasPm = !!data?.has_pm;
            if (!hasPm) {
              appReturnTo = `/signup/${signupCode}/pay`;
            } else if (!appReturnTo || appReturnTo === '/' || appReturnTo === '/app') {
              appReturnTo = '/app';
            }
          } catch (e) {
            // If status fails (rare), still bias to pay step for safety
            appReturnTo = `/signup/${signupCode}/pay`;
          }
        }

        // Cleanup stashes (keep signup:ctx for the pay page)
        try {
          sessionStorage.removeItem('auth:returnTo');
          sessionStorage.removeItem('auth:wasSignupPay');
        } catch {}

        // Navigate
        const next = appReturnTo || '/app';
        navigate(user ? next : `/login?next=${encodeURIComponent(next)}`, { replace: true });
      } catch (e) {
        console.error('[OnboardingCallback] callback flow error', e);
        setErrMsg('Sign-in processing failed.');
        navigate('/login', { replace: true });
      }
    })();
  }, [search, navigate, user]);

  return <div className="p-6 text-gray-600">{errMsg || 'Finishing sign-in…'}</div>;
}

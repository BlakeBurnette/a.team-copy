import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';
import axios from 'axios';

const PKCE_VERIFIER_KEY = 'pkce_verifier';
const OAUTH_STATE_KEY = 'oauth_state';
const RETURN_PATH_KEY = 'sso_return_path';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const STORAGE_KEY = 'auth:profile:v3';

/**
 * AuthCallback — handles BOTH flows that land on /auth/callback:
 *
 *   1. Full PKCE OAuth redirect (code + state) — user signed in via /login.
 *      Exchanges code for access + refresh tokens at /oauth/token.
 *
 *   2. Magic-link callback (code only, no state) — user clicked an email link
 *      from hive-identity after paying on thepayhive.com/listings. The code is
 *      a single-use token-exchange code. Posts to /api/auth/token/exchange,
 *      gets a session_token, then resolves the user via /api/sso/validate-session.
 *      Vendors (signup_role=vendor) are routed to /onboarding.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, refreshMe, setProfile } = useAuth() || {};

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || `Authentication error: ${error}`);
      clearPKCEData();
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Invalid callback. Missing authorization code.');
      clearPKCEData();
      return;
    }

    if (code && state) {
      runPkceExchange({ code, state, navigate, setTokens, refreshMe, setStatus, setMessage });
    } else {
      runMagicLinkExchange({ code, navigate, setTokens, setProfile, refreshMe, setStatus, setMessage });
    }
  }, [searchParams, navigate, setTokens, refreshMe, setProfile]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  if (status === 'loading') {
    return (
      <AuthShell title="Completing sign in" subtitle="Please wait...">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell title="Sign in failed" subtitle="There was a problem completing your sign in.">
        <div className="space-y-4">
          <StatusCallout tone="error">{message}</StatusCallout>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600"
          >
            Back to sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Success" subtitle="Redirecting...">
      <div className="flex items-center justify-center py-8">
        <div className="text-green-600">Signed in successfully. Redirecting...</div>
      </div>
    </AuthShell>
  );
}

// ─── PKCE OAuth flow (code + state) ─────────────────────────────────────────

async function runPkceExchange({ code, state, navigate, setTokens, refreshMe, setStatus, setMessage }) {
  const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const storedVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const returnPath = sessionStorage.getItem(RETURN_PATH_KEY) || '/app';

  if (!storedState || state !== storedState) {
    setStatus('error');
    setMessage('Invalid state parameter. Please try signing in again.');
    clearPKCEData();
    return;
  }
  if (!storedVerifier) {
    setStatus('error');
    setMessage('Session expired. Please try signing in again.');
    clearPKCEData();
    return;
  }

  try {
    const tokenResp = await axios.post(
      `${config.identityUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.ssoClientId || 'payhive',
        code,
        code_verifier: storedVerifier,
        redirect_uri: `${window.location.origin}/auth/callback`,
      }),
      { withCredentials: false },
    );

    const { access_token, refresh_token } = tokenResp.data;
    if (!access_token) throw new Error('No access token in response');

    setTokens?.(access_token, refresh_token);
    setStatus('success');
    clearPKCEData();

    try { await refreshMe?.({ force: true }); } catch {}

    navigate(sanitizeRedirect(returnPath), { replace: true });
  } catch (err) {
    console.error('[AuthCallback] PKCE exchange error:', err);
    const errMsg = err?.response?.data?.error_description
      || err?.response?.data?.message
      || err?.message
      || 'Unable to complete sign in. Please try again.';
    setStatus('error');
    setMessage(errMsg);
    clearPKCEData();
  }
}

// ─── Magic-link flow (code only, no state) ──────────────────────────────────

async function runMagicLinkExchange({ code, navigate, setTokens, setProfile, refreshMe, setStatus, setMessage }) {
  try {
    // Exchange the magic-link code for session + refresh tokens
    const exchangeResp = await axios.post(
      `${config.identityUrl}/api/auth/token/exchange`,
      { code },
      { withCredentials: false },
    );

    const { session_token, refresh_token } = exchangeResp.data || {};
    if (!session_token) throw new Error('Exchange returned no session token');

    // Store the session token where the rest of the app expects a bearer token.
    // Also persist it directly to localStorage so axios interceptors pick it up
    // on the very next request (setTokens is stable across refs).
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, session_token);
      if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
    } catch {}
    setTokens?.(session_token, refresh_token);

    // Resolve the user via validate-session (accepts session tokens; /oauth/userinfo
    // only accepts OAuth access tokens).
    const validateResp = await axios.post(
      `${config.identityUrl}/api/sso/validate-session`,
      { session_token },
      { withCredentials: false },
    );

    const { valid, user: sessionUser } = validateResp.data || {};
    if (!valid || !sessionUser) throw new Error('Session token rejected by hive-identity');

    // Normalize to the shape AuthContext expects (same fields it pulls from
    // /oauth/userinfo in the PKCE path).
    const normalized = {
      id: sessionUser.global_user_id || String(sessionUser.user_id || ''),
      global_user_id: sessionUser.global_user_id,
      user_id: sessionUser.user_id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role || (Array.isArray(sessionUser.roles) && sessionUser.roles[0]) || 'user',
      roles: Array.isArray(sessionUser.roles) ? sessionUser.roles : [],
      permissions: Array.isArray(sessionUser.permissions) ? sessionUser.permissions : [],
      is_admin: !!sessionUser.is_superadmin,
      isAdmin: !!sessionUser.is_superadmin,
      organization_id: sessionUser.organization_id,
      org_id: sessionUser.global_org_id || (sessionUser.organization_id ? String(sessionUser.organization_id) : null),
      organization: sessionUser.organization_name ? {
        id: sessionUser.organization_id,
        global_org_id: sessionUser.global_org_id,
        name: sessionUser.organization_name,
      } : undefined,
      allowed_apps: Array.isArray(sessionUser.allowed_apps) ? sessionUser.allowed_apps : [],
      signup_role: sessionUser.signup_role,
    };

    // Persist immediately so routing doesn't race the profile fetch
    setProfile?.(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {}

    setStatus('success');
    clearPKCEData();

    try { await refreshMe?.({ force: true }); } catch {}

    const destination = pickPostLoginDestination(normalized);
    navigate(destination, { replace: true });
  } catch (err) {
    console.error('[AuthCallback] Magic-link exchange error:', err);
    const errMsg = err?.response?.data?.error_description
      || err?.response?.data?.error
      || err?.response?.data?.message
      || err?.message
      || 'Sign-in link invalid or already used.';
    setStatus('error');
    setMessage(errMsg);
    clearPKCEData();
  }
}

function pickPostLoginDestination(user) {
  const returnPath = sanitizeRedirect(sessionStorage.getItem(RETURN_PATH_KEY) || '');
  const signupRole = user?.signup_role || '';
  const roles = Array.isArray(user?.roles) ? user.roles.map((r) => String(r).toLowerCase()) : [];
  const isVendor = signupRole === 'vendor' || roles.includes('vendor');

  // Vendors who just paid + signed up go through vendor onboarding first
  if (isVendor) return '/onboarding';

  if (returnPath && returnPath !== '/app') return returnPath;
  return '/app';
}

function clearPKCEData() {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(RETURN_PATH_KEY);
}

function sanitizeRedirect(url) {
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) {
    if (url === '/login' || url.startsWith('/login?')) return '/app';
    return url;
  }
  return '';
}

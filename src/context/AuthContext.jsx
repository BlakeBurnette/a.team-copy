import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { traceHeaders } from '../lib/trace';
import config from '../config';

export const AuthContext = createContext(null);

const STORAGE_KEY = 'auth:profile:v3';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const normalizeRoles = (u) => {
  const list = [];
  if (Array.isArray(u?.roles)) list.push(...u.roles);
  if (u?.role && !list.includes(u.role)) list.push(u.role);
  return list;
};

const normalizePermissions = (u) => (Array.isArray(u?.permissions) ? u.permissions : []);

// ─── Token refresh (singleton promise to prevent concurrent refreshes) ──────

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error('No refresh token');

      const resp = await axios.post(
        `${config.identityUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: config.ssoClientId || 'payhive',
          refresh_token: refreshToken,
        }),
        { withCredentials: false }, // Don't send cookies for this request
      );

      const { access_token, refresh_token: newRefresh } = resp.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      return access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Auth Provider ──────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userRef = useRef(null);
  const inFlightRef = useRef(null);
  const prefetchRef = useRef(false);
  const lastFetchRef = useRef(0);

  // ── Axios interceptors: Bearer token + 401 refresh ──────────────────────

  useEffect(() => {
    // Attach Bearer token to every request
    const reqId = axios.interceptors.request.use((cfg) => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${token}`;
      }
      return cfg;
    });

    // On 401: try refresh, then retry original request
    const resId = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (error?.response?.status === 401 && !originalRequest._retry) {
          // Don't try to refresh if we're on the auth callback or login page
          const isAuthPage = window.location.pathname.startsWith('/auth/') || window.location.pathname === '/login';
          if (isAuthPage) return Promise.reject(error);

          // Don't try to refresh for calls to hive-identity itself
          const reqUrl = originalRequest?.url || '';
          if (reqUrl.includes('/oauth/')) return Promise.reject(error);

          // Don't try to refresh if there's no refresh token
          const hasRefresh = !!localStorage.getItem(REFRESH_TOKEN_KEY);
          if (!hasRefresh) return Promise.reject(error);

          originalRequest._retry = true;
          try {
            const newToken = await refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(STORAGE_KEY);
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
    };
  }, []);

  // ── Rehydrate user from localStorage ──────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setUser(parsed);
          setRoles(normalizeRoles(parsed));
          setPermissions(normalizePermissions(parsed));
        }
      }
    } catch {}
  }, []);

  const persistUser = useCallback((next) => {
    const flat = next?.user
      ? {
          ...next.user,
          roles: next.roles || next.user.roles,
          permissions: next.permissions || next.user.permissions,
          organization: next.organization || next.user.organization,
          features: next.features || next.user.features,
        }
      : next;
    if (flat && !flat.organization && userRef.current?.organization) {
      flat.organization = userRef.current.organization;
    }
    if (flat && !flat.features && userRef.current?.features) {
      flat.features = userRef.current.features;
    }
    userRef.current = flat;
    setUser(flat);
    setRoles(normalizeRoles(flat));
    setPermissions(normalizePermissions(flat));
    try {
      if (flat) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flat));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  // ── Fetch user profile from payhive-api-rs ────────────────────────────────

  const refreshMe = useCallback(async (opts = {}) => {
    const { force = false } = opts || {};
    const now = Date.now();
    if (!force && userRef.current && now - lastFetchRef.current < 5000) {
      return userRef.current;
    }
    if (inFlightRef.current) return inFlightRef.current;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        // Check if we have an access token
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!token) {
          persistUser(null);
          setError(null);
          return null;
        }

        // Two token flavors live in ACCESS_TOKEN_KEY:
        //   1. OAuth access tokens from the PKCE flow → /oauth/userinfo
        //   2. Session tokens from the magic-link flow → /api/sso/validate-session
        // /oauth/userinfo 401s on session tokens, so fall back before giving up.
        let normalized = null;
        try {
          const { data } = await axios.get(`${config.identityUrl}/oauth/userinfo`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: false,
          });
          normalized = data ? {
            id: data.sub || data.id,
            global_user_id: data.sub,
            email: data.email,
            name: data.name,
            role: data.role || (data.roles && data.roles[0]) || 'user',
            roles: data.roles || [],
            permissions: data.permissions || [],
            is_admin: data.is_superadmin || false,
            isAdmin: data.is_superadmin || false,
            organization_id: data.organization_id,
            org_id: data.global_org_id,
            organization: data.organization_name ? {
              id: data.organization_id,
              global_org_id: data.global_org_id,
              name: data.organization_name,
            } : undefined,
            allowed_apps: data.allowed_apps || [],
            signup_role: data.signup_role,
          } : null;
        } catch (userinfoErr) {
          if (userinfoErr?.response?.status !== 401) throw userinfoErr;
          const { data } = await axios.post(
            `${config.identityUrl}/api/sso/validate-session`,
            { session_token: token },
            { withCredentials: false },
          );
          if (!data?.valid || !data?.user) throw userinfoErr;
          const u = data.user;
          normalized = {
            id: u.global_user_id || String(u.user_id || ''),
            global_user_id: u.global_user_id,
            user_id: u.user_id,
            email: u.email,
            name: u.name,
            role: u.role || (Array.isArray(u.roles) && u.roles[0]) || 'user',
            roles: Array.isArray(u.roles) ? u.roles : [],
            permissions: Array.isArray(u.permissions) ? u.permissions : [],
            is_admin: !!u.is_superadmin,
            isAdmin: !!u.is_superadmin,
            organization_id: u.organization_id,
            org_id: u.global_org_id || (u.organization_id ? String(u.organization_id) : null),
            organization: u.organization_name ? {
              id: u.organization_id,
              global_org_id: u.global_org_id,
              name: u.organization_name,
            } : undefined,
            allowed_apps: Array.isArray(u.allowed_apps) ? u.allowed_apps : [],
            signup_role: u.signup_role,
          };
        }

        lastFetchRef.current = Date.now();
        persistUser(normalized);
        setError(null);
        return normalized;
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401) {
          // Both userinfo + validate-session rejected the token. If we're
          // mid-auth-flow on /auth/* and AuthCallback just populated a user,
          // keep them — the bounce would be spurious.
          lastFetchRef.current = Date.now();
          if (!window.location.pathname.startsWith('/auth/')) {
            persistUser(null);
          }
          setError(null);
          return null;
        }
        persistUser(null);
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    };

    const p = run().finally(() => { inFlightRef.current = null; });
    inFlightRef.current = p;
    return p;
  }, [persistUser]);

  // ── Initial profile fetch ─────────────────────────────────────────────────

  useEffect(() => {
    // Don't prefetch on auth callback pages — token exchange hasn't happened yet
    const isCallback = window.location.pathname.startsWith('/auth/');
    if (isCallback) {
      setLoading(false);
      return;
    }
    if (prefetchRef.current) return;
    prefetchRef.current = true;

    const boot = async () => {
      // If localStorage already has a bearer, go straight to refreshMe —
      // it'll fetch the profile with that token.
      if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
        try { await refreshMe(); } catch {}
        return;
      }

      // No local bearer — try cross-subdomain SSO via the shared
      // hive_identity_session cookie at .thepayhive.com. If the user
      // signed in on another Hive SPA, the cookie is already there
      // and validate-session will hydrate us without any redirect.
      try {
        const { data } = await axios.post(
          `${config.identityUrl}/api/sso/validate-session`,
          {},
          { withCredentials: true },
        );
        if (data?.valid && data?.user && data?.session_token) {
          localStorage.setItem(ACCESS_TOKEN_KEY, data.session_token);
          const u = data.user;
          const normalized = {
            id: u.global_user_id || String(u.user_id || ''),
            global_user_id: u.global_user_id,
            user_id: u.user_id,
            email: u.email,
            name: u.name,
            role: u.role || (Array.isArray(u.roles) && u.roles[0]) || 'user',
            roles: Array.isArray(u.roles) ? u.roles : [],
            permissions: Array.isArray(u.permissions) ? u.permissions : [],
            is_admin: !!u.is_superadmin,
            isAdmin: !!u.is_superadmin,
            organization_id: u.organization_id,
            org_id: u.global_org_id || (u.organization_id ? String(u.organization_id) : null),
            organization: u.organization_name ? {
              id: u.organization_id,
              global_org_id: u.global_org_id,
              name: u.organization_name,
            } : undefined,
            allowed_apps: Array.isArray(u.allowed_apps) ? u.allowed_apps : [],
            signup_role: u.signup_role,
          };
          persistUser(normalized);
          setLoading(false);
          return;
        }
      } catch {
        // Cookie missing / invalid / CORS blocked — fall through to unauth
      }
      setLoading(false);
    };

    boot();
    return () => { prefetchRef.current = true; };
  }, [refreshMe, persistUser]);

  // ── Store tokens from OAuth callback ──────────────────────────────────────

  const setTokens = useCallback((accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }, []);

  // ── Login (redirect to hive-identity OAuth) ───────────────────────────────

  const login = useCallback(async (returnPath) => {
    // Generate PKCE pair
    const verifier = generateRandomString();
    const challenge = await sha256Base64Url(verifier);

    const state = generateRandomString();

    sessionStorage.setItem('pkce_verifier', verifier);
    sessionStorage.setItem('oauth_state', state);
    if (returnPath) sessionStorage.setItem('sso_return_path', returnPath);

    const params = new URLSearchParams({
      client_id: config.ssoClientId || 'payhive',
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    });

    window.location.href = `${config.identityUrl}/oauth/authorize?${params}`;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
    persistUser(null);
    setLoading(false);

    // SSO logout via hive-identity
    if (config.identityUrl) {
      const logoutUrl = new URL(`${config.identityUrl}/logout`);
      logoutUrl.searchParams.set('post_logout_redirect_uri', window.location.origin);
      window.location.href = logoutUrl.toString();
    }
  }, [persistUser]);

  const hasRole = useCallback((role) => {
    if (!role) return false;
    const list = normalizeRoles({ roles, role: user?.role });
    return list.includes(role);
  }, [roles, user]);

  const value = useMemo(() => {
    const isAdmin = user?.isAdmin || user?.is_admin || hasRole('admin') || hasRole('owner');
    const isSuperAdmin = user?.isAdmin || user?.is_admin || hasRole('admin') || hasRole('owner');

    return {
      user,
      profile: user,
      roles,
      permissions,
      loading,
      loadingProfile: loading,
      profileError: error,
      error,
      ensureProfile: refreshMe,
      refreshProfile: refreshMe,
      refreshMe,
      refetchProfile: refreshMe,
      login,
      logout,
      setTokens,
      hasRole,
      isOwner: hasRole('owner'),
      isManager: hasRole('manager'),
      isAdmin,
      isSuperAdmin,
      setProfile: persistUser,
    };
  }, [user, roles, permissions, loading, error, refreshMe, login, logout, setTokens, hasRole, persistUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useUserProfile = () => useContext(AuthContext);
export const useAuth = useUserProfile;

// ─── PKCE Helpers ───────────────────────────────────────────────────────────

function generateRandomString() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Base64Url(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

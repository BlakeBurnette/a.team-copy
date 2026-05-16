import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function sanitize(next) {
  if (!next || next === '/login' || next.startsWith('/login?')) return '/app';
  return next;
}

/**
 * Simple redirect helper: sends unauthenticated users to /login with next.
 */
export default function LoginRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth() || {};

  const { next, screen, emailHint } = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const rawNext = sp.get('next') || '';
    const screen = (sp.get('screen') || '').toLowerCase(); // 'signup' | 'login' | ''
    const qHint = sp.get('login_hint') || sp.get('email') || '';
    let stored = '';
    try { stored = sessionStorage.getItem('signup:email') || ''; } catch {}
    const emailHint = (qHint || stored || '').trim();
    return {
      next: sanitize(rawNext || '/app'),
      screen,
      emailHint: emailHint || undefined,
    };
  }, [location.search]);

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(next, { replace: true });
      return;
    }
    try { sessionStorage.setItem('postAuth:next', next); } catch {}
    const qs = new URLSearchParams();
    qs.set('next', next);
    if (screen) qs.set('screen', screen);
    if (emailHint) qs.set('login_hint', emailHint);
    navigate(`/login?${qs.toString()}`, { replace: true });
  }, [loading, user, next, navigate, screen, emailHint]);

  return <div className="p-6 text-neutral-600">Finishing sign in…</div>;
}

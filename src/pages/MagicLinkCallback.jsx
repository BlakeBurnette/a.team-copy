import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

/**
 * MagicLinkCallback
 *
 * Handles the callback from magic link emails sent by hive-identity.
 * Extracts the token from URL, verifies it with the backend,
 * and redirects to the app on success.
 */
export default function MagicLinkCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshMe } = useAuth() || {};

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const verifyAttempted = useRef(false);

  useEffect(() => {
    // Prevent double-verification in StrictMode
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const token = searchParams.get('token');
    const next = searchParams.get('next') || '/app';

    if (!token) {
      setStatus('error');
      setMessage('Invalid login link. No token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${config.apiOrigin}/api/auth/magic-link/verify`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
          setStatus('success');

          // Refresh auth context
          try {
            await refreshMe?.();
          } catch {}

          // Redirect to app
          navigate(sanitizeRedirect(next), { replace: true });
        } else {
          setStatus('error');
          setMessage(data.message || 'Unable to sign in. Please try again.');
        }
      } catch (err) {
        console.error('[MagicLinkCallback] Error:', err);
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    };

    verifyToken();
  }, [searchParams, navigate, refreshMe]);

  const handleRetry = () => {
    navigate('/login', { replace: true });
  };

  if (status === 'loading') {
    return (
      <AuthShell title="Signing in" subtitle="Please wait...">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell title="Sign in failed" subtitle="There was a problem with your login link.">
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

  // Success state - briefly shown before redirect
  return (
    <AuthShell title="Success" subtitle="Redirecting...">
      <div className="flex items-center justify-center py-8">
        <div className="text-green-600">Signed in successfully. Redirecting...</div>
      </div>
    </AuthShell>
  );
}

/**
 * Sanitize redirect URL to prevent open redirects
 */
function sanitizeRedirect(url) {
  if (!url) return '/app';

  // Only allow relative URLs starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    // Don't redirect back to login
    if (url === '/login' || url.startsWith('/login?')) {
      return '/app';
    }
    return url;
  }

  return '/app';
}

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import StatusCallout from '../components/StatusCallout';
import config from '../config';

/**
 * SsoCallback
 *
 * Handles SSO callbacks from hive-identity.
 * Exchanges the SSO token for a local session and redirects to the app.
 */
export default function SsoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshMe } = useAuth() || {};

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    // Prevent double-exchange in StrictMode
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const next = searchParams.get('next') || '/app';

    // Handle errors from silent SSO check
    if (error) {
      // Silent SSO check returned an error - user not authenticated at hive-identity
      // Redirect to login page silently (this is expected for silent check)
      if (error === 'not_authenticated' || error === 'session_expired') {
        navigate('/login', { replace: true });
        return;
      }
      // Other errors should be shown
      setStatus('error');
      setMessage(error === 'access_denied'
        ? 'You do not have permission to access this application.'
        : `Authentication error: ${error}`);
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Invalid SSO link. No token provided.');
      return;
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch(`${config.apiOrigin}/api/auth/sso/callback`, {
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
          setMessage(data.message || 'Unable to complete sign in. Please try again.');
        }
      } catch (err) {
        console.error('[SsoCallback] Error:', err);
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    };

    exchangeToken();
  }, [searchParams, navigate, refreshMe]);

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

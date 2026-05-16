// RoleSwitcher — persistent "wrong role? switch →" link for payhive FE.
//
// Mirrors hive-listings/src/components/shared/RoleSwitcher.tsx. Keep in
// sync. On switch:
//   1. POST /api/auth/me/signup-role on hive-identity (via config.identityUrl)
//   2. Blow away sessionStorage keys starting with `onboarding_`
//   3. Cross-origin redirect to agent/homeowner home, or in-app nav to
//      a vendor home (payhive doesn't own the non-vendor homes).
//
// For agent + homeowner switches, the destination is on the
// listings.thepayhive.com / thepayhive.com origin, so we use
// window.location.href (cross-origin). For vendor, we stay on the
// current origin (app.thepayhive.com) and navigate to /onboarding.

import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import config from '../../config';
import { useAuth } from '../../context/AuthContext';
import { AudiencePicker, audienceToRole, roleToAudience } from './AudiencePicker';

const OVERLAY_Z = 1000;

// Destination per role after a switch. payhive FE is the vendor home;
// agent + homeowner live on the other SPAs.
function homePathFor(role) {
  if (role === 'vendor') return '/onboarding';
  if (role === 'agent') return 'https://listings.thepayhive.com/onboarding/agent';
  if (role === 'customer') return 'https://listings.thepayhive.com/onboarding/customer';
  return 'https://listings.thepayhive.com/onboarding/pick';
}

export function RoleSwitcher({ tone = 'dark' } = {}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { user, setSsoUser } = useAuth();
  const navigate = useNavigate();

  const current = roleToAudience(user?.signup_role);

  const pick = async (next) => {
    if (next === current) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const role = audienceToRole(next);
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${config.identityUrl}/api/auth/me/signup-role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      try {
        const ss = window.sessionStorage;
        const keys = [];
        for (let i = 0; i < ss.length; i++) {
          const k = ss.key(i);
          if (k && k.startsWith('onboarding_')) keys.push(k);
        }
        keys.forEach((k) => ss.removeItem(k));
      } catch {
        /* ignore */
      }

      if (user && setSsoUser) {
        setSsoUser({ ...user, signup_role: role });
      }

      const dest = homePathFor(role);
      if (/^https?:\/\//i.test(dest)) {
        window.location.href = dest;
      } else {
        navigate(dest, { replace: true });
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Could not save your role');
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontSize: 12,
          color: tone === 'light' ? 'rgba(255,255,255,0.85)' : '#64748b',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: 2,
          font: 'inherit',
          padding: 0,
        }}
      >
        Wrong role? Switch →
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.4)',
            zIndex: OVERLAY_Z,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !saving && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              padding: 28,
              boxShadow: '0 24px 48px rgba(0,0,0,.18)',
              position: 'relative',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <button
              type="button"
              onClick={() => !saving && setOpen(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                color: '#64748b',
              }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1a2332' }}>
              Change your role
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
              Switching resets any setup answers you've entered — the new flow asks different
              questions.
            </p>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  marginBottom: 16,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}
            <AudiencePicker value={current} onChange={pick} variant="card" disabled={saving} />
            {saving && (
              <p
                style={{
                  marginTop: 16,
                  color: '#64748b',
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                Updating your role…
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

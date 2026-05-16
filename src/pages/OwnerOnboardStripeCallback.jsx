import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function OwnerOnboardStripeCallback() {
  const { code } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const { data } = await axios.get('/api/auth/me', { withCredentials: true });
        if (!cancelled) auth?.setProfile?.(data || null);
      } catch (e) {
        console.warn('Stripe return auth refresh failed:', e?.response?.data || e);
      } finally {
        if (!cancelled) navigate('/app/settings?tab=organization', { replace: true });
      }
    };
    hydrate();
    return () => { cancelled = true; };
  }, [auth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-neutral-700 text-sm">Finishing onboarding…</div>
    </div>
  );
}

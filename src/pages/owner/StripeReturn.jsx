import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const StripeReturn = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    let fallback;
    const hydrate = async () => {
      const go = () => {
        // Continue onboarding flow to Services setup
        if (!cancelled) navigate('/app/admin/services?onboard=1', { replace: true });
      };
      try {
        // Refresh auth/session
        const { data } = await axios.get('/api/auth/me', { withCredentials: true });
        if (!cancelled) auth?.setProfile?.(data || null);
      } catch (e) {
        console.warn('StripeReturn auth refresh failed:', e?.response?.data || e);
      }
      try {
        await axios.get('/api/organization/billing-status', { withCredentials: true });
      } catch (e) {
        console.warn('StripeReturn billing status fetch failed:', e?.response?.data || e);
      }
      go();
    };
    hydrate().catch(() => navigate('/app/admin/services?onboard=1', { replace: true }));
    fallback = setTimeout(() => !cancelled && navigate('/app/admin/services?onboard=1', { replace: true }), 3000);
    return () => { cancelled = true; clearTimeout(fallback); };
  }, [auth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-neutral-700 text-sm">Completing onboarding…</div>
    </div>
  );
};

export default StripeReturn;

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const StripeRefresh = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    let cancelled = false;
    let fallback;
    const hydrate = async () => {
      const go = () => {
        if (!cancelled) navigate(`/admin/owner-onboard/${encodeURIComponent(code || '')}`, { replace: true });
      };
      try {
        const { data } = await axios.get('/api/auth/me', { withCredentials: true });
        if (!cancelled) auth?.setProfile?.(data || null);
      } catch (e) {
        console.warn('StripeRefresh auth refresh failed:', e?.response?.data || e);
      }
      try {
        await axios.get('/api/organization/billing-status', { withCredentials: true });
      } catch (e) {
        console.warn('StripeRefresh billing status fetch failed:', e?.response?.data || e);
      }
      go();
    };
    hydrate().catch(() => navigate(`/admin/owner-onboard/${encodeURIComponent(code || '')}`, { replace: true }));
    fallback = setTimeout(() => !cancelled && navigate(`/admin/owner-onboard/${encodeURIComponent(code || '')}`, { replace: true }), 3000);
    return () => { cancelled = true; clearTimeout(fallback); };
  }, [auth, navigate, code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-neutral-700 text-sm">Completing onboarding…</div>
    </div>
  );
};

export default StripeRefresh;

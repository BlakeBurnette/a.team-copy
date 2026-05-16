// src/pages/OwnerOnboardEntry.jsx
import { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function OwnerOnboardEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // Try POST first (can accept context), then fall back to GET
        let code = null;
        try {
          const { data } = await axios.post('/api/public/owner-onboard/bootstrap', {}, { withCredentials: true });
          code = data?.code || null;
        } catch {}
        if (!code) {
          const { data } = await axios.get('/api/public/owner-onboard/bootstrap', { withCredentials: true });
          code = data?.code || null;
        }
        navigate(code ? `/admin/owner-onboard/${encodeURIComponent(code)}` : '/app', { replace: true });
      } catch {
        navigate('/app', { replace: true });
      }
    })();
  }, [navigate]);

  return <div className="p-6 text-gray-600">Preparing owner onboarding…</div>;
}

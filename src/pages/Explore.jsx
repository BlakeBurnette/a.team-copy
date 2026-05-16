import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Toast from '../components/Toast';
import ProviderCard from '../components/recommendations/ProviderCard';
import useUserSettings from '../hooks/useUserSettings';
import { fetchExploreRecommendations, requestRecommendation } from '../api/recommendations';

const friendlyError = (e) => e?.response?.data?.error || e?.message || 'Unable to load recommendations';

function buildServiceSet(raw) {
  const set = new Set();
  const arr = Array.isArray(raw) ? raw : [];
  arr.forEach((s) => {
    if (s) set.add(String(s).toLowerCase());
  });
  return set;
}

export default function Explore() {
  const { settings, loading: settingsLoading, update, refresh } = useUserSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [propertyId, setPropertyId] = useState(() => searchParams.get('propertyId') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [requestingId, setRequestingId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const usedServices = useMemo(() => {
    const set = new Set();
    if (!data) return set;
    const merge = (arr) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((s) => {
        if (s) set.add(String(s).toLowerCase());
      });
    };
    merge(data.used_service_types);
    merge(data.current_service_types);
    merge(data.active_services);
    merge(data.existing_services);
    return set;
  }, [data]);

  const providers = useMemo(() => {
    const list = Array.isArray(data?.providers) ? data.providers : Array.isArray(data) ? data : [];
    if (usedServices.size === 0) return list;
    return list.filter((p) => {
      const type = (p.service_type || p.serviceType || '').toLowerCase();
      return type ? !usedServices.has(type) : true;
    });
  }, [data, usedServices]);

  const categories = useMemo(() => {
    if (Array.isArray(data?.categories) && data.categories.length) {
      return data.categories.filter((c) => !usedServices.has(String(c).toLowerCase()));
    }
    const set = new Set();
    providers.forEach((p) => {
      const t = p.service_type || p.serviceType;
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [data?.categories, providers, usedServices]);

  const propertyOptions = useMemo(() => {
    const raw = Array.isArray(data?.properties) ? data.properties : [];
    return raw.map((p) => ({
      id: p.id || p.property_id,
      label: p.normalized_address || p.address || p.raw_address_input || p.label || `Property ${p.id || ''}`,
    }));
  }, [data]);

  useEffect(() => {
    if (!propertyId && propertyOptions.length > 0) {
      setPropertyId(propertyOptions[0].id || '');
    }
  }, [propertyId, propertyOptions]);

  const fetchExplore = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { propertyId: propertyId || undefined };
      const res = await fetchExploreRecommendations(payload);
      setData(res);
    } catch (e) {
      setError(friendlyError(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (settings && settings.neighborhoodRecsOptIn === false) {
      setLoading(false);
      setData(null);
      return;
    }
    fetchExplore();
  }, [fetchExplore, settings]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (propertyId) params.set('propertyId', propertyId); else params.delete('propertyId');
    setSearchParams(params, { replace: true });
    // Intentionally omit searchParams from deps to avoid loops when router mutates object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, setSearchParams]);

  const toggleOptIn = async () => {
    const desired = !(settings?.neighborhoodRecsOptIn === true);
    try {
      await update({ neighborhoodRecsOptIn: desired });
      showToast(desired ? 'Recommendations turned on' : 'Recommendations turned off');
      if (desired) {
        await refresh();
        fetchExplore();
      } else {
        setData(null);
      }
    } catch (e) {
      showToast(friendlyError(e), 2600);
    }
  };

  const sendRequest = async (provider) => {
    if (!provider) return;
    setRequestingId(provider.id || provider.provider_id || provider.providerId || provider.name);
    try {
      await requestRecommendation({
        providerId: provider.id || provider.provider_id || provider.providerId,
        serviceType: provider.service_type || provider.serviceType,
        propertyId: propertyId || undefined,
      });
      showToast('Request sent');
    } catch (e) {
      showToast(friendlyError(e), 2600);
    } finally {
      setRequestingId(null);
    }
  };

  const optedOut = settings && settings.neighborhoodRecsOptIn === false;

  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Explore services near you</h1>
          <p className="text-sm text-neutral-600">
            Discover add-ons in your area. We never show replacements for services you already use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleOptIn}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
          >
            {settingsLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : settings?.neighborhoodRecsOptIn === false ? (
              <Sparkles className="w-4 h-4 text-amber-500" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {settings?.neighborhoodRecsOptIn === false ? 'Turn on recommendations' : 'Refresh'}
          </button>
        </div>
      </div>

      {optedOut ? (
        <div className="border rounded-xl bg-amber-50 text-neutral-900 p-4 space-y-2">
          <div className="font-semibold text-lg">Turn on recommendations</div>
          <div className="text-sm text-neutral-700">
            See nearby services and get optional offers when providers already service your area. We never show competitor replacements for services you already use.
          </div>
          <button
            type="button"
            onClick={toggleOptIn}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Enable recommendations
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800">Property</label>
              {propertyOptions.length > 0 ? (
                <select
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                >
                  {propertyOptions.map((p) => (
                    <option key={p.id || p.label} value={p.id || ''}>{p.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  placeholder="Property ID (optional)"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-neutral-600">Loading recommendations...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : providers.length === 0 ? (
            <div className="text-sm text-neutral-700 border rounded-xl bg-white p-4">
              No recommendations right now. Refresh later or adjust your property selection.
            </div>
          ) : (
            <div className="space-y-6">
              {categories.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-neutral-800">Recommended add-ons</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <span key={cat} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs border">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {providers.map((p) => (
                  <ProviderCard
                    key={p.id || p.provider_id || p.providerId || p.name}
                    provider={p}
                    onRequest={sendRequest}
                    loading={requestingId === (p.id || p.provider_id || p.providerId || p.name)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

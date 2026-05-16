import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUserSettings, updateUserSettings } from '../api/recommendations';

export default function useUserSettings({ autoFetch = true } = {}) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(!!autoFetch);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (headers) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserSettings(headers);
      setSettings(data || {});
      return data;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load settings');
      setSettings(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (patch = {}, headers) => {
    setSaving(true);
    setError('');
    try {
      const data = await updateUserSettings(patch, headers);
      setSettings((prev) => ({ ...(prev || {}), ...(patch || {}), ...(data || {}) }));
      return data;
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to update settings');
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) load().catch(() => {});
  }, [autoFetch, load]);

  return useMemo(() => ({
    settings,
    loading,
    saving,
    error,
    refresh: load,
    update: save,
    setSettings,
  }), [settings, loading, saving, error, load, save]);
}

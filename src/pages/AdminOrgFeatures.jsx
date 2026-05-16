import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext.jsx';
import {
  adminGet,
  adminListOrgs,
  adminPatchOrgFeatures,
  adminPut,
  adminGetGlobalRecommendations,
  adminSetGlobalRecommendations,
} from '../api/adminApi';

const isUuid = (val) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val || '');

const Toggle = ({ checked, onChange, disabled }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={!!checked} onChange={onChange} disabled={disabled} />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
  </label>
);

export default function AdminOrgFeatures({ embedded }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [orgId, setOrgId] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2200 });

  const [features, setFeatures] = useState(null);
  const [initialFeatures, setInitialFeatures] = useState(null);
  const [status, setStatus] = useState(null);

  // switchboard state
  const [orgs, setOrgs] = useState([]);
  const [draftByOrg, setDraftByOrg] = useState({});
  const [savingByOrg, setSavingByOrg] = useState({});
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [page, setPage] = useState(0); // 0-based page
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [globalStatus, setGlobalStatus] = useState(null);
  const [globalDraft, setGlobalDraft] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const showToast = (msg, duration = 2200) => setToast({ show: true, msg, duration });

  const hasChanges = useMemo(() => {
    if (!features || !initialFeatures) return false;
    return (
      features.discovery_listings_enabled !== initialFeatures.discovery_listings_enabled ||
      features.neighborhood_offers_entitled !== initialFeatures.neighborhood_offers_entitled ||
      features.campaign_templates_enabled !== initialFeatures.campaign_templates_enabled
    );
  }, [features, initialFeatures]);

  const getToken = useCallback(async () => null, []);

  const load = async () => {
    const trimmed = orgId.trim();
    if (!isUuid(trimmed)) {
      setValidationError('Enter a valid organization UUID.');
      return;
    }
    setValidationError('');
    setLoading(true);
    setError('');
    try {
      const [fRes, sRes] = await Promise.all([
        adminGet(`/api/admin/org-features/${trimmed}`, { getToken }),
        adminGet(`/api/admin/recommendations/status/${trimmed}`, { getToken }),
      ]);
      const nextFeatures = fRes?.data || null;
      setFeatures(nextFeatures);
      setInitialFeatures(nextFeatures);
      setStatus(sRes?.data || null);
    } catch (e) {
      const statusCode = e?.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setError('Admin access required.');
      } else {
        setError(e?.response?.data?.error || e?.message || 'Failed to load org features');
      }
      setFeatures(null);
      setInitialFeatures(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!features || !isUuid(orgId)) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await adminPut(`/api/admin/org-features/${orgId.trim()}`, features, { getToken });
      setFeatures(data || features);
      setInitialFeatures(data || features);
      showToast('Changes saved');
      // refresh status after save
      try {
        const statusRes = await adminGet(`/api/admin/recommendations/status/${orgId.trim()}`, { getToken });
        setStatus(statusRes?.data || null);
      } catch {
        /* silent */
      }
    } catch (e) {
      const statusCode = e?.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        setError('Admin access required.');
      } else {
        setError(e?.response?.data?.error || e?.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------- Switchboard list ---------------------------- */
  const offset = page * limit;
  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  const loadGlobal = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError('');
    try {
      const data = await adminGetGlobalRecommendations(await getToken());
      setGlobalStatus(data || null);
      setGlobalDraft(data || null);
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        setGlobalError('Admin access required.');
      } else if (code === 404 || code === 405) {
        setGlobalError('Global toggle endpoint not available.');
      } else {
        setGlobalError(e?.response?.data?.error || e?.message || 'Failed to load global setting');
      }
      setGlobalStatus(null);
      setGlobalDraft(null);
    } finally {
      setGlobalLoading(false);
    }
  }, [getToken]);

  const loadOrgs = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await adminListOrgs({ search, limit, offset }, await getToken());
      const items = Array.isArray(data?.items) ? data.items : [];
      setOrgs(items);
      setTotal(Number(data?.total || items.length));
      // reset drafts for unseen orgs
      setDraftByOrg((prev) => {
        const next = {};
        items.forEach((o) => {
          const id = o.id || o.org_id;
          if (!id) return;
          if (prev[id]) next[id] = prev[id];
        });
        return next;
      });
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        setListError('Admin access required.');
      } else {
        setListError(e?.response?.data?.error || e?.message || 'Failed to load organizations');
      }
      setOrgs([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [search, limit, offset, getToken]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { loadGlobal(); }, [loadGlobal]);

  const mergedOrg = (org) => {
    const id = org.id || org.org_id;
    const draft = id ? draftByOrg[id] : null;
    return draft ? { ...org, ...draft } : org;
  };

  const hasDraftChanges = (org) => {
    const id = org.id || org.org_id;
    if (!id) return false;
    const draft = draftByOrg[id];
    if (!draft) return false;
    return (
      draft.discovery_listings_enabled !== org.discovery_listings_enabled ||
      draft.neighborhood_offers_entitled !== org.neighborhood_offers_entitled ||
      draft.campaign_templates_enabled !== org.campaign_templates_enabled
    );
  };

  const updateDraft = (orgIdValue, patch) => {
    if (!orgIdValue) return;
    setDraftByOrg((prev) => ({
      ...prev,
      [orgIdValue]: { ...(prev[orgIdValue] || {}), ...patch },
    }));
  };

  const saveOrg = async (org) => {
    const orgIdValue = org.id || org.org_id;
    if (!orgIdValue) return;
    const draft = draftByOrg[orgIdValue] || {};
    const merged = { ...org, ...draft };
    const payload = {
      discovery_listings_enabled: !!merged.discovery_listings_enabled,
      neighborhood_offers_entitled: !!merged.neighborhood_offers_entitled,
      campaign_templates_enabled: !!merged.campaign_templates_enabled,
    };

    if (
      payload.discovery_listings_enabled === org.discovery_listings_enabled &&
      payload.neighborhood_offers_entitled === org.neighborhood_offers_entitled &&
      payload.campaign_templates_enabled === org.campaign_templates_enabled
    ) {
      return;
    }

    setSavingByOrg((s) => ({ ...s, [orgIdValue]: true }));
    try {
      const data = await adminPatchOrgFeatures(orgIdValue, payload, await getToken());
      const next = data || merged;
      setOrgs((prev) =>
        prev.map((o) => {
          const id = o.id || o.org_id;
          return id === orgIdValue ? next : o;
        })
      );
      setDraftByOrg((prev) => {
        const nextDraft = { ...prev };
        delete nextDraft[orgIdValue];
        return nextDraft;
      });
      showToast('Saved');
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        setListError('Admin access required.');
      }
      const msg = e?.response?.data?.error || e?.message || 'Failed to save';
      showToast(msg, 2600);
    } finally {
      setSavingByOrg((s) => {
        const next = { ...s };
        delete next[orgIdValue];
        return next;
      });
    }
  };

  const canPrev = page > 0;
  const canNext = offset + limit < total;

  const saveGlobal = async () => {
    if (!globalDraft) return;
    setGlobalSaving(true);
    setGlobalError('');
    try {
      const payload = {
        enable_recommendations_features: globalDraft.enable_recommendations_features ?? globalDraft.enabled ?? globalDraft.enable,
      };
      const data = await adminSetGlobalRecommendations(payload, await getToken());
      const next = data || { ...globalDraft, ...payload };
      setGlobalStatus(next);
      setGlobalDraft(next);
      showToast('Global setting saved');
    } catch (e) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        setGlobalError('Admin access required.');
      } else {
        setGlobalError(e?.response?.data?.error || e?.message || 'Failed to save global setting');
      }
    } finally {
      setGlobalSaving(false);
    }
  };

  const globalChanged =
    (globalDraft?.enable_recommendations_features ?? globalDraft?.enabled ?? globalDraft?.enable) !==
    (globalStatus?.enable_recommendations_features ?? globalStatus?.enabled ?? globalStatus?.enable);

  return (
    <div className="space-y-4">
      <Toast
        show={toast.show}
        duration={toast.duration}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      >
        {toast.msg}
      </Toast>

      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Org Features</h1>
          <p className="text-sm text-neutral-600">Search orgs and toggle discovery listings and neighborhood offers.</p>
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Global recommendations feature</div>
            <div className="text-sm text-neutral-600">Admin-only master switch. Does not change per-org flags.</div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle
              checked={!!(globalDraft?.enable_recommendations_features ?? globalDraft?.enabled ?? globalDraft?.enable)}
              onChange={(e) =>
                setGlobalDraft((g) => ({
                  ...(g || {}),
                  enable_recommendations_features: e.target.checked,
                }))
              }
              disabled={globalLoading || globalSaving}
            />
            <button
              type="button"
              onClick={saveGlobal}
              disabled={!globalDraft || globalSaving || globalLoading || !globalChanged}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {globalSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {globalStatus ? (
          <div className="grid sm:grid-cols-3 gap-3 text-sm text-neutral-700">
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <span>Requested</span>
              <span className="font-medium">
                {(globalDraft?.enable_recommendations_features ?? globalDraft?.enabled ?? globalDraft?.enable) ? 'true' : 'false'}
              </span>
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <span>Effective</span>
              <span className="font-medium">
                {(globalStatus?.effective_enabled ?? globalStatus?.effective) ? 'true' : 'false'}
              </span>
            </div>
            {'env_ENABLE_RECOMMENDATIONS_FEATURES' in (globalStatus || {}) ? (
              <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                <span>ENV flag</span>
                <span className="font-medium">
                  {globalStatus?.env_ENABLE_RECOMMENDATIONS_FEATURES ? 'true' : 'false'}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
        {globalError ? <div className="text-sm text-red-600">{globalError}</div> : null}
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-sm font-semibold text-neutral-800 block mb-1">Search</label>
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Name, ID, or email"
            />
          </div>
          <button
            type="button"
            onClick={() => { setPage(0); setSearch(pendingSearch); }}
            className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm font-medium hover:bg-zinc-800"
            disabled={listLoading}
          >
            {listLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-600 border-b">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Org ID</th>
                <th className="py-2 pr-3">Discovery</th>
                <th className="py-2 pr-3">Offers</th>
                <th className="py-2 pr-3">Templates</th>
                <th className="py-2 pr-3">Save</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={6} className="py-4 text-neutral-600">Loading orgs...</td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-neutral-700">No organizations found.</td>
                </tr>
              ) : (
                orgs.map((org) => {
                  const id = org.id || org.org_id;
                  const merged = mergedOrg(org);
                  const hasChanges = hasDraftChanges(org);
                  const savingRow = savingByOrg[id];
                  return (
                    <tr key={id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium text-neutral-900">{org.name || org.org_name || '—'}</div>
                        <div className="text-xs text-neutral-600 truncate max-w-xs">{org.email || org.contact_email || ''}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-neutral-700 break-all">{id}</span>
                          <button
                            type="button"
                            className="px-2 py-1 text-xs border rounded hover:bg-neutral-50"
                            onClick={() => navigator.clipboard?.writeText?.(id || '')}
                            aria-label="Copy org ID"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Toggle
                          checked={!!merged.discovery_listings_enabled}
                          onChange={(e) => updateDraft(id, { discovery_listings_enabled: e.target.checked })}
                          disabled={savingRow}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Toggle
                          checked={!!merged.neighborhood_offers_entitled}
                          onChange={(e) => updateDraft(id, { neighborhood_offers_entitled: e.target.checked })}
                          disabled={savingRow}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Toggle
                          checked={!!merged.campaign_templates_enabled}
                          onChange={(e) => updateDraft(id, { campaign_templates_enabled: e.target.checked })}
                          disabled={savingRow}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={() => saveOrg(org)}
                          disabled={!hasChanges || savingRow}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {savingRow ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {listError ? <div className="text-sm text-red-600">{listError}</div> : null}

        <div className="flex items-center justify-between text-sm text-neutral-700">
          <div>
            Page {page + 1} of {totalPages} · {total} total
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50 disabled:opacity-60"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev || listLoading}
            >
              Prev
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50 disabled:opacity-60"
              onClick={() => setPage((p) => (canNext ? p + 1 : p))}
              disabled={!canNext || listLoading}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-4">
        <button
          type="button"
          className="text-sm font-semibold text-neutral-800 flex items-center justify-between w-full"
          onClick={() => setShowManual((v) => !v)}
        >
          <span>Manual org lookup</span>
          <span className="text-neutral-500 text-xs">{showManual ? 'Hide' : 'Show'}</span>
        </button>

        {showManual && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="text-sm font-semibold text-neutral-800 block mb-1">Org ID (UUID)</label>
                <input
                  type="text"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
                {validationError ? <div className="text-sm text-red-600 mt-1">{validationError}</div> : null}
              </div>
              <button
                type="button"
                onClick={load}
                disabled={!orgId || loading}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'Load'}
              </button>
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </div>
        )}
      </div>

      {features && (
        <div className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-neutral-900">Feature flags</div>
              <div className="text-sm text-neutral-600">Org #{features.org_id}</div>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading || !hasChanges}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Discovery listings enabled</div>
                <div className="text-sm text-neutral-600">Allow this org to appear in discovery listings.</div>
              </div>
              <Toggle
                checked={features.discovery_listings_enabled}
                onChange={(e) => setFeatures((f) => ({ ...(f || {}), discovery_listings_enabled: e.target.checked }))}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Neighborhood offers entitled</div>
                <div className="text-sm text-neutral-600">Allow this org to send neighborhood offers.</div>
              </div>
              <Toggle
                checked={features.neighborhood_offers_entitled}
                onChange={(e) => setFeatures((f) => ({ ...(f || {}), neighborhood_offers_entitled: e.target.checked }))}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
              <div>
                <div className="text-sm font-semibold text-neutral-800">Campaign templates enabled</div>
                <div className="text-sm text-neutral-600">Allow this org to use campaign templates feature.</div>
              </div>
              <Toggle
                checked={features.campaign_templates_enabled}
                onChange={(e) => setFeatures((f) => ({ ...(f || {}), campaign_templates_enabled: e.target.checked }))}
                disabled={saving}
              />
            </div>
          </div>

          {status ? (
            <div className="space-y-3 border rounded-lg p-3 bg-neutral-50">
              <div className="text-sm font-semibold text-neutral-800">Status</div>
              {!status.env_ENABLE_RECOMMENDATIONS_FEATURES ? (
                <div className="border border-amber-300 bg-amber-50 text-amber-800 text-sm rounded-lg px-3 py-2">
                  Restart API with ENABLE_RECOMMENDATIONS_FEATURES=true
                </div>
              ) : null}
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">ENABLE_RECOMMENDATIONS_FEATURES</span>
                  <span className="font-medium">{status.env_ENABLE_RECOMMENDATIONS_FEATURES ? 'true' : 'false'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Effective enabled</span>
                  <span className="font-medium">{status.effective_enabled ? 'true' : 'false'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Discovery listings</span>
                  <span className="font-medium">{status.discovery_listings_enabled ? 'true' : 'false'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Neighborhood offers</span>
                  <span className="font-medium">{status.neighborhood_offers_entitled ? 'true' : 'false'}</span>
                </div>
              </div>
              {status.note ? <div className="text-xs text-neutral-600">Note: {status.note}</div> : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

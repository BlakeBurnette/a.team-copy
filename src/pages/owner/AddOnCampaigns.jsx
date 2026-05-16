import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, PauseCircle, PlayCircle, Plus, Save } from 'lucide-react';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import { useUserProfile, useAuth } from '../../context/AuthContext.jsx';
import {
  createAddOnCampaign,
  listAddOnCampaigns,
  pauseAddOnCampaign,
  resumeAddOnCampaign,
  updateAddOnCampaign,
} from '../../api/campaigns';
import { previewCampaignSegment } from '../../api/segmentation';
import axios from 'axios';

const dollarsToCents = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
};
const centsToUSD = (cents) =>
  typeof cents === 'number'
    ? (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : '';

const defaultTiers = [
  { id: 't1', max: 1000, priceDisplay: '79' },
  { id: 't2', max: 5000, priceDisplay: '129' },
  { id: 't3', max: 999999, priceDisplay: '179' },
];

const inputKeys = ['sqft', 'acreage', 'bedrooms', 'bathrooms', 'linear_ft', 'stories'];

const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

export default function AddOnCampaigns() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { isOwner, loadingProfile } = useUserProfile() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const [form, setForm] = useState({
    id: null,
    name: '',
    vertical: '',
    offer_name: '',
    description: '',
    pricing_mode: 'fixed',
    priceDisplay: '',
    pricing_rule_json: '',
    message_line: '',
    ab_enabled: false,
    message_a: '',
    message_b: '',
    send_window_start: '',
    send_window_end: '',
    near_service_days: '',
    frequency_cap_days: '',
    status: 'draft',
  });
  const [ruleInput, setRuleInput] = useState('sqft');
  const [ruleTiers, setRuleTiers] = useState(defaultTiers);
  const [ruleMultiplier, setRuleMultiplier] = useState({ enabled: false, key: 'stories', match: '', bps: '' });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [confirm, setConfirm] = useState({ open: false, id: null, action: null });
  const [segment, setSegment] = useState({
    tags_any: '',
    tags_all: '',
    zip_in: '',
    property_type_in: '',
    last_service_before_days: '',
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const notify = (msg, duration = 2400) => setToast({ show: true, msg, duration });
  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const authHeader = async () => ({});

  const normalizeList = (data) => {
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.campaigns)) return data.campaigns;
    if (Array.isArray(data)) return data;
    return [];
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeader();
      const data = await listAddOnCampaigns(headers);
      setRows(normalizeList(data));
    } catch (e) {
      console.error('[AddOnCampaigns] load failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Failed to load campaigns');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadingProfile) return;
    if (!isOwner) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, loadingProfile]);

  const resetForm = () => {
    setForm({
      id: null,
      name: '',
      vertical: '',
      offer_name: '',
      description: '',
      pricing_mode: 'fixed',
      priceDisplay: '',
      pricing_rule_json: '',
      message_line: '',
      send_window_start: '',
      send_window_end: '',
      near_service_days: '',
      frequency_cap_days: '',
      status: 'draft',
    });
    setRuleInput('sqft');
    setRuleTiers(defaultTiers);
    setRuleMultiplier({ enabled: false, key: 'stories', match: '', bps: '' });
    setValidationError('');
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (c) => {
    const pricingMode = c.pricing_mode || 'fixed';
    const priceDisplay = c.price_cents != null ? (c.price_cents / 100).toFixed(2) : '';
    setForm({
      id: c.id,
      name: c.name || '',
      vertical: c.vertical || '',
      offer_name: c.offer_name || '',
      description: c.description || '',
      pricing_mode: pricingMode,
      priceDisplay: priceDisplay,
      pricing_rule_json: c.pricing_rule_json || c.pricingRuleJson || '',
      message_line: c.message_line || '',
      ab_enabled: !!c.ab_enabled,
      message_a: c.message_a || '',
      message_b: c.message_b || '',
      send_window_start: c.send_window_start || '',
      send_window_end: c.send_window_end || '',
      near_service_days: c.near_service_days ?? '',
      frequency_cap_days: c.frequency_cap_days ?? '',
      status: c.status || 'draft',
    });
    if (c.pricing_rule_json) {
      try {
        const parsed = typeof c.pricing_rule_json === 'string'
          ? JSON.parse(c.pricing_rule_json)
          : c.pricing_rule_json;
        setRuleInput(parsed.input_key || ruleInput);
        if (Array.isArray(parsed.tiers) && parsed.tiers.length) {
          setRuleTiers(
            parsed.tiers.map((t, idx) => ({
              id: t.id || `tier-${idx}`,
              max: t.max,
              priceDisplay:
                typeof t.price_cents === 'number' ? (t.price_cents / 100).toFixed(2) : t.priceDisplay || '',
            }))
          );
        }
        if (parsed.multiplier) {
          setRuleMultiplier({
            enabled: true,
            key: parsed.multiplier.key || 'stories',
            match: parsed.multiplier.match_value ?? '',
            bps: parsed.multiplier.bps ?? '',
          });
        }
      } catch {
        // keep defaults if parsing fails
      }
    }
    const seg = c.rule_json || c.ruleJson || c.segmentation;
    if (seg) {
      setSegment({
        tags_any: (seg.tags_any || []).join(', '),
        tags_all: (seg.tags_all || []).join(', '),
        zip_in: (seg.zip_in || []).join(', '),
        property_type_in: (seg.property_type_in || []).join(', '),
        last_service_before_days: seg.last_service_before_days || '',
      });
    }
    setPreviewResult(null);
    setShowForm(true);
  };

  const addTier = () => {
    setRuleTiers((prev) => [
      ...prev,
      { id: `tier-${Date.now()}`, max: prev.length ? Number(prev[prev.length - 1].max || 0) + 1 : 0, priceDisplay: '' },
    ]);
  };
  const updateTier = (id, patch) => {
    setRuleTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };
  const removeTier = (id) => {
    setRuleTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const buildRuleJson = () => {
    const tiers = ruleTiers.map((t) => ({
      max: t.max != null ? Number(t.max) : null,
      price_cents: dollarsToCents(t.priceDisplay),
    }));
    const multiplier =
      ruleMultiplier.enabled && (ruleMultiplier.match !== '' || ruleMultiplier.bps !== '')
        ? {
            key: ruleMultiplier.key,
            match_value: ruleMultiplier.match,
            bps: Number(ruleMultiplier.bps || 0),
          }
        : undefined;
    return {
      input_key: ruleInput,
      tiers,
      multiplier,
    };
  };

  const validateRule = () => {
    const tiers = ruleTiers.map((t) => ({
      max: Number(t.max),
      price_cents: dollarsToCents(t.priceDisplay),
    }));
    if (!tiers.length) return 'Add at least one tier';
    for (let i = 0; i < tiers.length; i++) {
      if (!Number.isFinite(tiers[i].max) || tiers[i].max <= 0) return 'Enter max values for tiers';
      if (!Number.isFinite(tiers[i].price_cents)) return 'Enter a price for each tier';
      if (i > 0 && tiers[i].max <= tiers[i - 1].max) return 'Tier maximums must increase';
    }
    const last = tiers[tiers.length - 1];
    if (last.max < 9999) return 'Last tier should cover large values (set a high max)';
    return '';
  };

  const computedExample = useMemo(() => {
    if (form.pricing_mode !== 'rule_based') return '';
    const sampleValues = { sqft: 1500, acreage: 1, bedrooms: 3, bathrooms: 2, linear_ft: 120, stories: 2 };
    const v = sampleValues[ruleInput] ?? 0;
    const tiers = ruleTiers
      .map((t) => ({ max: Number(t.max), price_cents: dollarsToCents(t.priceDisplay) }))
      .filter((t) => Number.isFinite(t.max) && Number.isFinite(t.price_cents))
      .sort((a, b) => a.max - b.max);
    let base = tiers.find((t) => v <= t.max) || tiers[tiers.length - 1];
    if (!base) return '';
    let total = base.price_cents;
    if (ruleMultiplier.enabled && ruleMultiplier.match !== '') {
      const matchVal = String(ruleMultiplier.match).toLowerCase();
      const sampleMatch = String(sampleValues[ruleMultiplier.key] ?? '').toLowerCase();
      if (matchVal && matchVal === sampleMatch) {
        const bps = Number(ruleMultiplier.bps || 0);
        total += Math.round((total * bps) / 10000);
      }
    }
    return `Example (${ruleInput}=${v}${ruleMultiplier.enabled ? `, ${ruleMultiplier.key}=${sampleValues[ruleMultiplier.key] ?? '-'}` : ''}): ${centsToUSD(total)}`;
  }, [form.pricing_mode, ruleInput, ruleTiers, ruleMultiplier]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setValidationError('');
    const payload = {
      name: form.name.trim(),
      vertical: form.vertical.trim() || null,
      offer_name: form.offer_name.trim(),
      description: form.description.trim(),
      pricing_mode: form.pricing_mode,
      message_line: form.message_line?.slice(0, 120) || '',
      ab_enabled: !!form.ab_enabled,
      message_a: form.message_a || null,
      message_b: form.message_b || null,
      status: form.status || 'draft',
    };
    payload.rule_json = payloadForSegment();
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    payload.send_window_start = form.send_window_start || null;
    payload.send_window_end = form.send_window_end || null;
    payload.near_service_days = toNum(form.near_service_days);
    payload.frequency_cap_days = toNum(form.frequency_cap_days);
    if (!payload.name) return setValidationError('Name is required');
    if (!payload.offer_name) return setValidationError('Offer name is required');
    if (form.pricing_mode === 'fixed') {
      const cents = dollarsToCents(form.priceDisplay);
      if (cents == null || !Number.isFinite(cents)) return setValidationError('Enter a price');
      payload.price_cents = cents;
    } else {
      const err = validateRule();
      if (err) return setValidationError(err);
      payload.pricing_rule_json = JSON.stringify(buildRuleJson());
    }

    try {
      setSaving(true);
      if (payload.status === 'active' && !previewResult) {
        setValidationError('Preview recipients before enabling this campaign.');
        setSaving(false);
        return;
      }
      const headers = await authHeader();
      if (form.id) {
        await updateAddOnCampaign(form.id, payload, headers);
        notify('Campaign updated');
      } else {
        const created = await createAddOnCampaign(payload, headers);
        notify('Campaign created');
        if (created?.id) setForm((f) => ({ ...f, id: created.id }));
      }
      await load();
      resetForm();
      setPreviewResult(null);
    } catch (e) {
      console.error('[AddOnCampaigns] save failed', e?.response?.data || e);
      setValidationError(e?.response?.data?.error || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const previewSegment = async () => {
    if (!form.id) {
      setPreviewError('Save campaign first, then preview recipients.');
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const headers = await authHeader();
      const data = await previewCampaignSegment(form.id, payloadForSegment(), headers);
      setPreviewResult(data);
    } catch (e) {
      setPreviewResult(null);
      setPreviewError(e?.response?.data?.error || e?.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const payloadForSegment = () => ({
    tags_any: segment.tags_any ? segment.tags_any.split(',').map((s) => s.trim()).filter(Boolean) : [],
    tags_all: segment.tags_all ? segment.tags_all.split(',').map((s) => s.trim()).filter(Boolean) : [],
    zip_in: segment.zip_in ? segment.zip_in.split(',').map((s) => s.trim()).filter(Boolean) : [],
    property_type_in: segment.property_type_in ? segment.property_type_in.split(',').map((s) => s.trim()).filter(Boolean) : [],
    last_service_before_days: segment.last_service_before_days ? Number(segment.last_service_before_days) : null,
  });

  const togglePause = async (c, action) => {
    if (!c?.id) return;
    setConfirm({ open: false, id: null, action: null });
    try {
      const headers = await authHeader();
      if (action === 'pause') await pauseAddOnCampaign(c.id, headers);
      if (action === 'resume') await resumeAddOnCampaign(c.id, headers);
      notify(action === 'pause' ? 'Campaign paused' : 'Campaign resumed');
      await load();
    } catch (e) {
      console.error('[AddOnCampaigns] toggle failed', e?.response?.data || e);
      setError(e?.response?.data?.error || 'Action failed');
    }
  };

  const smsPreview = useMemo(() => {
    const priceText =
      form.pricing_mode === 'fixed' && form.priceDisplay
        ? ` for $${String(form.priceDisplay).replace(/[^0-9.]/g, '')}`
        : '';
    return `Hi <Name>, ${form.message_line || 'we have a new add-on available'}: ${form.offer_name || 'Offer'}${priceText}. Reply YES to add. STOP to opt out. payhive.example/link`;
  }, [form.message_line, form.offer_name, form.priceDisplay, form.pricing_mode]);

  if (!isOwner && !loadingProfile) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Access restricted</div>
            <div className="text-sm">Only owners can manage campaigns.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <Toast show={toast.show} duration={toast.duration} onClose={closeToast}>
        {toast.msg}
      </Toast>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-neutral-500">Campaigns</div>
          <h1 className="text-2xl font-bold">Add-on campaigns</h1>
          <div className="text-sm text-neutral-600">Send structured offers to customers and capture approval in the portal.</div>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New campaign
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">
                {form.id ? 'Edit campaign' : 'Create campaign'}
              </div>
              <div className="text-xs text-neutral-600">Fixed pricing or rule-based tiers.</div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-neutral-600 hover:text-neutral-800"
            >
              Clear
            </button>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={handleSave}>
            <label className="block space-y-1 text-sm">
              <span className="text-neutral-700">Name</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Fall aeration push"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-neutral-700">Vertical</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
                placeholder="Lawn care"
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-neutral-700">Offer name</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.offer_name}
                onChange={(e) => setForm((f) => ({ ...f, offer_name: e.target.value }))}
                placeholder="Core aeration add-on"
              />
            </label>
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-neutral-700">Description</span>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows="2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Helps roots absorb water and nutrients before winter."
              />
            </label>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    checked={form.pricing_mode === 'fixed'}
                    onChange={() => setForm((f) => ({ ...f, pricing_mode: 'fixed' }))}
                  />
                  Fixed price
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    checked={form.pricing_mode === 'rule_based'}
                    onChange={() => setForm((f) => ({ ...f, pricing_mode: 'rule_based' }))}
                  />
                  Rule-based
                </label>
              </div>

              {form.pricing_mode === 'fixed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block space-y-1 text-sm">
                    <span className="text-neutral-700">Price</span>
                    <input
                      className="w-full border rounded-lg px-3 py-2"
                      value={form.priceDisplay}
                      onChange={(e) => setForm((f) => ({ ...f, priceDisplay: e.target.value }))}
                      placeholder="$99.00"
                    />
                  </label>
                  <div className="text-sm text-neutral-600 flex items-center">Customers see {form.priceDisplay ? centsToUSD(dollarsToCents(form.priceDisplay)) : '—'}</div>
                </div>
              ) : (
                <div className="space-y-3 border rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block space-y-1 text-sm">
                      <span className="text-neutral-700">Input key</span>
                      <select
                        className="w-full border rounded-lg px-3 py-2"
                        value={ruleInput}
                        onChange={(e) => setRuleInput(e.target.value)}
                      >
                        {inputKeys.map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                    <div className="text-sm text-neutral-600 flex items-center">
                      Tiers must be ascending; final tier should cover large values.
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ruleTiers.map((t) => (
                      <div key={t.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                        <label className="space-y-1 text-sm">
                          <span className="text-neutral-700">Max</span>
                          <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={t.max}
                            onChange={(e) => updateTier(t.id, { max: e.target.value })}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-neutral-700">Price</span>
                          <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={t.priceDisplay}
                            onChange={(e) => updateTier(t.id, { priceDisplay: e.target.value })}
                            placeholder="$0.00"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeTier(t.id)}
                            className="text-sm text-rose-600 hover:text-rose-800 px-2 py-2 rounded border"
                            disabled={ruleTiers.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTier}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add tier
                    </button>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <label className="inline-flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={ruleMultiplier.enabled}
                        onChange={(e) => setRuleMultiplier((m) => ({ ...m, enabled: e.target.checked }))}
                      />
                      Add multiplier (bps) when matching a value
                    </label>
                    {ruleMultiplier.enabled ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <label className="space-y-1 text-sm">
                          <span className="text-neutral-700">Key</span>
                          <select
                            className="w-full border rounded-lg px-3 py-2"
                            value={ruleMultiplier.key}
                            onChange={(e) => setRuleMultiplier((m) => ({ ...m, key: e.target.value }))}
                          >
                            {inputKeys.map((k) => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-neutral-700">Match value</span>
                          <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={ruleMultiplier.match}
                            onChange={(e) => setRuleMultiplier((m) => ({ ...m, match: e.target.value }))}
                            placeholder="e.g., 2"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-neutral-700">Add bps</span>
                          <input
                            type="number"
                            className="w-full border rounded-lg px-3 py-2"
                            value={ruleMultiplier.bps}
                            onChange={(e) => setRuleMultiplier((m) => ({ ...m, bps: e.target.value }))}
                            placeholder="1500 = +15%"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm text-neutral-700">{computedExample}</div>
                </div>
              )}
            </div>

            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-neutral-700">Message line (for SMS)</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.message_line}
                maxLength={160}
                onChange={(e) => setForm((f) => ({ ...f, message_line: e.target.value }))}
                placeholder="Add aeration to prep your lawn for winter?"
              />
              <div className="text-xs text-neutral-500">
                Compliance friendly. 80–120 characters recommended. Preview below includes STOP + link.
              </div>
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={!!form.ab_enabled}
                onChange={(e) => setForm((f) => ({ ...f, ab_enabled: e.target.checked }))}
              />
              Enable A/B message
            </label>
            {form.ab_enabled ? (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-neutral-700">Message A</span>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    rows="2"
                    value={form.message_a}
                    onChange={(e) => setForm((f) => ({ ...f, message_a: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-neutral-700">Message B</span>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    rows="2"
                    value={form.message_b}
                    onChange={(e) => setForm((f) => ({ ...f, message_b: e.target.value }))}
                  />
                </label>
                <div className="md:col-span-2 text-xs text-neutral-600">
                  Deterministic split across recipients. Leave blank to reuse main message.
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2">
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Send window start</span>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.send_window_start}
                  onChange={(e) => setForm((f) => ({ ...f, send_window_start: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Send window end</span>
                <input
                  type="time"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.send_window_end}
                  onChange={(e) => setForm((f) => ({ ...f, send_window_end: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Near service days</span>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.near_service_days}
                  onChange={(e) => setForm((f) => ({ ...f, near_service_days: e.target.value }))}
                  placeholder="e.g., 7"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:col-span-2">
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Frequency cap (days)</span>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.frequency_cap_days}
                  onChange={(e) => setForm((f) => ({ ...f, frequency_cap_days: e.target.value }))}
                  placeholder="14"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-neutral-700">Status</span>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="text-xs uppercase text-neutral-500">SMS Preview</div>
              <div className="border rounded-lg p-3 bg-neutral-50 text-sm text-neutral-800">
                {smsPreview}
              </div>
              <div className="text-xs text-neutral-500">No charge unless customer approves. Includes STOP opt-out.</div>
            </div>

            <div className="md:col-span-2 space-y-2 border rounded-lg p-3 bg-neutral-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-neutral-900">Segment</div>
                  <div className="text-xs text-neutral-600">Send to a targeted group.</div>
                </div>
                <button
                  type="button"
                  onClick={previewSegment}
                  className="text-sm text-neutral-700 underline"
                  disabled={previewLoading}
                >
                  {previewLoading ? 'Previewing…' : 'Preview recipients'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="text-sm space-y-1">
                  <span className="text-neutral-700">Tags (any)</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={segment.tags_any}
                    onChange={(e) => setSegment((s) => ({ ...s, tags_any: e.target.value }))}
                    placeholder="vip, recurring"
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-neutral-700">Tags (all)</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={segment.tags_all}
                    onChange={(e) => setSegment((s) => ({ ...s, tags_all: e.target.value }))}
                    placeholder="premium, autopay"
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-neutral-700">ZIPs</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={segment.zip_in}
                    onChange={(e) => setSegment((s) => ({ ...s, zip_in: e.target.value }))}
                    placeholder="94103, 94110"
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-neutral-700">Property types</span>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={segment.property_type_in}
                    onChange={(e) => setSegment((s) => ({ ...s, property_type_in: e.target.value }))}
                    placeholder="residential, commercial"
                  />
                </label>
                <label className="text-sm space-y-1">
                  <span className="text-neutral-700">Last service before (days)</span>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2"
                    value={segment.last_service_before_days}
                    onChange={(e) => setSegment((s) => ({ ...s, last_service_before_days: e.target.value }))}
                    placeholder="30"
                  />
                </label>
              </div>
              {previewResult ? (
                <div className="text-sm text-neutral-700">
                  Preview: {previewResult.count ?? previewResult.total ?? '—'} recipients.
                  {Array.isArray(previewResult.samples) && previewResult.samples.length ? (
                    <div className="mt-1 text-xs text-neutral-600">
                      {previewResult.samples.map((s, idx) => (
                        <span key={idx} className="inline-block mr-2">
                          {s.name || s.first_name ? `${s.first_name || ''} ${s.last_initial || ''}`.trim() : 'Contact'} ({s.zip || s.postal || 'ZIP'})
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {previewError ? <div className="text-sm text-red-600">{previewError}</div> : null}
              {!previewResult && form.status === 'active' ? (
                <div className="text-sm text-amber-700">Preview required before enabling.</div>
              ) : null}
            </div>

            {validationError ? (
              <div className="md:col-span-2 text-sm text-red-600">{validationError}</div>
            ) : null}

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Campaigns</div>
            <div className="text-xs text-neutral-600">Active, draft, and paused campaigns.</div>
          </div>
          <button
            type="button"
            onClick={load}
            className="text-sm text-neutral-600 hover:text-neutral-800 underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading campaigns…
          </div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-neutral-600">No campaigns yet.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.map((c) => {
              const price = c.pricing_mode === 'fixed'
                ? centsToUSD(c.price_cents)
                : 'Rule-based';
              const pricingRule = c.pricing_rule_json || c.pricingRuleJson;
              return (
                <div key={c.id} className="border rounded-lg p-3 bg-neutral-50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-neutral-900">{c.name || c.offer_name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-white text-neutral-700">
                      {c.status || 'draft'}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-800">{c.offer_name}</div>
                  <div className="text-xs text-neutral-600">{c.description}</div>
                  <div className="text-sm text-neutral-700">Pricing: {price}</div>
                  {pricingRule ? (
                    <details className="text-xs text-neutral-600">
                      <summary className="cursor-pointer">View rule</summary>
                      <pre className="bg-white border rounded p-2 overflow-x-auto">{typeof pricingRule === 'string' ? pricingRule : JSON.stringify(pricingRule, null, 2)}</pre>
                    </details>
                  ) : null}
                  {c.send_window_start ? (
                    <div className="text-xs text-neutral-600">
                      Sends {c.send_window_start}–{c.send_window_end || 'end of day'} • Near service: {c.near_service_days || '—'} days
                    </div>
                  ) : null}
                  <div className="text-xs text-neutral-500">Updated {fmtDate(c.updated_at || c.inserted_at)}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-white"
                    >
                      Edit
                    </button>
                    {c.status === 'paused' ? (
                      <button
                        type="button"
                        onClick={() => setConfirm({ open: true, id: c.id, action: 'resume' })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm hover:bg-emerald-100"
                      >
                        <PlayCircle className="w-4 h-4" /> Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirm({ open: true, id: c.id, action: 'pause' })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm hover:bg-amber-100"
                      >
                        <PauseCircle className="w-4 h-4" /> Pause
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={confirm.open} onClose={() => setConfirm({ open: false, id: null, action: null })}>
        <div className="space-y-3">
          <div className="text-lg font-semibold">
            {confirm.action === 'pause' ? 'Pause campaign?' : 'Resume campaign?'}
          </div>
          <div className="text-sm text-neutral-700">
            {confirm.action === 'pause'
              ? 'Pausing stops sends until you resume.'
              : 'Resume to start sending offers again.'}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm({ open: false, id: null, action: null })}
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const campaign = rows.find((r) => r.id === confirm.id);
                togglePause(campaign, confirm.action);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm bg-amber-600 text-white hover:bg-amber-700"
            >
              {confirm.action === 'pause' ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// src/pages/Services.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, Save, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import Toast from '../components/Toast';
import ResponsiveTabs from '../components/ResponsiveTabs';
import ServiceRecordsIndex from './ServiceRecordsIndex';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FIELD_TYPES,
  getVerticalFieldsForIndustry,
  getDefaultVerticalFieldValues,
} from '../components/admin/constants';

// Helper to check if vertical has pricing calculator
const verticalHasPricingGroup = (industry) => {
  const fields = getVerticalFieldsForIndustry(industry);
  return fields.some(f => f.group === 'pricing');
};

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

const usdInputValue = (s) => {
  const raw = String(s ?? '').replace(/[^0-9.]/g, '');
  return raw ? `$${raw}` : '';
};

const Input = ({ label, required, children, error }) => (
  <label className="block">
    <div className="text-sm text-neutral-700 mb-1">
      {label} {required && <span className="text-red-600">*</span>}
    </div>
    {children}
    {error ? <div className="text-xs text-red-600 mt-1">{error}</div> : null}
  </label>
);

const SectionCard = ({ title, children, right }) => (
  <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
    <div className="px-4 py-3 border-b flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {right}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// Dynamic vertical-specific field renderer
const VerticalFieldsSection = ({ fields, values, onChange, fieldCls, industry, onPriceCalculated, priceDisplay, onPriceDisplayChange }) => {
  if (!fields || fields.length === 0) return null;

  // Check if this vertical has pricing fields
  const hasPricingGroup = fields.some(f => f.group === 'pricing');

  const shouldShowField = (field) => {
    if (!field.showWhen) return true;
    const { field: depField, value: depValue } = field.showWhen;
    return values[depField] === depValue;
  };

  const handleFieldChange = (key, value) => {
    const newValues = { ...values, [key]: value };
    onChange(newValues);

    // Auto-calculate price for pricing group fields
    if (['rate_per_unit', 'default_units', 'minimum_charge'].includes(key)) {
      calculatePrice(newValues);
    }
  };

  const calculatePrice = (vals) => {
    const rate = parseFloat(vals.rate_per_unit) || 0;
    const units = parseFloat(vals.default_units) || 0;
    const minimum = parseFloat(vals.minimum_charge) || 0;

    if (rate > 0 && units > 0) {
      const calculated = rate * units;
      const finalPrice = Math.max(calculated, minimum);
      if (onPriceCalculated) {
        onPriceCalculated(finalPrice);
      }
    }
  };

  const handleMultiSelectToggle = (key, optionValue) => {
    const current = values[key] || [];
    const updated = current.includes(optionValue)
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];
    handleFieldChange(key, updated);
  };

  // Calculate suggested price for display
  const rate = parseFloat(values.rate_per_unit) || 0;
  const units = parseFloat(values.default_units) || 0;
  const minimum = parseFloat(values.minimum_charge) || 0;
  const calculatedPrice = rate > 0 && units > 0 ? rate * units : 0;
  const suggestedPrice = Math.max(calculatedPrice, minimum);
  const showPriceCalculation = rate > 0 || minimum > 0;

  // Separate pricing fields from other fields
  const pricingFields = fields.filter(f => f.group === 'pricing');
  const otherFields = fields.filter(f => f.group !== 'pricing');

  const renderField = (field) => {
    if (!shouldShowField(field)) return null;

    const baseInputCls = fieldCls(false);
    const value = values[field.key];

    switch (field.type) {
      case FIELD_TYPES.SELECT:
        return (
          <label key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <select
              className={baseInputCls}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </label>
        );

      case FIELD_TYPES.MULTI_SELECT:
        return (
          <div key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {(field.options || []).map((opt) => {
                const isSelected = (value || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleMultiSelectToggle(field.key, opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      isSelected
                        ? 'bg-zinc-600 text-white border-zinc-600'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </div>
        );

      case FIELD_TYPES.CHECKBOX:
        return (
          <label key={field.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">{field.label}</span>
            {field.helpText && <span className="text-xs text-neutral-500">({field.helpText})</span>}
          </label>
        );

      case FIELD_TYPES.CURRENCY:
        return (
          <label key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`${baseInputCls} pl-7`}
                placeholder={field.placeholder || '0.00'}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
            </div>
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </label>
        );

      case FIELD_TYPES.PERCENTAGE:
        return (
          <label key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                className={`${baseInputCls} pr-8`}
                placeholder={field.placeholder || '0'}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
            </div>
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </label>
        );

      case FIELD_TYPES.NUMBER:
        return (
          <label key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <input
              type="number"
              min="0"
              className={baseInputCls}
              placeholder={field.placeholder || ''}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </label>
        );

      case FIELD_TYPES.TEXT:
      default:
        return (
          <label key={field.key} className="block">
            <div className="text-sm text-neutral-700 mb-1">
              {field.label} {field.required && <span className="text-red-600">*</span>}
            </div>
            <input
              type="text"
              className={baseInputCls}
              placeholder={field.placeholder || ''}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
            {field.helpText && <div className="text-xs text-neutral-500 mt-1">{field.helpText}</div>}
          </label>
        );
    }
  };

  return (
    <div className="md:col-span-2 border-t pt-4 mt-2">
      <div className="text-sm font-semibold text-neutral-800 mb-3">
        {industry} Service Details
      </div>

      {/* Non-pricing fields */}
      {otherFields.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {otherFields.map(renderField)}
        </div>
      )}

      {/* Pricing fields grouped together */}
      {pricingFields.length > 0 && (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="text-sm font-medium text-neutral-700 mb-3">Pricing Calculator</div>
          <div className="grid md:grid-cols-4 gap-4">
            {pricingFields.map(renderField)}
          </div>

          {/* Price calculation display */}
          {showPriceCalculation && (
            <div className="mt-4 pt-3 border-t border-neutral-200">
              <div className="flex items-center gap-4 text-sm">
                <div className="text-neutral-600 flex-1">
                  {calculatedPrice > 0 && (
                    <span>
                      ${rate.toFixed(2)} × {units.toLocaleString()} = ${calculatedPrice.toFixed(2)}
                      {minimum > 0 && calculatedPrice < minimum && (
                        <span className="text-amber-600 ml-2">(below minimum)</span>
                      )}
                    </span>
                  )}
                </div>
                {suggestedPrice > 0 && (
                  <button
                    type="button"
                    onClick={() => onPriceDisplayChange && onPriceDisplayChange(suggestedPrice.toFixed(2))}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Use ${suggestedPrice.toFixed(2)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Price field inside the pricing card */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <label className="block">
              <div className="text-sm text-neutral-700 mb-1">
                Price (USD) <span className="text-red-600">*</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={`${fieldCls(false)} pl-7`}
                  placeholder="0.00"
                  value={priceDisplay || ''}
                  onChange={(e) => onPriceDisplayChange && onPriceDisplayChange(e.target.value)}
                />
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Final price for this service (auto-calculated from rate × units or minimum)
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Services() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const onboardMode = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('onboard') === '1';
  }, [location.search]);

  const [services, setServices] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [creating, setCreating] = useState(true); // default open on load
  const [org, setOrg] = useState(null);
  const industry = org?.industry || '';
  const verticalFields = useMemo(() => getVerticalFieldsForIndustry(industry), [industry]);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    equipment_needed: '',
    priceDisplay: '',
    estimated_minutes: '',
    crew_members_needed: '',
    materials: '',
    notes: '',
    active: true,
    quote_list_id: '',
    vertical_fields: {},
  });
  const [createErrors, setCreateErrors] = useState({});
  const [createChecklists, setCreateChecklists] = useState([]);
  const [enableQuotes, setEnableQuotes] = useState(false);
  const [quoteLists, setQuoteLists] = useState([]);
  const [quoteListsLoading, setQuoteListsLoading] = useState(false);

  const [toast, setToast] = useState({ show: false, msg: '' });
  const notify = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 2800);
  };

  const [checklistEnabled, setChecklistEnabled] = useState(false);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const authHeader = async () => ({});

  /* ----------------------------- load list ----------------------------- */
  const fetchServices = async () => {
    try {
      const headers = await authHeader();
      const res = await axios.get('/api/owner/services', { headers, withCredentials: true });
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('[Services] fetch failed', e?.response?.data || e);
      notify('Failed to load services');
    }
  };

  useEffect(() => { fetchServices(); }, []);

  /* -------------------------- load checklists -------------------------- */
  const loadChecklists = async () => {
    try {
      const headers = await authHeader();
      const settingsRes = await axios.get('/api/checklists/settings', {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });
      const enabled =
        settingsRes.status >= 200 &&
        settingsRes.status < 300 &&
        settingsRes.data?.enabled === true;
      if (!enabled) {
        setChecklistEnabled(false);
        setChecklistTemplates([]);
        return;
      }
      setChecklistEnabled(true);
      const tRes = await axios.get('/api/checklist-templates', { headers, withCredentials: true });
      const listRaw = Array.isArray(tRes.data)
        ? tRes.data
        : Array.isArray(tRes.data?.templates)
          ? tRes.data.templates
          : [];
      const normalized = listRaw.map((t) => ({
        ...t,
        id: t.id,
        name: t.name,
        is_required: Boolean(t.is_required),
        is_active: t.is_active,
      }));
      setChecklistTemplates(normalized.filter((t) => t.is_active !== false));
    } catch (e) {
      console.log('[Services] checklist fetch error', e?.response?.data || e);
      setChecklistEnabled(false);
      setChecklistTemplates([]);
    }
  };

  useEffect(() => { loadChecklists(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!checklistEnabled) {
      setCreateChecklists([]);
      return;
    }
    setCreateChecklists(
      (checklistTemplates || []).map((t) => ({
        checklist_id: t.id,
        name: t.name || `Template ${t.id}`,
        use: false,
        required: Boolean(t.is_required),
      }))
    );
  }, [checklistEnabled, checklistTemplates]);
  useEffect(() => { fetchOrg(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { fetchQuoteLists(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [enableQuotes]);
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('onboard') === '1') {
      setCreating(true);
    }
  }, [location.search]);

  // Responsive section toggle (Catalog vs Service Records)
  const [activeSection, setActiveSection] = useState('catalog');

  /* ------------------------------ org + quotes ------------------------------ */
  const fetchOrg = async () => {
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/owner/my-organization', { headers, withCredentials: true });
      setOrg(data);
      setEnableQuotes(!!data?.enable_quotes);
    } catch (e) {
      console.error('[Services] org fetch error', e?.response?.data || e);
      setOrg(null);
      setEnableQuotes(false);
    }
  };

  const fetchQuoteLists = async () => {
    if (!enableQuotes) {
      setQuoteLists([]);
      return;
    }
    setQuoteListsLoading(true);
    try {
      const headers = await authHeader();
      const { data } = await axios.get('/api/org/quote-lists', { headers, withCredentials: true, validateStatus: () => true });
      const listRaw = Array.isArray(data) ? data : Array.isArray(data?.quote_lists) ? data.quote_lists : [];
      setQuoteLists(
        listRaw.map((q) => ({
          id: q.id,
          name: q.name || 'Quote list',
          description: q.description || '',
        }))
      );
    } catch (e) {
      console.error('[Services] quote lists fetch error', e?.response?.data || e);
      setQuoteLists([]);
    } finally {
      setQuoteListsLoading(false);
    }
  };

  const getQuoteListName = (id, fallback) => {
    if (!id) return fallback || '';
    const found = quoteLists.find((q) => String(q.id) === String(id));
    return found?.name || fallback || '';
  };

  const handleQuoteListChange = (value, setter) => {
    if (value === 'create_new') {
      navigate('/app/settings?tab=Quotes&createQuoteList=1');
      return;
    }
    setter(value);
  };

  useEffect(() => { fetchOrg(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { fetchQuoteLists(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [enableQuotes]);
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('onboard') === '1') {
      setCreating(true);
    }
  }, [location.search]);

  /* ------------------------------- create ------------------------------ */
  const validateCreate = () => {
    const errs = {};
    if (!createForm.name.trim()) errs.name = 'Service name is required.';
    if (!createForm.priceDisplay || dollarsToCents(createForm.priceDisplay) == null)
      errs.priceDisplay = 'Price is required.';
    if (String(createForm.estimated_minutes).trim() === '')
      errs.estimated_minutes = 'Estimated time is required.';
    if (!createForm.description.trim()) errs.description = 'Description is required.';
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!validateCreate()) {
      notify('Please complete the required fields.');
      return;
    }
    try {
      const headers = await authHeader();
      const payload = {
        name: createForm.name?.trim(),
        description: createForm.description?.trim(),
        equipment_needed: createForm.equipment_needed?.trim() || null,
        price_cents: dollarsToCents(createForm.priceDisplay),
        estimated_minutes: Number(createForm.estimated_minutes),
        crew_members_needed:
          String(createForm.crew_members_needed).trim() === ''
            ? null
            : Number(createForm.crew_members_needed),
        materials: createForm.materials?.trim() || null,
        notes: createForm.notes?.trim() || null,
        active: !!createForm.active,
        quote_list_id: enableQuotes && createForm.quote_list_id ? createForm.quote_list_id : null,
        checklists: checklistEnabled
          ? createChecklists
              .filter((c) => c.use)
              .map((c) => ({ checklist_id: c.checklist_id, required: Boolean(c.required) }))
          : [],
        vertical_fields: createForm.vertical_fields || {},
      };
      await axios.post('/api/owner/services', payload, { headers, withCredentials: true });
      setCreateForm({
        name: '',
        description: '',
        equipment_needed: '',
        priceDisplay: '',
        estimated_minutes: '',
        crew_members_needed: '',
        materials: '',
        notes: '',
        active: true,
        quote_list_id: '',
        vertical_fields: {},
      });
      setCreateErrors({});
      setCreateChecklists(
        (checklistTemplates || []).map((t) => ({
          checklist_id: t.id,
          name: t.name || `Template ${t.id}`,
          use: false,
          required: Boolean(t.is_required),
        }))
      );
      setCreating(false);
      await fetchServices();
      notify('Service added');
    } catch (e) {
      console.error('[Services] create failed', e?.response?.data || e);
      notify(e?.response?.data?.error || 'Failed to add service');
    }
  };

  /* -------------------------------- edit -------------------------------- */
  const EditableRow = ({ svc }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
      name: svc.name || '',
      description: svc.description || '',
      equipment_needed: svc.equipment_needed || '',
      priceDisplay: usdInputValue(centsToUSD(svc.price_cents).replace(/[^0-9.]/g, '')),
      estimated_minutes: svc.estimated_minutes ?? '',
      crew_members_needed: svc.crew_members_needed ?? '',
      materials: svc.materials || '',
      notes: svc.notes || '',
      active: !!svc.active,
      quote_list_id: svc.quote_list_id ?? (svc.quote_list?.id ?? ''),
      vertical_fields: svc.vertical_fields || {},
    });
    const [errs, setErrs] = useState({});
    const [svcChecklists, setSvcChecklists] = useState([]);
    const [svcChecklistsLoaded, setSvcChecklistsLoaded] = useState(false);

    const validate = () => {
      const e = {};
      if (!form.name.trim()) e.name = 'Service name is required.';
      if (!form.priceDisplay || dollarsToCents(form.priceDisplay) == null)
        e.priceDisplay = 'Price is required.';
      if (String(form.estimated_minutes).trim() === '')
        e.estimated_minutes = 'Estimated time is required.';
      if (!form.description.trim()) e.description = 'Description is required.';
      setErrs(e);
      return Object.keys(e).length === 0;
    };

    const save = async () => {
      if (!validate()) {
        notify('Please complete the required fields.');
        return;
      }
      try {
        const headers = await authHeader();
        const payload = {
          name: form.name?.trim(),
          description: form.description?.trim(),
          equipment_needed: form.equipment_needed?.trim() || null,
          price_cents: dollarsToCents(form.priceDisplay),
          estimated_minutes: Number(form.estimated_minutes),
          crew_members_needed:
            String(form.crew_members_needed).trim() === ''
              ? null
              : Number(form.crew_members_needed),
          materials: form.materials?.trim() || null,
          notes: form.notes?.trim() || null,
          active: !!form.active,
          quote_list_id: enableQuotes ? (form.quote_list_id || null) : (svc.quote_list_id ?? svc.quote_list?.id ?? null),
          checklists: checklistEnabled
            ? svcChecklists
                .filter((c) => c.use)
                .map((c) => ({ checklist_id: c.checklist_id, required: Boolean(c.required) }))
            : [],
          vertical_fields: form.vertical_fields || {},
        };
        await axios.patch(`/api/owner/services/${svc.id}`, payload, { headers, withCredentials: true });
        setEditing(false);
        await fetchServices();
        notify('Service updated');
      } catch (e) {
        console.error('[Services] update failed', e?.response?.data || e);
        notify(e?.response?.data?.error || 'Failed to update service');
      }
    };

    const toggleActive = async () => {
      try {
        const headers = await authHeader();
        await axios.patch(
          `/api/owner/services/${svc.id}`,
          { active: !svc.active },
          { headers, withCredentials: true }
        );
        await fetchServices();
      } catch (e) {
        console.error('[Services] toggle failed', e?.response?.data || e);
        notify('Failed to toggle availability');
      }
    };

    const fieldCls = (hasErr) =>
      `w-full border rounded-lg px-3 py-2 ${hasErr ? 'border-red-500' : 'border-neutral-300'}`;

    useEffect(() => {
      const syncDefaults = async () => {
        if (!editing || !checklistEnabled) return;
        try {
          const headers = await authHeader();
          const res = await axios.get(`/api/checklists/service-types/${svc.id}`, {
            headers,
            withCredentials: true,
            validateStatus: () => true,
          });
          let existing = [];
          if (res.status >= 200 && res.status < 300) {
            existing = Array.isArray(res.data?.checklists)
              ? res.data.checklists
              : Array.isArray(res.data)
                ? res.data
                : [];
          }
          const map = (checklistTemplates || []).map((t) => {
            const found = existing.find((c) =>
              String(c.checklist_id ?? c.id ?? c.checklist_template_id) === String(t.id)
            );
            return {
              checklist_id: t.id,
              name: t.name || `Template ${t.id}`,
              use: Boolean(found && (found.attached === true || found.use === true || found.use_for_service_type === true)),
              required: found ? Boolean(found.required) : Boolean(t.is_required),
            };
          });
          setSvcChecklists(map);
          setSvcChecklistsLoaded(true);
        } catch (e) {
          console.log('[Services] load service checklists error', e?.response?.data || e);
          setSvcChecklists(
            (checklistTemplates || []).map((t) => ({
              checklist_id: t.id,
              name: t.name || `Template ${t.id}`,
              use: false,
              required: Boolean(t.is_required),
            }))
          );
          setSvcChecklistsLoaded(true);
        }
      };
      syncDefaults();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing, checklistEnabled, svc.id, checklistTemplates]);

    return (
      <div className="border rounded-lg p-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate">{svc.name || '—'}</div>
            <div className="text-sm text-neutral-600 truncate">
              {centsToUSD(svc.price_cents) || '$0.00'}{' '}
              {svc.estimated_minutes ? `• ${svc.estimated_minutes} min` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleActive}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm"
              title={svc.active ? 'Set inactive' : 'Set active'}
            >
              {svc.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {svc.active ? 'Active' : 'Inactive'}
            </button>
            <button
              onClick={() => setExpandedId(expandedId === svc.id ? null : svc.id)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm"
            >
              {expandedId === svc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Details
            </button>
            <button
              onClick={() => { setEditing(true); setExpandedId(svc.id); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm"
            >
              <Pencil className="w-4 h-4" /> Edit
            </button>
          </div>
        </div>

        {/* Accordion */}
        {expandedId === svc.id && (
          <div className="mt-3 pt-3 border-t">
            {!editing ? (
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-neutral-500">Price:</span> {centsToUSD(svc.price_cents) || '—'}</div>
                <div><span className="text-neutral-500">Est. Time:</span> {svc.estimated_minutes ? `${svc.estimated_minutes} min` : '—'}</div>
                <div><span className="text-neutral-500">Crew Members:</span> {svc.crew_members_needed ?? '—'}</div>
                <div><span className="text-neutral-500">Equipment Needed:</span> {svc.equipment_needed || '—'}</div>
                <div className="md:col-span-2">
                  <span className="text-neutral-500">Description:</span> {svc.description || '—'}
                </div>
                <div className="md:col-span-2">
                  <span className="text-neutral-500">Materials:</span> {svc.materials || '—'}
                </div>
                <div className="md:col-span-2">
                  <span className="text-neutral-500">Notes:</span> {svc.notes || '—'}
                </div>
                {enableQuotes && (
                  <div className="md:col-span-2">
                    <span className="text-neutral-500">Quote list:</span>{' '}
                    {getQuoteListName(
                      svc.quote_list_id ?? (svc.quote_list?.id ?? ''),
                      svc.quote_list?.name || svc.quote_list_name || '—'
                    ) || '—'}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Service Name" required error={errs.name}>
                  <input
                    className={fieldCls(!!errs.name)}
                    placeholder="Basic Service"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Input>

                {/* Hide price field if vertical has pricing calculator */}
                {!verticalHasPricingGroup(industry) && (
                  <Input label="Price (USD)" required error={errs.priceDisplay}>
                    <input
                      className={fieldCls(!!errs.priceDisplay)}
                      placeholder="$0.00"
                      value={form.priceDisplay}
                      onChange={(e) => setForm({ ...form, priceDisplay: usdInputValue(e.target.value) })}
                      onBlur={(e) => setForm({ ...form, priceDisplay: usdInputValue(e.target.value) })}
                    />
                  </Input>
                )}

                <Input label="Estimated Time (minutes)" required error={errs.estimated_minutes}>
                  <input
                    type="number"
                    min={0}
                    className={fieldCls(!!errs.estimated_minutes)}
                    placeholder="e.g., 45"
                    value={form.estimated_minutes}
                    onChange={(e) => setForm({ ...form, estimated_minutes: e.target.value })}
                  />
                </Input>

                <Input label="Crew Members Needed">
                  <input
                    type="number"
                    min={0}
                    className={fieldCls(false)}
                    placeholder="e.g., 2"
                    value={form.crew_members_needed}
                    onChange={(e) => setForm({ ...form, crew_members_needed: e.target.value })}
                  />
                </Input>

                <Input label="Equipment Needed">
                  <input
                    className={fieldCls(false)}
                    placeholder="Mower, trimmer, blower..."
                    value={form.equipment_needed}
                    onChange={(e) => setForm({ ...form, equipment_needed: e.target.value })}
                  />
                </Input>

                <Input label="Materials (comma-separated)">
                  <input
                    className={fieldCls(false)}
                    placeholder="Mulch, fertilizer, edging..."
                    value={form.materials}
                    onChange={(e) => setForm({ ...form, materials: e.target.value })}
                  />
                </Input>

                <Input label="Description" required error={errs.description}>
                  <textarea
                    className={fieldCls(!!errs.description)}
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Input>

                <Input label="Notes">
                  <textarea
                    className={fieldCls(false)}
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </Input>

                {enableQuotes && (
                  <Input label="Quote list (optional)">
                    <select
                      className={fieldCls(false)}
                      value={form.quote_list_id || ''}
                      onChange={(e) => handleQuoteListChange(e.target.value, (val) => setForm({ ...form, quote_list_id: val }))}
                    >
                      <option value="">None</option>
                      {quoteLists.map((q) => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                      ))}
                      <option value="create_new">Create new quote list…</option>
                    </select>
                    {quoteListsLoading && <div className="text-xs text-neutral-500 mt-1">Loading quote lists…</div>}
                  </Input>
                )}

                {/* Vertical-specific fields based on industry */}
                <VerticalFieldsSection
                  fields={verticalFields}
                  values={form.vertical_fields}
                  onChange={(vf) => setForm({ ...form, vertical_fields: vf })}
                  fieldCls={fieldCls}
                  industry={industry}
                  onPriceCalculated={(price) => setForm((f) => ({ ...f, priceDisplay: price.toFixed(2) }))}
                  priceDisplay={form.priceDisplay}
                  onPriceDisplayChange={(val) => setForm((f) => ({ ...f, priceDisplay: val }))}
                />

                {checklistEnabled && (
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-sm font-semibold text-neutral-800">Checklists for this service type</div>
                    {!svcChecklistsLoaded ? (
                      <div className="text-sm text-neutral-600">Loading checklists…</div>
                    ) : (
                      <div className="space-y-2">
                        {svcChecklists.map((c, idx) => (
                          <div key={c.checklist_id || idx} className="border rounded-lg p-3 bg-neutral-50 flex items-center justify-between gap-2">
                            <div className="text-sm text-neutral-800">{c.name}</div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-sm text-neutral-700">
                                <input
                                  type="checkbox"
                                  checked={c.use}
                                  onChange={(e) =>
                                    setSvcChecklists((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, use: e.target.checked } : p))
                                    )
                                  }
                                />
                                Use this checklist
                              </label>
                              <label className="flex items-center gap-2 text-sm text-neutral-700">
                                <input
                                  type="checkbox"
                                  checked={c.required}
                                  disabled={!c.use}
                                  onChange={(e) =>
                                    setSvcChecklists((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, required: e.target.checked } : p))
                                    )
                                  }
                                />
                                Required
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-neutral-500">
                      Defaults apply to future jobs for this service type; existing scheduled jobs keep their current checklists.
                    </div>
                  </div>
                )}

                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    type="button"
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-600 text-white"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const fieldClsCreate = (hasErr) =>
    `w-full border rounded-lg px-3 py-2 ${hasErr ? 'border-red-500' : 'border-neutral-300'}`;

  /* ------------------------------- render ------------------------------- */
  const catalogSection = (
    <div className="space-y-6">
      {/* Create */}
      <SectionCard
        title="Add Service"
        right={
          <button
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded border"
          >
            <Plus className="w-4 h-4" /> {creating ? 'Close' : 'New'}
          </button>
        }
      >
        {creating ? (
          <>
            {onboardMode && (
              <div className="md:col-span-2 text-sm text-neutral-700 mb-2">
                Welcome! Add your first service to start sending quotes and scheduling jobs.
              </div>
            )}
            <form onSubmit={onCreate} className="grid md:grid-cols-2 gap-4">
              <Input label="Service Name" required error={createErrors.name}>
                <input
                  className={fieldClsCreate(!!createErrors.name)}
                  placeholder="Basic Service"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                />
              </Input>

              {/* Hide price field if vertical has pricing calculator */}
              {!verticalHasPricingGroup(industry) && (
                <Input label="Price (USD)" required error={createErrors.priceDisplay}>
                  <input
                    className={fieldClsCreate(!!createErrors.priceDisplay)}
                    placeholder="$0.00"
                    value={createForm.priceDisplay}
                    onChange={(e) => setCreateForm({ ...createForm, priceDisplay: usdInputValue(e.target.value) })}
                    onBlur={(e) => setCreateForm({ ...createForm, priceDisplay: usdInputValue(e.target.value) })}
                    required
                  />
                </Input>
              )}

              <Input label="Estimated Time (minutes)" required error={createErrors.estimated_minutes}>
                <input
                  type="number"
                  min={0}
                  className={fieldClsCreate(!!createErrors.estimated_minutes)}
                  placeholder="e.g., 45"
                  value={createForm.estimated_minutes}
                  onChange={(e) => setCreateForm({ ...createForm, estimated_minutes: e.target.value })}
                  required
                />
              </Input>

              <Input label="Crew Members Needed">
                <input
                  type="number"
                  min={0}
                  className={fieldClsCreate(false)}
                  placeholder="e.g., 2"
                  value={createForm.crew_members_needed}
                  onChange={(e) => setCreateForm({ ...createForm, crew_members_needed: e.target.value })}
                />
              </Input>

              <Input label="Equipment Needed">
                <input
                  className={fieldClsCreate(false)}
                  placeholder="Mower, trimmer, blower..."
                  value={createForm.equipment_needed}
                  onChange={(e) => setCreateForm({ ...createForm, equipment_needed: e.target.value })}
                />
              </Input>

              <Input label="Materials (comma-separated)">
                <input
                  className={fieldClsCreate(false)}
                  placeholder="Mulch, fertilizer, edging..."
                  value={createForm.materials}
                  onChange={(e) => setCreateForm({ ...createForm, materials: e.target.value })}
                />
              </Input>

              <Input label="Description" required error={createErrors.description}>
                <textarea
                  className={fieldClsCreate(!!createErrors.description)}
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  required
                />
              </Input>

              <Input label="Notes">
                <textarea
                  className={fieldClsCreate(false)}
                  rows={3}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                />
              </Input>

              {enableQuotes && (
                <Input label="Quote list (optional)">
                  <select
                    className={fieldClsCreate(false)}
                    value={createForm.quote_list_id || ''}
                    onChange={(e) => handleQuoteListChange(e.target.value, (val) => setCreateForm({ ...createForm, quote_list_id: val }))}
                  >
                    <option value="">None</option>
                    {quoteLists.map((q) => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                    <option value="create_new">Create new quote list…</option>
                  </select>
                  {quoteListsLoading && <div className="text-xs text-neutral-500 mt-1">Loading quote lists…</div>}
                </Input>
              )}

              {/* Vertical-specific fields based on industry */}
              <VerticalFieldsSection
                fields={verticalFields}
                values={createForm.vertical_fields}
                onChange={(vf) => setCreateForm({ ...createForm, vertical_fields: vf })}
                fieldCls={fieldClsCreate}
                industry={industry}
                onPriceCalculated={(price) => setCreateForm((f) => ({ ...f, priceDisplay: price.toFixed(2) }))}
                priceDisplay={createForm.priceDisplay}
                onPriceDisplayChange={(val) => setCreateForm((f) => ({ ...f, priceDisplay: val }))}
              />

              {checklistEnabled && (
                <div className="md:col-span-2 space-y-2">
                  <div className="text-sm font-semibold text-neutral-800">Checklists for this service type</div>
                  <div className="space-y-2">
                    {createChecklists.map((c, idx) => (
                      <div key={c.checklist_id || idx} className="border rounded-lg p-3 bg-neutral-50 flex items-center justify-between gap-2">
                        <div className="text-sm text-neutral-800">{c.name}</div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={c.use}
                              onChange={(e) =>
                                setCreateChecklists((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, use: e.target.checked } : p))
                                )
                              }
                            />
                            Use this checklist
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={c.required}
                              disabled={!c.use}
                              onChange={(e) =>
                                setCreateChecklists((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, required: e.target.checked } : p))
                                )
                              }
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Defaults apply to future jobs created for this service type.
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex items-center justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-zinc-600 text-white"
                >
                  <Save className="w-4 h-4" /> Save Service
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-neutral-600 text-sm">
            Click <strong>New</strong> to create a service. Prices are shown in USD but are stored as <strong>cents</strong> in the backend.
          </div>
        )}
      </SectionCard>

      {/* List */}
      <SectionCard title="Services">
        {services.length === 0 ? (
          <div className="text-neutral-600">No services yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {services.map((svc) => (
              <EditableRow key={svc.id} svc={svc} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const sections = [
    { key: 'catalog', label: 'Catalog', render: () => catalogSection },
    { key: 'service-records', label: 'Service Records', render: () => <ServiceRecordsIndex embedded /> },
  ];

  return (
    <div className="space-y-6">
      <Toast show={toast.show} onClose={() => setToast({ show: false, msg: '' })}>
        {toast.msg}
      </Toast>

      <ResponsiveTabs
        sections={sections}
        value={activeSection}
        onChange={(key) => setActiveSection(key || '')}
      />
    </div>
  );
}

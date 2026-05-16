import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import './quotes-toggle.css';

const blankField = () => ({ label: '', inputType: 'text', propertyField: '', options: '' });

export default function QuotesSettings({
  authHeader,
  org,
  role,
  onOrgPatched,
  showToast,
  createQuoteListRequested,
  active,
}) {
  const [enableQuotes, setEnableQuotes] = useState(!!org?.enable_quotes);
  const [savingToggle, setSavingToggle] = useState(false);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // {id,name,description,vertical,fields[]}
  const [savingList, setSavingList] = useState(false);

  useEffect(() => setEnableQuotes(!!org?.enable_quotes), [org?.enable_quotes]);

  const normalizeFields = (fields) => {
    if (!Array.isArray(fields)) return [];
    return fields.map((f) => ({
      label: f.label || f.name || '',
      inputType: f.inputType || f.input_type || 'text',
      propertyField: f.propertyField || f.property_field || '',
      options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || ''),
    }));
  };

  const fetchLists = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/org/quote-lists', {
        headers: authHeader,
        withCredentials: true,
        validateStatus: () => true,
      });
      if (res.status === 404) {
        setLists([]);
        setError('Quote lists endpoint is not available in this environment yet.');
        return;
      }
      if (res.status >= 400) {
        setLists([]);
        setError(res.data?.error || 'Failed to load quote lists');
        return;
      }
      const data = res.data;
      const raw = Array.isArray(data) ? data : Array.isArray(data?.quote_lists) ? data.quote_lists : [];
      setLists(
        raw.map((q) => ({
          id: q.id,
          name: q.name || 'Quote list',
          description: q.description || '',
          vertical: q.vertical || '',
          fields: normalizeFields(q.fields || q.line_items || q.items),
        }))
      );
    } catch (e) {
      setLists([]);
      setError(e?.response?.data?.error || 'Failed to load quote lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    if (!enableQuotes) {
      setLists([]);
      setError('');
      return;
    }
    fetchLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableQuotes, active]);
  useEffect(() => {
    if (active && createQuoteListRequested) {
      setEditing({ id: null, name: '', description: '', vertical: '', fields: [blankField()] });
    }
  }, [createQuoteListRequested, active]);

  const toggleEnable = async (nextVal) => {
    if (!org?.id) return;
    if (!nextVal) {
      // simple confirm; matches existing pattern elsewhere
      const ok = window.confirm('Disable quotes? Customers will not see quote flows until re-enabled.');
      if (!ok) return;
    }
    setSavingToggle(true);
    try {
      await axios.post('/api/owner/organization/update', {
        id: Number(org.id),
        enable_quotes: !!nextVal,
      }, { headers: authHeader, withCredentials: true });
      setEnableQuotes(!!nextVal);
      onOrgPatched?.({ enable_quotes: !!nextVal });
      showToast?.(nextVal ? 'Quotes enabled' : 'Quotes disabled');
    } catch (e) {
      console.error('toggle quotes failed', e?.response?.data || e);
      showToast?.('Failed to update quotes setting');
      setEnableQuotes(!!org?.enable_quotes);
    } finally {
      setSavingToggle(false);
    }
  };

  const startNew = () => setEditing({ id: null, name: '', description: '', vertical: '', fields: [blankField()] });
  const startEdit = (list) =>
    setEditing({
      id: list.id,
      name: list.name || '',
      description: list.description || '',
      vertical: list.vertical || '',
      fields: (list.fields && list.fields.length ? list.fields : [blankField()]).map((f) => ({
        label: f.label || '',
        inputType: f.inputType || 'text',
        propertyField: f.propertyField || '',
        options: f.options || '',
      })),
    });

  const updateField = (idx, key, value) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const next = [...(prev.fields || [])];
      next[idx] = { ...(next[idx] || blankField()), [key]: value };
      return { ...prev, fields: next };
    });
  };

  const addField = () => setEditing((prev) => ({ ...(prev || {}), fields: [...(prev?.fields || []), blankField()] }));
  const removeField = (idx) =>
    setEditing((prev) => {
      if (!prev) return prev;
      const next = [...(prev.fields || [])];
      next.splice(idx, 1);
      return { ...prev, fields: next.length ? next : [blankField()] };
    });

  const saveList = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return showToast?.('Name is required');
    const payload = {
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      vertical: editing.vertical?.trim() || null,
      fields: (editing.fields || [])
        .filter((f) => String(f.label || '').trim())
        .map((f) => ({
          label: String(f.label).trim(),
          input_type: f.inputType || f.input_type || 'text',
          property_field: f.propertyField || '',
          options: Array.isArray(f.options) ? f.options : String(f.options || '').split(',').map((o) => o.trim()).filter(Boolean),
        })),
    };
    setSavingList(true);
    try {
      if (editing.id) {
        await axios.put(`/api/org/quote-lists/${encodeURIComponent(editing.id)}`, payload, {
          headers: authHeader,
          withCredentials: true,
        });
      } else {
        await axios.post('/api/org/quote-lists', payload, { headers: authHeader, withCredentials: true });
      }
      showToast?.('Quote list saved');
      setEditing(null);
      await fetchLists();
    } catch (e) {
      console.error('save quote list failed', e?.response?.data || e);
      showToast?.(e?.response?.data?.error || 'Failed to save quote list');
    } finally {
      setSavingList(false);
    }
  };

  const deleteList = async (id) => {
    if (!id) return;
    const ok = window.confirm('Delete this quote list? This cannot be undone.');
    if (!ok) return;
    try {
      await axios.delete(`/api/org/quote-lists/${encodeURIComponent(id)}`, {
        headers: authHeader,
        withCredentials: true,
      });
      showToast?.('Quote list deleted');
      await fetchLists();
    } catch (e) {
      console.error('delete quote list failed', e?.response?.data || e);
      showToast?.(e?.response?.data?.error || 'Failed to delete quote list');
    }
  };

  const canEdit = ['owner', 'admin'].includes(role);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Enable quotes for this organization</div>
            <div className="text-sm text-neutral-600">
              Turn on quotes to attach templates to service types. You can switch this off anytime.
            </div>
          </div>
          <button
            type="button"
            onClick={() => !savingToggle && canEdit && toggleEnable(!enableQuotes)}
            className="flex items-center gap-2 text-sm"
            disabled={savingToggle || !canEdit}
          >
            <div className={`toggle-switch ${enableQuotes ? 'on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span className="toggle-label">
              {savingToggle ? 'Saving…' : enableQuotes ? 'Enabled' : 'Enable quotes'}
            </span>
          </button>
        </div>
        {enableQuotes && lists.length === 0 && (
          <div className="text-sm text-neutral-600">No quote lists yet. Create your first template below.</div>
        )}
      </div>

      {enableQuotes && (
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Quote lists</div>
            <div className="text-xs text-neutral-600">Reusable templates you can attach to service types.</div>
          </div>
          {canEdit && (
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded border"
              onClick={startNew}
            >
              <Plus className="w-4 h-4" /> Create quote list
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-neutral-600">Loading quote lists…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : lists.length === 0 ? (
          <div className="text-sm text-neutral-600">No quote lists yet.</div>
          ) : (
            <div className="space-y-2">
              {lists.map((q) => (
                <div key={q.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                  <div className="font-medium text-neutral-900 truncate">{q.name}</div>
                  <div className="text-xs text-neutral-600 truncate">{q.description || 'No description'}</div>
                  <div className="text-xs text-neutral-500">{q.fields?.length || 0} fields</div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm"
                      onClick={() => startEdit(q)}
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm text-red-700"
                      onClick={() => deleteList(q.id)}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
      </div>
      )}

      {editing && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-900">
              {editing.id ? 'Edit quote list' : 'Create quote list'}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border text-sm"
              onClick={() => setEditing(null)}
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm font-medium text-neutral-700">
              Name
              <input
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="Exterior wash template"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), name: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Vertical (optional)
              <input
                className="w-full border rounded-lg px-3 py-2 mt-1"
                placeholder="Lawncare, cleaning, etc."
                value={editing.vertical || ''}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), vertical: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium text-neutral-700 md:col-span-2">
              Description
              <textarea
                className="w-full border rounded-lg px-3 py-2 mt-1"
                rows={2}
                value={editing.description || ''}
                onChange={(e) => setEditing((p) => ({ ...(p || {}), description: e.target.value }))}
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-neutral-900">Fields</div>
            <div className="space-y-2">
              {(editing.fields || []).map((f, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="grid md:grid-cols-2 gap-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Label
                      <input
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={f.label}
                        onChange={(e) => updateField(idx, 'label', e.target.value)}
                        placeholder="Driveway square footage"
                      />
                    </label>
                    <label className="text-sm font-medium text-neutral-700">
                      Input type
                      <select
                        className="w-full border rounded-lg px-3 py-2 mt-1 bg-white"
                        value={f.inputType || 'text'}
                        onChange={(e) => updateField(idx, 'inputType', e.target.value)}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select-size">Select size</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Property field (optional)
                      <input
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={f.propertyField || ''}
                        onChange={(e) => updateField(idx, 'propertyField', e.target.value)}
                        placeholder="property.driveway_sqft"
                      />
                    </label>
                    <label className="text-sm font-medium text-neutral-700">
                      Options (comma-separated, optional)
                      <input
                        className="w-full border rounded-lg px-3 py-2 mt-1"
                        value={f.options || ''}
                        onChange={(e) => updateField(idx, 'options', e.target.value)}
                        placeholder="Small, Medium, Large"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-red-700 underline"
                      onClick={() => removeField(idx)}
                    >
                      Remove field
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded border text-sm"
              onClick={addField}
            >
              <Plus className="w-4 h-4" /> Add field
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
              onClick={saveList}
              disabled={savingList}
            >
              <Save className="w-4 h-4" /> {savingList ? 'Saving…' : 'Save quote list'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

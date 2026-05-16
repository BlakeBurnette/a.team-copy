// src/components/checklists/ChecklistTemplateEditor.jsx
import React, { useEffect, useMemo, useState } from 'react';

const emptyItem = (idx = 0) => ({
  id: null,
  label: '',
  required: true,
  order_index: idx,
});

export default function ChecklistTemplateEditor({ template, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: '',
    description: '',
    is_required: false,
    is_active: true,
    items: [emptyItem(0)],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!template) {
      setDraft({
        name: '',
        description: '',
        is_required: false,
        is_active: true,
        items: [emptyItem(0)],
      });
      setError('');
      return;
    }
    const items = Array.isArray(template.items) ? [...template.items] : [];
    const sorted = items
      .map((it, idx) => ({
        id: it.id ?? null,
        label: it.label || '',
        required: Boolean(it.required),
        order_index: Number.isFinite(it.order_index) ? it.order_index : idx,
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    setDraft({
      name: template.name || '',
      description: template.description || '',
      is_required: Boolean(template.is_required),
      is_active: template.is_active !== false,
      items: sorted.length ? sorted : [emptyItem(0)],
    });
    setError('');
  }, [template]);

  const hasName = draft.name.trim().length > 0;
  const validItems = useMemo(
    () => (draft.items || []).filter((it) => (it.label || '').trim().length > 0),
    [draft.items]
  );

  const handleItemChange = (idx, field, value) => {
    setDraft((prev) => {
      const items = [...(prev.items || [])];
      if (!items[idx]) items[idx] = emptyItem(idx);
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setDraft((prev) => ({
      ...prev,
      items: [...(prev.items || []), emptyItem(prev.items?.length || 0)],
    }));
  };

  const removeItem = (idx) => {
    setDraft((prev) => {
      const items = [...(prev.items || [])];
      items.splice(idx, 1);
      return { ...prev, items: items.length ? items : [emptyItem(0)] };
    });
  };

  const moveItem = (from, delta) => {
    setDraft((prev) => {
      const items = [...(prev.items || [])];
      const to = from + delta;
      if (to < 0 || to >= items.length) return prev;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...prev, items };
    });
  };

  const handleSave = async () => {
    setError('');
    if (!hasName) {
      setError('Name is required');
      return;
    }
    const trimmedItems = validItems.map((it, idx) => ({
      id: it.id ?? null,
      label: it.label.trim(),
      required: Boolean(it.required),
      order_index: idx,
    }));
    if (!trimmedItems.length) {
      setError('Add at least one checklist item');
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description?.trim() || '',
      is_required: Boolean(draft.is_required),
      is_active: draft.is_active !== false,
      items: trimmedItems,
    };
    try {
      setSaving(true);
      await onSave?.(payload);
    } catch (e) {
      setError(e?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-800">
            {template ? 'Edit checklist template' : 'New checklist template'}
          </div>
          <div className="text-xs text-neutral-500">
            Configure required or optional checklists.
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutral-500 underline"
        >
          Cancel
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-600">Name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="Standard Mowing"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-neutral-600">Checklist required to complete job?</label>
          <input
            type="checkbox"
            checked={draft.is_required}
            onChange={(e) => setDraft((p) => ({ ...p, is_required: e.target.checked }))}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-neutral-600">Description</label>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
          placeholder="Basic lawn service checklist"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="tmpl-active"
          type="checkbox"
          checked={draft.is_active !== false}
          onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))}
        />
        <label htmlFor="tmpl-active" className="text-sm text-neutral-700">Active</label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-800">Checklist items</div>
          <button
            type="button"
            onClick={addItem}
            className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-neutral-50"
          >
            Add item
          </button>
        </div>

        <div className="space-y-2">
          {(draft.items || []).map((item, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-2 bg-neutral-50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500">Item {idx + 1}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-[11px] px-2 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-[11px] px-2 py-1 rounded border bg-white disabled:opacity-50"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === (draft.items?.length || 1) - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-[11px] px-2 py-1 rounded border bg-white"
                    onClick={() => removeItem(idx)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={item.label}
                onChange={(e) => handleItemChange(idx, 'label', e.target.value)}
                placeholder="Mow front yard"
              />
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(e) => handleItemChange(idx, 'required', e.target.checked)}
                />
                Required item?
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border text-sm bg-white hover:bg-neutral-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </div>
    </div>
  );
}

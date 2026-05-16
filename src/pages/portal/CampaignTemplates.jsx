import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import Toast from '../../components/Toast';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
} from '../../api/campaignTemplates';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CampaignTemplates() {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', duration: 2400 });

  const showToast = (msg, duration = 2400) => setToast({ show: true, msg, duration });
  const closeToast = () => setToast((t) => ({ ...t, show: false }));

  const authHeader = useCallback(async () => ({}), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = await authHeader();
      const data = await listTemplates(headers);
      const list = Array.isArray(data?.templates) ? data.templates : Array.isArray(data) ? data : [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { load(); }, [load]);

  const startNew = () =>
    setEditing({ id: null, name: '', vertical: '', message_body: '', active: true });
  const startEdit = (t) =>
    setEditing({
      id: t.id,
      name: t.name || '',
      vertical: t.vertical || '',
      message_body: t.message_body || t.messageBody || '',
      active: t.active !== false,
    });

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError('Name required');
      return;
    }
    setSaving(true);
    try {
      const headers = await authHeader();
      const payload = {
        name: editing.name.trim(),
        vertical: editing.vertical?.trim() || null,
        message_body: editing.message_body?.trim() || '',
        is_active: editing.active !== false,
      };
      if (editing.id) {
        await updateTemplate(editing.id, payload, headers);
        showToast('Template updated');
      } else {
        await createTemplate(payload, headers);
        showToast('Template created');
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const header = useMemo(() => ({
    title: 'Campaign templates',
    subtitle: 'Reusable messaging for your organization.',
  }), []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <Toast show={toast.show} duration={toast.duration} onClose={closeToast}>{toast.msg}</Toast>

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase text-neutral-500">Campaigns</div>
          <h1 className="text-2xl font-bold">{header.title}</h1>
          <div className="text-sm text-neutral-600">{header.subtitle}</div>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {editing ? (
        <div className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm space-y-1">
              <span className="text-neutral-700">Name</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="Winterization template"
              />
            </label>
            <label className="text-sm space-y-1">
              <span className="text-neutral-700">Vertical</span>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={editing.vertical}
                onChange={(e) => setEditing((p) => ({ ...p, vertical: e.target.value }))}
                placeholder="Lawn care"
              />
            </label>
          </div>
          <label className="text-sm space-y-1">
            <span className="text-neutral-700">Message body</span>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows="3"
              value={editing.message_body}
              onChange={(e) => setEditing((p) => ({ ...p, message_body: e.target.value }))}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!editing.active}
              onChange={(e) => setEditing((p) => ({ ...p, active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-3 py-2 rounded border text-sm bg-white hover:bg-neutral-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
          </div>
        ) : items.length === 0 ? (
          <div className="text-neutral-700">No templates yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((t) => (
              <div key={t.id} className="border rounded-lg p-3 bg-neutral-50">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1 text-sm text-neutral-800">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-neutral-600">{t.vertical || '—'}</div>
                    <div className="text-neutral-700">{t.message_body || t.messageBody}</div>
                    <div className="text-xs text-neutral-600">{t.active === false ? 'Inactive' : 'Active'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    className="inline-flex items-center px-3 py-2 rounded-lg border text-sm hover:bg-white"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

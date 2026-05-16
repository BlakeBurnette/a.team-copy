// src/pages/settings/Checklists.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import ChecklistTemplateEditor from '../../components/checklists/ChecklistTemplateEditor';
import ChecklistServiceAttachModal from '../../components/checklists/ChecklistServiceAttachModal';

const Toggle = ({ checked, onChange, disabled }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={!!checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span className="text-sm text-neutral-700">{checked ? 'On' : 'Off'}</span>
  </label>
);

export default function ChecklistsSettings() {
  const headers = useMemo(() => ({}), []);
  const [settings, setSettings] = useState({ enabled: false });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [attachModal, setAttachModal] = useState({ open: false, template: null });

  const loadSettings = async () => {
    setSettingsLoading(true);
    setError('');
    try {
      const res = await axios.get('/api/checklists/settings', {
        headers,
        withCredentials: true,
        validateStatus: () => true,
      });
      const { data, status } = res;
      if (status === 404) {
        setSettings({ enabled: false });
        setError('Checklists are not available in this environment.');
      } else if (status >= 200 && status < 300) {
        setSettings({ enabled: Boolean(data?.enabled) });
      } else {
        setError(data?.error || 'Failed to load checklist settings');
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load checklist settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!settings.enabled) {
      setTemplates([]);
      return;
    }
    setTemplatesLoading(true);
    setError('');
    try {
      const { data } = await axios.get('/api/checklist-templates', {
        headers,
        withCredentials: true,
      });
      const list = Array.isArray(data) ? data : Array.isArray(data?.templates) ? data.templates : [];
      setTemplates(list);
    } catch (e) {
      setTemplates([]);
      setError(e?.response?.data?.error || 'Failed to load checklist templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings.enabled) loadTemplates();
    else setTemplates([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled]);

  const handleToggle = async (enabled) => {
    setSettings((s) => ({ ...s, enabled }));
    try {
      await axios.put(
        '/api/checklists/settings',
        { enabled },
        { headers, withCredentials: true }
      );
      if (enabled) loadTemplates();
      else setEditing(null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update settings');
      setSettings((s) => ({ ...s, enabled: !enabled }));
    }
  };

  const handleSaveTemplate = async (payload) => {
    setError('');
    const isEdit = Boolean(editing?.id);
    const url = isEdit ? `/api/checklist-templates/${editing.id}` : '/api/checklist-templates';
    const method = isEdit ? 'put' : 'post';
    await axios[method](url, payload, { headers, withCredentials: true });
    setEditing(null);
    await loadTemplates();
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirm = window.confirm('Delete this checklist template?');
    if (!confirm) return;
    try {
      await axios.delete(`/api/checklist-templates/${id}`, { headers, withCredentials: true });
      await loadTemplates();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to delete template');
    }
  };

  const enabled = settings.enabled;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-800">Enable checklists</div>
          <div className="text-xs text-neutral-600">
            Turn on to require or suggest checklists for scheduled jobs.
          </div>
        </div>
        <Toggle
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={settingsLoading}
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {enabled ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-800">Checklist templates</div>
              <div className="text-xs text-neutral-600">Attach templates to job types; required templates gate completion.</div>
            </div>
            <button
              type="button"
              onClick={() => setEditing({ id: null })}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-neutral-50 text-sm"
            >
              Add checklist template
            </button>
          </div>

          {templatesLoading ? (
            <div className="text-sm text-neutral-600">Loading templates…</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-neutral-600">No checklist templates yet.</div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="min-w-full divide-y">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Required?</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Active?</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
          {templates.map((t) => (
            <tr key={t.id}>
              <td className="px-3 py-2 text-sm text-neutral-800">{t.name}</td>
              <td className="px-3 py-2 text-sm text-neutral-700">{t.description || '—'}</td>
              <td className="px-3 py-2 text-sm text-neutral-700">{t.is_required ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 text-sm text-neutral-700">{t.is_active !== false ? 'Yes' : 'No'}</td>
              <td className="px-3 py-2 text-sm text-neutral-700 space-x-2">
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="text-emerald-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setAttachModal({ open: true, template: t })}
                  className="text-emerald-700 hover:underline"
                >
                  Manage services
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
                </tbody>
              </table>
            </div>
          )}

          {editing && (
            <ChecklistTemplateEditor
              template={editing && editing.id ? editing : null}
              onSave={handleSaveTemplate}
              onCancel={() => setEditing(null)}
            />
          )}
          {attachModal.open && (
            <ChecklistServiceAttachModal
              template={attachModal.template}
              open={attachModal.open}
              onClose={async (changed) => {
                setAttachModal({ open: false, template: null });
                if (changed) await loadTemplates();
              }}
            />
          )}
        </div>
      ) : (
        <div className="text-sm text-neutral-600">Checklists are disabled for this organization.</div>
      )}
    </div>
  );
}

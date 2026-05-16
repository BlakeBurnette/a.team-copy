// src/components/checklists/ChecklistServiceAttachModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export default function ChecklistServiceAttachModal({ template, open, onClose }) {
  const headers = useMemo(() => ({}), []);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!open || !template?.id) return;
      setLoading(true);
      setError('');
      try {
        const [svcRes, stRes] = await Promise.all([
          axios.get(`/api/checklist-templates/${template.id}/services`, {
            headers,
            withCredentials: true,
            validateStatus: () => true,
          }),
          axios.get(`/api/checklists/${template.id}/service-types`, {
            headers,
            withCredentials: true,
            validateStatus: () => true,
          }),
        ]);

        const svcList = Array.isArray(svcRes.data?.services)
          ? svcRes.data.services
          : Array.isArray(svcRes.data)
            ? svcRes.data
            : [];
        setServices(
          svcList.map((s) => {
            const id = s.id ?? s.service_id;
            return {
              id,
              name: s.name || s.label || `Service ${id}`,
              use: Boolean(s.use ?? s.attached),
              required: Boolean(s.required ?? s.is_required_for_service ?? s.is_required),
            };
          })
        );

        const stList = Array.isArray(stRes.data?.service_types)
          ? stRes.data.service_types
          : Array.isArray(stRes.data)
            ? stRes.data
            : [];
        setServiceTypes(
          stList.map((s) => {
            const sid = s.service_type_id ?? s.id ?? s.service_typeId;
            return {
              service_type_id: sid,
              name: s.name || s.label || `Service type ${sid}`,
              use: Boolean(s.use ?? s.attached ?? s.use_for_service_type),
              required: Boolean(s.required ?? s.is_required),
              active: s.active,
            };
          })
        );
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load attachments');
        setServices([]);
        setServiceTypes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, template?.id, headers]);

  const setService = (id, updates) => {
    setServices((prev) =>
      prev.map((s) => (String(s.id) === String(id) ? { ...s, ...updates } : s))
    );
  };
  const setServiceType = (id, updates) => {
    setServiceTypes((prev) =>
      prev.map((s) =>
        String(s.service_type_id) === String(id) ? { ...s, ...updates } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payloadServiceTypes = {
        service_types: serviceTypes.map((s) => ({
          service_type_id: s.service_type_id,
          use: Boolean(s.use),
          required: Boolean(s.required),
        })),
      };
      const payloadServices = {
        services: services.map((s) => ({
          service_id: s.id,
          use: Boolean(s.use),
          required: Boolean(s.required),
        })),
      };
      await axios.post(`/api/checklists/${template.id}/service-types`, payloadServiceTypes, {
        headers,
        withCredentials: true,
      });
      await axios.put(`/api/checklist-templates/${template.id}/services`, payloadServices, {
        headers,
        withCredentials: true,
      });
      onClose?.(true);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save attachments');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[min(96vw,720px)] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-800">Attach to services</div>
            <div className="text-xs text-neutral-600">Checklist: {template.name}</div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.(false)}
            className="text-neutral-500 hover:text-neutral-700 text-sm"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {loading ? (
            <div className="text-sm text-neutral-600">Loading attachments…</div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-neutral-800">Attach to service types (defaults)</div>
                <div className="text-xs text-neutral-500">Changes apply to jobs scheduled from tomorrow onward.</div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {serviceTypes.length === 0 ? (
                    <div className="text-sm text-neutral-600">No service types available.</div>
                  ) : (
                    serviceTypes.map((s) => (
                      <div
                        key={s.service_type_id}
                        className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-50"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-neutral-800">{s.name}</div>
                          <div className="text-xs text-neutral-500">
                            ID: {s.service_type_id}
                            {s.active === false ? ' • Inactive' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={s.use}
                              onChange={(e) => setServiceType(s.service_type_id, { use: e.target.checked })}
                            />
                            Use this checklist
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={s.required}
                              onChange={(e) =>
                                setServiceType(s.service_type_id, {
                                  required: e.target.checked,
                                  use: true,
                                })
                              }
                              disabled={!s.use}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-neutral-800 mt-2">Attach to individual services (one-off)</div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {services.length === 0 ? (
                    <div className="text-sm text-neutral-600">No services available.</div>
                  ) : (
                    services.map((s) => (
                      <div
                        key={s.id}
                        className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-neutral-50"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-neutral-800">{s.name}</div>
                          <div className="text-xs text-neutral-500">ID: {s.id}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={s.use}
                              onChange={(e) => setService(s.id, { use: e.target.checked })}
                            />
                            Use this checklist
                          </label>
                          <label className="flex items-center gap-2 text-sm text-neutral-700">
                            <input
                              type="checkbox"
                              checked={s.required}
                              onChange={(e) => setService(s.id, { required: e.target.checked, use: true })}
                              disabled={!s.use}
                            />
                            Required
                          </label>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose?.(false)}
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
            {saving ? 'Saving…' : 'Save attachments'}
          </button>
        </div>
      </div>
    </div>
  );
}

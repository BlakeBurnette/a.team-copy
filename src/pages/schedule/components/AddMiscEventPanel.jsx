// src/pages/schedule/components/AddMiscEventPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext.jsx';
import Dropdown from '../../../components/Dropdown';
import MobileSafeDate from '../../../components/MobileSafeDate';
import { startOfToday } from 'date-fns';
import { ymd, labelTime, toHHMM } from '../scheduleUtils';
import Toast from '../../../components/Toast';

export default function AddMiscEventPanel({ teamOptions = [], orgBusinessHours = {}, onSuccess }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const [toast, setToast] = useState({ show: false, message: '', duration: 2500 });
  const showToast = (message, duration = 2500) =>
    setToast({ show: true, message, duration });

  const headersAuth = async () => {
    return {};
  };

  const [open, setOpen] = useState(false);
  const [miscForm, setMiscForm] = useState({
    title: '',
    date: ymd(startOfToday()),
    duration: 60,
    startMinutes: null,
    notes: '',
  });
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [slots, setSlots] = useState([]);

  const teamOptionsWithUnassigned = useMemo(
    () => [{ value: '', label: '— Unassigned —' }, ...teamOptions],
    [teamOptions]
  );

  // fetch available times whenever open/date/duration changes
  useEffect(() => {
    (async () => {
      if (!open) return;
      if (!miscForm?.date || !miscForm?.duration) {
        setSlots([]);
        return;
      }
      try {
        const headers = await headersAuth();
        const svcMin = Number(miscForm.duration) || 60;
        const { data } = await axios.get('/api/owner/available-times', {
          headers,
          withCredentials: true,
          params: { date: miscForm.date, service_minutes: svcMin },
        });
        const s = Array.isArray(data?.slots) ? data.slots.map(Number) : [];
        setSlots(s);
      } catch (e) {
        setSlots([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, miscForm.date, miscForm.duration]);

  const onAddMisc = async () => {
    const title = miscForm.title.trim();
    const dur = Number(miscForm.duration);

    if (!title) return showToast('Title is required', 2500);
    if (!Number.isFinite(dur) || dur <= 0) return showToast('Duration (minutes) must be > 0', 2500);

    try {
      const headers = await headersAuth();
      await axios.post('/api/owner/misc-events', {
        title,
        date: miscForm.date,
        start_time: miscForm.startMinutes == null ? null : toHHMM(miscForm.startMinutes),
        duration_minutes: dur,
        notes: miscForm.notes || null,
        team_id: selectedTeamId ? Number(selectedTeamId) : null,
      }, { headers, withCredentials: true });

      setMiscForm({
        title: '',
        date: ymd(startOfToday()),
        duration: 60,
        startMinutes: null,
        notes: '',
      });
      setSlots([]);
      setOpen(false);

      showToast('Misc event added', 2000);
      await onSuccess?.();
    } catch (e) {
      showToast(e?.response?.data?.error || 'Failed to add event', 3500);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Add Misc Event</h2>
        <button
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded border"
          type="button"
          aria-expanded={open}
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {open ? 'Close' : 'New'}
        </button>
      </div>

      {open && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-neutral-600 mb-1">Title</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Team meeting, supply run, etc."
              value={miscForm.title}
              onChange={(e) => setMiscForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Date</label>
            <MobileSafeDate
              label="Date"
              value={miscForm.date}
              onChange={(v) => setMiscForm(f => ({ ...f, date: v }))}
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-600 mb-1">Duration (minutes)</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-3 py-2"
              value={miscForm.duration}
              onChange={(e) => setMiscForm(f => ({ ...f, duration: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              label="Start time (optional)"
              options={(slots || []).map((min) => ({ value: Number(min), label: labelTime(min) }))}
              value={miscForm.startMinutes ?? ''}
              onChange={(v) => setMiscForm(f => ({ ...f, startMinutes: v === '' ? null : Number(v) }))}
              placeholder="Unassigned / Unscheduled"
            />
            <div className="text-xs text-neutral-500 mt-1">Available times are filtered to avoid conflicts.</div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-neutral-600 mb-1">Notes</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Optional"
              value={miscForm.notes}
              onChange={(e) => setMiscForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Dropdown
              label="Team (optional)"
              options={teamOptionsWithUnassigned}
              value={selectedTeamId}
              onChange={(v) => setSelectedTeamId(String(v ?? ''))}
              placeholder="— Unassigned —"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-end">
            <button
              type="button"
              onClick={onAddMisc}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-600 text-white hover:bg-blue-700 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Add Misc Event
            </button>
          </div>
        </div>
      )}

      <Toast show={toast.show} duration={toast.duration} onClose={() => setToast(t => ({ ...t, show: false }))}>
        {toast.message}
      </Toast>
    </div>
  );
}

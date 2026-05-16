// src/pages/schedule/components/NeedsAttentionPanel.jsx
import React from 'react';
import axios from 'axios';
import { AlertTriangle, Repeat, XCircle } from 'lucide-react';
import { useUserProfile, useAuth } from '../../../context/AuthContext.jsx';

function ymd(d) { return d.toISOString().slice(0,10); }

export default function NeedsAttentionPanel({ rangeFrom, rangeTo, onJumpToDate }) {
  const { user, roles = [], permissions = [], refreshMe } = useAuth() || {};
  const { profile } = useUserProfile() || {};
  const role = String(profile?.role || '').toLowerCase();

  const canSee =
    role === 'owner' || role === 'crew_owner' || role === 'crew_leader';

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (!canSee) return;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const { data } = await axios.get('/api/users/reschedule-requests', {
          withCredentials: true,
          params: {
            status: 'requested',
            from: ymd(rangeFrom),
            to: ymd(rangeTo),
          },
        });
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
      } catch (e) {
        setErr(e?.response?.data?.error || 'Failed to load requests');
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [canSee, rangeFrom, rangeTo]);

  if (!canSee) return null;
  if (loading) return null;
  if (err) return null;
  if (!items.length) return null;

  // Show up to 3 inline; rest as a "+N more"
  const top = items.slice(0, 3);
  const more = items.length - top.length;

  const iconFor = (a) =>
    a === 'cancel'
      ? <XCircle className="w-4 h-4 shrink-0" />
      : <Repeat className="w-4 h-4 shrink-0" />;

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 sm:p-4">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-amber-900 font-semibold">
            Customer requests need attention ({items.length})
          </div>
          <div className="mt-1 text-sm text-amber-900/90 space-y-1">
            {top.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs text-amber-900">
                  {iconFor(r.action)}
                  {r.action === 'cancel' ? 'Cancel' : 'Reschedule'}
                </span>
                <button
                  type="button"
                  className="underline underline-offset-2 hover:opacity-80"
                  onClick={() => onJumpToDate?.(r.date)}
                  title="Jump to date in schedule"
                >
                  {r.date}
                </button>
                <span className="truncate">
                  — {r.service_label || 'Service'}
                  {r.user_email ? ` · ${r.user_email}` : ''}
                </span>
              </div>
            ))}
            {more > 0 && (
              <div className="text-xs text-amber-900/80">
                +{more} more in this range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

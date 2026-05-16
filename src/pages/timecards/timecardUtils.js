export function formatMinutes(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n) || n < 0) return '0:00';
  const h = Math.floor(n / 60);
  const m = Math.floor(n % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export function filterUsersForScope(users, scope, userId) {
  if (!Array.isArray(users)) return [];
  if (scope !== 'self' || !userId) return users;
  return users.filter((u) => Number(u?.user_id) === Number(userId));
}

export function shouldShowTeamTotals(scope) {
  return scope !== 'self';
}

export function buildExportSchedulePayload(form) {
  return {
    timecard_export_frequency: form.timecard_export_frequency,
    timecard_export_weekdays: Array.isArray(form.timecard_export_weekdays)
      ? form.timecard_export_weekdays.map(Number)
      : [],
    timecard_export_day_of_month:
      form.timecard_export_day_of_month != null
        ? Number(form.timecard_export_day_of_month)
        : undefined,
    timecard_export_timezone: form.timecard_export_timezone || undefined,
  };
}

export function trustDisplay(trust_status, anchored_at) {
  const status = (trust_status || '').toLowerCase();
  if (anchored_at) return 'anchored';
  if (status === 'pending' || status === 'processing') return 'pending';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status) return status;
  return 'none';
}

// Minimal stub to satisfy imports; availability is now backend-driven.
import { addDays, format, isValid, parseISO, getDay } from 'date-fns';

export function buildRescheduleOptions(occ = {}, _org = null, opts = {}) {
  const horizon = Number.isFinite(opts.horizonDays) ? opts.horizonDays : 60;
  const baseIso = String(occ?.date || '').slice(0, 10);
  const start = isValid(parseISO(baseIso)) ? parseISO(baseIso) : new Date();
  const options = [];
  for (let i = 0; i < horizon; i++) {
    const d = addDays(start, i);
    options.push({ value: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE, MMM d') });
  }
  return { options, label: 'All days' };
}

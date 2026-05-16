import { format } from 'date-fns';

export const ymd = (d) => format(d, 'yyyy-MM-dd');
export const keyFor = (ruleId, date) => `${ruleId}|${date}`;

export const labelTime = (minsNullable) => {
  if (minsNullable == null) return 'Unscheduled';
  const mins = Number(minsNullable);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const toHHMM = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

// “Card on file” detector (works with embedded customer or candidate shapes)
export function detectHasCard(customerLike) {
  const c = customerLike || {};

  if (c.has_card_on_file === true) return true;

  const truthyKeys = [
    'has_card_on_file', 'card_on_file',
    'has_default_pm', 'default_pm',
    'default_payment_method', 'default_payment_method_id', 'default_pm_id',
    'default_source', 'stripe_default_pm', 'platform_default_pm',
    'connect_default_pm', 'stripe_customer_default_pm', 'stripe_customer_default_source',
  ];
  for (const k of truthyKeys) {
    const v = c[k];
    if (v === true) return true;
    if (typeof v === 'string' && v.trim()) return true;
    if (typeof v === 'number' && Number.isFinite(v)) return true;
  }

  const nested = [
    c?.invoice_settings?.default_payment_method,
    c?.billing?.default_payment_method,
    c?.stripe?.invoice_settings?.default_payment_method,
    c?.stripe_customer?.invoice_settings?.default_payment_method,
    c?.stripe_customer?.default_source,
  ];
  if (nested.some(Boolean)) return true;

  if (Array.isArray(c.payment_methods) && c.payment_methods.length > 0) return true;
  if (Array.isArray(c.sources) && c.sources.length > 0) return true;
  if (typeof c.payment_methods_count === 'number' && c.payment_methods_count > 0) return true;

  return false;
}

export const teamLabelOf = (occ, teams) => {
  const id = occ?.team_id ?? null;
  if (id == null) return '— Unassigned —';
  const hit = (teams || []).find(t => Number(t.id) === Number(id));
  return hit ? hit.name : `Team ${id}`;
};

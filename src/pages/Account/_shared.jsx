// Shared UI + helpers for Account tabs
import React from 'react';

export const FieldLabel = ({ children }) => (
  <label className="block mb-1 font-semibold">{children}</label>
);

export const Card = ({ title, children, actions }) => (
  <div className="bg-white rounded-lg shadow border border-neutral-200">
    <div className="px-4 py-3 border-b">
      <h3 className="text/base font-semibold">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
    {actions && <div className="px-4 py-3 border-t flex gap-2 flex-wrap">{actions}</div>}
  </div>
);

export function cx(...xs){ return xs.filter(Boolean).join(' '); }

export const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
export const DAY_LABEL = {
  sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday'
};

const NAME_TO_KEY = {
  Sunday: 'sun', Monday: 'mon', Tuesday: 'tue', Wednesday: 'wed',
  Thursday: 'thu', Friday: 'fri', Saturday: 'sat',
  Sun:'sun', Mon:'mon', Tue:'tue', Wed:'wed', Thu:'thu', Fri:'fri', Sat:'sat'
};

export const normalizeHours = (raw) => {
  const out = {}; DAY_KEYS.forEach(k => (out[k] = { open:null, close:null, closed:true }));
  if (!raw || typeof raw !== 'object') return out;
  const str = (x) => (x == null ? null : (String(x).trim() || null));
  const toBool = (x) => {
    if (typeof x === 'boolean') return x;
    if (x == null) return undefined;
    const s = String(x).toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    return undefined;
  };
  for (const [k0, v0] of Object.entries(raw)) {
    const low = String(k0).toLowerCase();
    let key = DAY_KEYS.includes(low) ? low : (NAME_TO_KEY[k0] || NAME_TO_KEY[k0?.replace(/\b\w/g, c => c.toUpperCase())] || null);
    if (!key) {
      const short = String(k0).slice(0,3);
      key = DAY_KEYS.includes(short.toLowerCase()) ? short.toLowerCase() : null;
    }
    if (!key) continue;
    const v = (typeof v0 === 'object' && v0) ? v0 : {};
    let open  = v.open ?? v.start ?? v.open_time ?? v.from ?? null;
    let close = v.close ?? v.end   ?? v.close_time ?? v.to   ?? null;
    open = str(open); close = str(close);
    const hasAny = !!(open || close);
    const explicitClosed = toBool(v.closed);
    const closed = explicitClosed !== undefined ? explicitClosed : !hasAny;
    out[key] = { open, close, closed };
  }
  return out;
};

export const money = (cents, currency = 'USD') =>
  typeof cents === 'number' && cents > 0
    ? (cents / 100).toLocaleString(undefined, { style: 'currency', currency })
    : null;

export const useAuthHeader = () =>
  React.useMemo(() => ({}), []);

/** Returns true when viewport is below Tailwind md (<= 767px) */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return isMobile;
};

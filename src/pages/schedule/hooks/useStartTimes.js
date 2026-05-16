// hooks/useStartTimes.js
import { useEffect, useState } from 'react';
import { getStartTimes } from '../lib/api';
import { ymd } from '../lib/scheduleUtilsProxy';
import { keyFor } from '../lib/scheduleUtilsProxy';


export default function useStartTimes(headersFn, rangeFrom, rangeTo) {
const [startTimes, setStartTimes] = useState(() => new Map());


useEffect(() => {
let active = true;
(async () => {
try {
const headers = await headersFn();
const raw = await getStartTimes(headers, ymd(rangeFrom), ymd(rangeTo));
const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items)) ? raw.items : [];
const m = new Map();
items.forEach(r => {
if (!r) return;
const rule_id = Number(r.rule_id);
const date = String(r.date);
const rawM = r.start_minutes ?? r.start_time_minutes ?? r.start_time ?? null;
const mins = rawM == null ? null : Number(rawM);
if (Number.isFinite(rule_id) && date) m.set(keyFor(rule_id, date), mins);
});
if (active) setStartTimes(m);
} catch (e) {
console.warn('[Schedule] start-times load failed', e?.response?.data || e);
}
})();
return () => { active = false; };
}, [headersFn, rangeFrom, rangeTo]);


return { startTimes, refreshStartTimes: async () => {
const headers = await headersFn();
const raw = await getStartTimes(headers, ymd(rangeFrom), ymd(rangeTo));
const items = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.items)) ? raw.items : [];
const m = new Map();
items.forEach(r => {
if (!r) return;
const rule_id = Number(r.rule_id);
const date = String(r.date);
const rawM = r.start_minutes ?? r.start_time_minutes ?? r.start_time ?? null;
const mins = rawM == null ? null : Number(rawM);
if (Number.isFinite(rule_id) && date) m.set(keyFor(rule_id, date), mins);
});
setStartTimes(m);
} };
}

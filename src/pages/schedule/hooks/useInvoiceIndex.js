// hooks/useInvoiceIndex.js
import { useState, useCallback } from 'react';
import { getInvoicesForCustomer } from '../lib/api';


export default function useInvoiceIndex(headersFn) {
const [invoiceIndex, setInvoiceIndex] = useState({});


const buildInvoiceIndex = useCallback(async (rows) => {
const ids = [...new Set(rows.map(o => o?.customer?.id).filter((v) => Number.isFinite(v) && v > 0))];
if (!ids.length) {
setInvoiceIndex({});
return;
}
try {
const headers = await headersFn();
const results = await Promise.all(ids.map(async (cid) => {
try {
const data = await getInvoicesForCustomer(headers, cid);
return [cid, Array.isArray(data) ? data : []];
} catch {
return [cid, []];
}
}));
setInvoiceIndex(Object.fromEntries(results));
} catch {}
}, [headersFn]);


const statusForOccurrence = useCallback((occ) => {
if (!occ) return { status: 'unpaid' };
const cid = occ?.customer?.id;
const invs = invoiceIndex[cid] || [];
if (!invs.length) return { status: 'unpaid' };
const d = occ.date;
const hit = invs.find(iv => {
const ps = String(iv.period_start || '').slice(0, 10);
const pe = String(iv.period_end || '').slice(0, 10);
return ps && pe && ps <= d && d <= pe;
});
if (!hit) return { status: 'unpaid' };
const s = String(hit.status || '').toLowerCase();
if (['paid', 'succeeded'].includes(s)) return { status: 'paid' };
if (['processing', 'requires_action', 'requires_confirmation', 'pending'].includes(s)) return { status: 'pending' };
if (['failed', 'void'].includes(s)) return { status: 'failed' };
return { status: 'unpaid' };
}, [invoiceIndex]);


return { invoiceIndex, setInvoiceIndex, buildInvoiceIndex, statusForOccurrence };
}

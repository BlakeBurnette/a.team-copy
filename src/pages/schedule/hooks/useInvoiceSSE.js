// schedule/hooks/useInvoiceSSE.js
import { useEffect, useRef, useState } from 'react';
import { keyFor } from '../lib/scheduleUtilsProxy';
import { startSSE } from '../../../utils/sse';

function normalizeInvoiceEventPayload(raw = {}) {
  // Accept shapes:
  // 1) { invoice_id, status, rule_id, date, customer_id, period_start, period_end }
  // 2) { invoice, status }  (invoice may be number or object)
  // 3) { invoice: {... full invoice ...} }
  let payload = raw;

  // If server sent { invoice: <number> } use that id
  if (typeof raw?.invoice === 'number') {
    payload = { ...raw, invoice_id: raw.invoice };
  }

  // If server sent { invoice: {...} } flatten it
  if (raw && typeof raw.invoice === 'object' && raw.invoice !== null) {
    payload = { ...raw, ...raw.invoice };
    if (!payload.invoice_id && payload.id != null) payload.invoice_id = payload.id;
  }

  // normalize keys
  const invoice_id = Number(payload.invoice_id ?? payload.id ?? 0) || null;
  const status = String(payload.status ?? payload.invoice_status ?? '').toLowerCase() || null;
  const rule_id = payload.rule_id != null ? Number(payload.rule_id) : null;
  const date = payload.date ? String(payload.date).slice(0, 10) : null;

  // window match fallback
  const customer_id = payload.customer_id != null ? Number(payload.customer_id) : null;
  const period_start = payload.period_start ? String(payload.period_start).slice(0, 10) : null;
  const period_end   = payload.period_end   ? String(payload.period_end).slice(0, 10)   : null;

  return { invoice_id, status, rule_id, date, customer_id, period_start, period_end, raw: payload };
}

/**
 * Subscribes to invoice updates. Keeps `invoiceIndex` fresh and toggles `pendingKeys` inside the active window.
 *
 * @param {number|null|undefined} orgId                    // optional (server can infer via session)
 * @param {Function} setInvoiceIndex                       // React setState for invoice index (by customer_id)
 * @param {{ rangeFrom: Date, rangeTo: Date }} windowMeta  // active UI window (for pending pill matching)
 */
export default function useInvoiceSSE(orgId, setInvoiceIndex, { rangeFrom, rangeTo }) {
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const occurrencesRef = useRef([]);

  const setOccurrencesRef = (rows) => { occurrencesRef.current = rows || []; };

  useEffect(() => {
    let sub;
    let mounted = true;

    (async () => {
      // orgId is optional; server can resolve org from session cookie
      sub = startSSE({
        orgId: orgId ?? undefined,
        onEvent: ({ type, data }) => {
          // Accept both event names
          if (type !== 'invoice_updated' && type !== 'invoice.updated') return;

          const {
            invoice_id, status, rule_id, date,
            customer_id, period_start, period_end, raw
          } = normalizeInvoiceEventPayload(data);

          if (!invoice_id && !customer_id) return; // nothing to patch

          // ---- patch invoiceIndex (bucketed by customer_id)
          const invObj = {
            id: invoice_id ?? raw?.id ?? null,
            status,
            customer_id,
            period_start,
            period_end,
            ...(raw || {}),
          };

          if (customer_id) {
            setInvoiceIndex((prev) => {
              const list = Array.isArray(prev[customer_id]) ? [...prev[customer_id]] : [];
              const idx = list.findIndex((x) => String(x.id) === String(invObj.id));
              if (idx >= 0) list[idx] = { ...list[idx], ...invObj };
              else if (invObj.id) list.unshift(invObj);
              return { ...prev, [customer_id]: list };
            });
          }

          // ---- toggle pending pill inside the active window (primary path)
          setPendingKeys((prevSet) => {
            const next = new Set(prevSet);

            const clearStatuses = new Set(['paid','succeeded','failed','void','refunded','open','scheduled','sent']);
            const isPendingish = status === 'processing' || status === 'pending';

            // Fast path: direct occurrence identity
            if (rule_id && date) {
              const k = keyFor(rule_id, date);
              if (isPendingish) next.add(k);
              if (clearStatuses.has(status)) next.delete(k);
              return next;
            }

            // Fallback: window match (customer + period)
            if (customer_id && period_start && period_end) {
              for (const occ of occurrencesRef.current) {
                if (Number(occ?.customer?.id) !== customer_id) continue;
                const d = String(occ.date);
                if (period_start <= d && d <= period_end) {
                  const k = keyFor(occ.rule_id, occ.date);
                  if (isPendingish) next.add(k);
                  if (clearStatuses.has(status)) next.delete(k);
                }
              }
              return next;
            }

            return next;
          });

          // ---- Secondary fallback: if we ONLY got { invoice_id, status }, still try to reconcile locally
          if (invoice_id && !customer_id && !rule_id) {
            // 1) Try to find this invoice in existing invoiceIndex and update its status
            setInvoiceIndex((prev) => {
              let patched = false;
              const next = { ...prev };

              for (const cid of Object.keys(prev)) {
                const list = Array.isArray(prev[cid]) ? [...prev[cid]] : [];
                const idx = list.findIndex((x) => String(x.id) === String(invoice_id));
                if (idx >= 0) {
                  // Update status
                  list[idx] = { ...list[idx], status: status || list[idx]?.status };
                  next[cid] = list;
                  patched = true;

                  // 2) If period info exists on that invoice, clear pending pills in that window
                  const ps = String(list[idx]?.period_start || '').slice(0, 10);
                  const pe = String(list[idx]?.period_end   || '').slice(0, 10);
                  if (ps && pe) {
                    setPendingKeys((prevSet) => {
                      const s = new Set(prevSet);
                      const clearStatuses = new Set(['paid','succeeded','failed','void','refunded','open','scheduled','sent']);
                      if (clearStatuses.has(status)) {
                        for (const occ of occurrencesRef.current) {
                          if (Number(occ?.customer?.id) !== Number(cid)) continue;
                          const d = String(occ.date);
                          if (ps <= d && d <= pe) {
                            s.delete(keyFor(occ.rule_id, occ.date));
                          }
                        }
                      }
                      return s;
                    });
                  }
                  break;
                }
              }
              return patched ? next : prev;
            });

            // 3) Clear tiny global pending cache for this invoice id (if present)
            if (typeof window !== 'undefined') {
              window.__payPending = window.__payPending || {};
              delete window.__payPending[invoice_id];
            }
          }
        },
      });
    })();

    return () => {
      // eslint-disable-next-line no-unused-vars
      mounted = false;
      try { sub?.close?.(); } catch {}
    };
    // Reconnect if org changes or window bounds change (safe)
  }, [orgId, rangeFrom, rangeTo, setInvoiceIndex]);

  return { pendingKeys, setPendingKeys, setOccurrencesRef };
}

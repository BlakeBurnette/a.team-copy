// src/hooks/useInvoicesSSE.js
import { useEffect, useRef } from 'react';
import { startSSE } from '../utils/sse';

/**
 * useInvoicesSSE
 *
 * @param {number|null|undefined} orgId  // optional (server can infer from session)
 * @param {{ getInvoices:Function, setInvoices:Function, onToast?:Function, getAccessToken?:Function }} opts
 */
export function useInvoicesSSE(
  orgId,
  { getInvoices, setInvoices, onToast, getAccessToken }
) {
  const subRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Avoid duplicate subscriptions
    if (subRef.current) {
      try { subRef.current.close(); } catch {}
      subRef.current = null;
    }

    (async () => {
      // NOTE: We pass orgId if available, but we do NOT block on it.
      subRef.current = startSSE({
        orgId: orgId ?? undefined,
        onOpen: () => {
          // console.log('[SSE] connected');
        },
        onError: () => {
          // console.warn('[SSE] error');
        },
        onEvent: (evt) => {
          if (!evt || !evt.type) return;
          // Accept both names
          if (!['invoice_updated', 'invoice.updated'].includes(evt.type)) return;

          const { invoice_id, status } = evt.data || {};
          if (!invoice_id) return;

          const curr = Array.isArray(getInvoices?.()) ? getInvoices() : [];
          const idx = curr.findIndex((i) => String(i.id) === String(invoice_id));

          if (idx !== -1) {
            const next = curr.slice();
            next[idx] = { ...next[idx], status };
            setInvoices(next);
            if (status === 'paid' && onToast) onToast(`Invoice #${invoice_id} marked as paid`);
          } else {
            try {
              if (typeof getInvoices?.refetch === 'function') {
                getInvoices.refetch();
              }
            } catch {}
          }
        }
      });
    })();

    return () => {
      mounted = false;
      if (subRef.current) {
        try { subRef.current.close(); } catch {}
        subRef.current = null;
      }
    };
    // We keep orgId in deps so changing org reconnects, but we no longer gate on it.
  }, [orgId, getInvoices, setInvoices, onToast, getAccessToken]);
}

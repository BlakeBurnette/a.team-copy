// src/utils/sse.js
// SSE helper with org scoping, cookie auth, robust auto-reconnect, and normalized event names.

const DEFAULT_BACKOFF_MS = 1000;   // base backoff
const MAX_BACKOFF_MS = 30000;      // ceiling
const HEARTBEAT_TIMEOUT_MS = 45_000; // consider dead if no traffic this long

function buildUrl({ orgId }) {
  const qs = new URLSearchParams();
  if (orgId != null) qs.set('organization_id', String(orgId));
  return `/api/sse?${qs.toString()}`;
}

function nowIso() {
  try { return new Date().toISOString(); } catch { return String(Date.now()); }
}

/**
 * Start a single SSE connection.
 *
 * @param {object} opts
 * @param {number|null} opts.orgId - Organization id to scope broadcast (optional if server infers from user).
 * @param {(evt:{type:string,data:any})=>void} [opts.onEvent] - Unified callback for all known events.
 * @param {()=>void} [opts.onOpen] - Called on successful (re)open.
 * @param {(err:any)=>void} [opts.onError] - Called on error.
 * @returns {{ close:()=>void, addListener:(name,fn)=>void, removeListener:(name,fn)=>void }}
 */
export function startSSE({ orgId = null, onEvent, onOpen, onError } = {}) {
  const url = buildUrl({ orgId });

  let es = null;
  let closed = false;
  let retry = 0;
  let retryTimer = null;
  let lastTrafficAt = Date.now();

  // External listener registry
  const listeners = new Map(); // event -> Set<fn>

  function emit(type, data) {
    try {
      onEvent && onEvent({ type, data });
      const set = listeners.get(type);
      if (set && set.size) {
        for (const fn of set) {
          try { fn(data); } catch {}
        }
      }
    } catch {}
  }

  function clearTimers() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }

  function scheduleReconnect() {
    if (closed) return;
    clearTimers();
    const delay = Math.min(MAX_BACKOFF_MS, DEFAULT_BACKOFF_MS * Math.pow(2, retry));
    retry += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      try { es && es.close(); } catch {}
      open(); // re-open
    }, delay);
  }

  function handleTraffic() {
    lastTrafficAt = Date.now();
  }

  function wire(esObj) {
    // Native .onopen is only for network handshake; we also listen to our 'open' event for payload
    esObj.onopen = () => {
      retry = 0;
      handleTraffic();
      onOpen && onOpen();
      // one concise subscription log (useful alongside server "[sse] open")
      try {
        // eslint-disable-next-line no-console
        console.log('[SSE] subscribed', { at: nowIso(), orgId, withCredentials: true });
      } catch {}
    };

    esObj.onerror = (e) => {
      onError && onError(e);
      scheduleReconnect();
    };

    // Heartbeat comments ":" also count as traffic; browser won't surface them to JS.
    // So we send a periodic 'shift_tick' from server — still, guard with a poller:
    const hbPoll = setInterval(() => {
      if (closed) { clearInterval(hbPoll); return; }
      if (Date.now() - lastTrafficAt > HEARTBEAT_TIMEOUT_MS) {
        try { esObj.close(); } catch {}
        scheduleReconnect();
      }
    }, Math.floor(HEARTBEAT_TIMEOUT_MS / 2));

    // Generic message (no event name)
    esObj.onmessage = (evt) => {
      handleTraffic();
      try { emit('message', JSON.parse(evt.data)); }
      catch { emit('message', evt.data); }
    };

    // Helper to register one event and normalize payload
    const listen = (name, alias) => {
      esObj.addEventListener(name, (evt) => {
        handleTraffic();
        try {
          const data = evt?.data ? JSON.parse(evt.data) : null;
          emit(alias || name, data);
        } catch {
          emit(alias || name, evt?.data);
        }
      });
    };

    // Known events (normalize dots/underscores to "invoice_updated")
    listen('open');
    listen('invoice_updated');
    listen('invoice.updated', 'invoice_updated');
    listen('invoice_paid'); // optional alias

    listen('schedule_updated');
    listen('schedule.updated', 'schedule_updated');
    listen('schedule.removed', 'schedule_removed');
    listen('schedule.completed', 'schedule_completed');
    listen('schedule.skipped', 'schedule_skipped');

    listen('occurrence_updated');
    listen('shift_updated');
    listen('shift_tick');
  }

  function open() {
    clearTimers();
    es = new EventSource(url, { withCredentials: true });
    wire(es);
  }

  function close() {
    closed = true;
    clearTimers();
    try { es && es.close(); } catch {}
  }

  function addListener(eventName, fn) {
    const key = String(eventName || '').trim();
    if (!key || typeof fn !== 'function') return;
    const set = listeners.get(key) || new Set();
    set.add(fn);
    listeners.set(key, set);
  }

  function removeListener(eventName, fn) {
    const set = listeners.get(String(eventName || '').trim());
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(eventName);
  }

  // Kickoff
  open();

  return { close, addListener, removeListener };
}

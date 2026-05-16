export function newTraceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function traceHeaders(traceId) {
  return { 'X-Trace-Id': traceId };
}

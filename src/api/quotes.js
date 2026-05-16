import axios from 'axios';

const dollarsToCents = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
};

const buildPayload = (payload = {}) => {
  const body = { ...payload };
  if (body.price_cents == null) {
    const maybePrice = body.price_display ?? body.priceDisplay ?? body.price;
    const cents = dollarsToCents(maybePrice);
    if (cents != null) body.price_cents = cents;
  }
  delete body.price_display;
  delete body.priceDisplay;
  delete body.price;
  return body;
};

export async function createQuote(payload = {}, headers) {
  const body = buildPayload(payload);
  const { data } = await axios.post('/api/quotes', body, { headers, withCredentials: true });
  return data;
}

export async function getQuote(id, headers) {
  if (!id) throw new Error('quote id is required');
  const { data } = await axios.get(`/api/quotes/${encodeURIComponent(id)}`, { headers, withCredentials: true });
  return data;
}

export async function listOwnerQuotes(params = {}, headers) {
  const status = params.status || 'pending_owner';
  const { data } = await axios.get('/api/quotes', {
    params: { status },
    headers,
    withCredentials: true,
  });
  return data;
}

export async function ownerApproveQuote(id, headers) {
  if (!id) throw new Error('quote id is required');
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(id)}/owner-approve`,
    {},
    { headers, withCredentials: true }
  );
  return data;
}

export async function ownerRejectQuote(id, reason, headers) {
  if (!id) throw new Error('quote id is required');
  const payload = reason ? { reason } : {};
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(id)}/owner-reject`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

// ----- NEW ENDPOINTS -----

// Get full quote with line items and records
export async function getQuoteFull(id, headers) {
  if (!id) throw new Error('quote id is required');
  const { data } = await axios.get(`/api/quotes/${encodeURIComponent(id)}/full`, {
    headers,
    withCredentials: true,
  });
  return data;
}

// Line items
export async function getLineItems(quoteId, headers) {
  if (!quoteId) throw new Error('quote id is required');
  const { data } = await axios.get(`/api/quotes/${encodeURIComponent(quoteId)}/line-items`, {
    headers,
    withCredentials: true,
  });
  return data;
}

export async function createLineItem(quoteId, payload = {}, headers) {
  if (!quoteId) throw new Error('quote id is required');
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(quoteId)}/line-items`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

export async function updateLineItem(quoteId, itemId, payload = {}, headers) {
  if (!quoteId || !itemId) throw new Error('quote id and item id are required');
  const { data } = await axios.put(
    `/api/quotes/${encodeURIComponent(quoteId)}/line-items/${encodeURIComponent(itemId)}`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

export async function deleteLineItem(quoteId, itemId, headers) {
  if (!quoteId || !itemId) throw new Error('quote id and item id are required');
  const { data } = await axios.delete(
    `/api/quotes/${encodeURIComponent(quoteId)}/line-items/${encodeURIComponent(itemId)}`,
    { headers, withCredentials: true }
  );
  return data;
}

// Select tier
export async function selectTier(quoteId, tier, headers) {
  if (!quoteId) throw new Error('quote id is required');
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(quoteId)}/select-tier`,
    { tier },
    { headers, withCredentials: true }
  );
  return data;
}

// Send quote via SMS
export async function sendQuote(quoteId, sendVia = 'sms', headers) {
  if (!quoteId) throw new Error('quote id is required');
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(quoteId)}/send`,
    { send_via: sendVia },
    { headers, withCredentials: true }
  );
  return data;
}

// Request change (customer)
export async function requestChange(quoteId, message, requestedChanges = null, headers) {
  if (!quoteId) throw new Error('quote id is required');
  const { data } = await axios.post(
    `/api/quotes/${encodeURIComponent(quoteId)}/request-change`,
    { message, requested_changes: requestedChanges },
    { headers, withCredentials: true }
  );
  return data;
}

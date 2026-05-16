import axios from 'axios';

const dollarsToCents = (val) => {
  if (val == null) return null;
  const s = String(val).replace(/[^0-9.]/g, '');
  if (!s) return 0;
  const n = Math.round(parseFloat(s) * 100);
  return Number.isFinite(n) ? n : 0;
};

const normalizePayload = (payload = {}) => {
  const body = { ...payload };
  if (body.pricing_mode === 'fixed') {
    if (body.price_cents == null) {
      const cents = dollarsToCents(body.priceDisplay ?? body.price ?? body.price_cents);
      if (cents != null) body.price_cents = cents;
    }
  }
  delete body.priceDisplay;
  delete body.price;
  return body;
};

export async function listAddOnCampaigns(headers) {
  const { data } = await axios.get('/api/campaigns/add-ons', { headers, withCredentials: true });
  return data;
}

export async function createAddOnCampaign(payload = {}, headers) {
  const body = normalizePayload(payload);
  const { data } = await axios.post('/api/campaigns/add-ons', body, { headers, withCredentials: true });
  return data;
}

export async function updateAddOnCampaign(id, payload = {}, headers) {
  if (!id) throw new Error('campaign id is required');
  const body = normalizePayload(payload);
  const { data } = await axios.put(`/api/campaigns/add-ons/${encodeURIComponent(id)}`, body, {
    headers,
    withCredentials: true,
  });
  return data;
}

export async function pauseAddOnCampaign(id, headers) {
  if (!id) throw new Error('campaign id is required');
  const { data } = await axios.post(
    `/api/campaigns/add-ons/${encodeURIComponent(id)}/pause`,
    {},
    { headers, withCredentials: true }
  );
  return data;
}

export async function resumeAddOnCampaign(id, headers) {
  if (!id) throw new Error('campaign id is required');
  const { data } = await axios.post(
    `/api/campaigns/add-ons/${encodeURIComponent(id)}/resume`,
    {},
    { headers, withCredentials: true }
  );
  return data;
}

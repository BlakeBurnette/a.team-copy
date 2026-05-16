import axios from 'axios';

// User settings
export async function fetchUserSettings(headers) {
  const { data } = await axios.get('/api/user/settings', { headers, withCredentials: true });
  return data;
}

export async function updateUserSettings(payload = {}, headers) {
  const { data } = await axios.patch('/api/user/settings', payload, { headers, withCredentials: true });
  return data;
}

// Recommendations / Explore
export async function fetchExploreRecommendations({ propertyId } = {}, headers) {
  const params = {};
  if (propertyId) params.propertyId = propertyId;
  const { data } = await axios.get('/api/recommendations/explore', {
    params,
    headers,
    withCredentials: true,
  });
  return data;
}

export async function requestRecommendation(payload = {}, headers) {
  const { data } = await axios.post('/api/recommendations/request', payload, {
    headers,
    withCredentials: true,
  });
  return data;
}

// Offers (consumer)
export async function fetchOffers(headers) {
  const { data } = await axios.get('/api/offers', { headers, withCredentials: true });
  return data;
}

export async function acceptOffer(id, headers) {
  if (!id) throw new Error('offer id is required');
  const { data } = await axios.post(`/api/offers/${encodeURIComponent(id)}/accept`, {}, { headers, withCredentials: true });
  return data;
}

export async function dismissOffer(id, headers) {
  if (!id) throw new Error('offer id is required');
  const { data } = await axios.post(`/api/offers/${encodeURIComponent(id)}/dismiss`, {}, { headers, withCredentials: true });
  return data;
}

// Provider queue (provider/admin)
export async function fetchRouteAddRequests(status = 'pending', headers) {
  const params = { status };
  const { data } = await axios.get('/api/provider/route-add-requests', { params, headers, withCredentials: true });
  return data;
}

export async function approveRouteAddRequest(id, headers) {
  if (!id) throw new Error('request id is required');
  const { data } = await axios.post(`/api/provider/route-add-requests/${encodeURIComponent(id)}/approve`, {}, {
    headers,
    withCredentials: true,
  });
  return data;
}

export async function denyRouteAddRequest(id, reason, headers) {
  if (!id) throw new Error('request id is required');
  const payload = reason ? { reason } : {};
  const { data } = await axios.post(`/api/provider/route-add-requests/${encodeURIComponent(id)}/deny`, payload, {
    headers,
    withCredentials: true,
  });
  return data;
}

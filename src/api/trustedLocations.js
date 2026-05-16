import axios from 'axios';

export async function listTrustedLocations(customerId, headers) {
  if (!customerId) throw new Error('customer id required');
  const { data } = await axios.get(`/api/portal/customers/${encodeURIComponent(customerId)}/trusted-locations`, {
    headers,
    withCredentials: true,
  });
  return data;
}

export async function createTrustedLocation(customerId, payload = {}, headers) {
  if (!customerId) throw new Error('customer id required');
  const { data } = await axios.post(
    `/api/portal/customers/${encodeURIComponent(customerId)}/trusted-locations`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

export async function deleteTrustedLocation(customerId, id, headers) {
  if (!customerId || !id) throw new Error('ids required');
  const { data } = await axios.delete(
    `/api/portal/customers/${encodeURIComponent(customerId)}/trusted-locations/${encodeURIComponent(id)}`,
    { headers, withCredentials: true }
  );
  return data;
}

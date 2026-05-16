import axios from 'axios';

export async function createChangeOrder(payload = {}, headers) {
  const { data } = await axios.post('/api/change-orders', payload, { headers, withCredentials: true });
  return data;
}

export async function getChangeOrder(id, headers) {
  if (!id) throw new Error('change order id is required');
  const { data } = await axios.get(`/api/change-orders/${encodeURIComponent(id)}`, {
    headers,
    withCredentials: true,
  });
  return data;
}

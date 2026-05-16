import axios from 'axios';

export async function listTemplates(headers) {
  const { data } = await axios.get('/api/portal/campaign-templates', { headers, withCredentials: true });
  return data;
}

export async function createTemplate(payload = {}, headers) {
  const { data } = await axios.post('/api/portal/campaign-templates', payload, { headers, withCredentials: true });
  return data;
}

export async function updateTemplate(id, payload = {}, headers) {
  if (!id) throw new Error('template id is required');
  const { data } = await axios.patch(`/api/portal/campaign-templates/${encodeURIComponent(id)}`, payload, {
    headers,
    withCredentials: true,
  });
  return data;
}

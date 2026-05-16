import axios from 'axios';

export async function listApprovalFlags(headers) {
  const { data } = await axios.get('/api/admin/approval-flags', {
    params: { status: 'open' },
    headers,
    withCredentials: true,
  });
  return data;
}

export async function resolveApprovalFlag(id, note, headers) {
  if (!id) throw new Error('flag id is required');
  if (headers == null && note && typeof note === 'object' && !Array.isArray(note)) {
    headers = note;
    note = null;
  }
  const body = note ? { note } : {};
  const { data } = await axios.post(
    `/api/admin/approval-flags/${encodeURIComponent(id)}/resolve`,
    body,
    { headers, withCredentials: true }
  );
  return data;
}

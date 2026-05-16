import axios from 'axios';

export async function fetchPublicProof(serviceRecordId, token, headers) {
  if (!serviceRecordId) throw new Error('serviceRecordId is required');
  if (!token) throw new Error('token is required');
  const { data } = await axios.get(`/api/public/proof/${encodeURIComponent(serviceRecordId)}`, {
    params: { token },
    headers,
    withCredentials: false,
  });
  return data;
}

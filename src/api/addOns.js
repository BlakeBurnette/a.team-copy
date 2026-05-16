import axios from 'axios';

export async function proposeAddOn(payload = {}, headers) {
  const body = { ...payload };
  const { data } = await axios.post('/api/add-ons/propose', body, {
    headers,
    withCredentials: true,
  });
  return data;
}

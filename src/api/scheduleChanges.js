import axios from 'axios';

export async function proposeScheduleChange(payload = {}, headers) {
  const body = { ...payload };
  const { data } = await axios.post('/api/schedule/changes/propose', body, {
    headers,
    withCredentials: true,
  });
  return data;
}

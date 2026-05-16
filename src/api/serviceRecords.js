import axios from 'axios';

export async function sendServiceRecordProof(serviceRecordId, payload = {}, headers) {
  if (!serviceRecordId) throw new Error('serviceRecordId is required');
  const { data } = await axios.post(
    `/api/service-records/${serviceRecordId}/send-proof`,
    payload,
    { withCredentials: true, headers }
  );
  return data;
}

export async function fetchServiceRecordEvents(serviceRecordId, headers) {
  if (!serviceRecordId) throw new Error('serviceRecordId is required');
  const { data } = await axios.get(
    `/api/service-records/${serviceRecordId}/events`,
    { withCredentials: true, headers }
  );
  return data;
}

export async function recordServiceRecordArrival(serviceRecordId, payload = {}, headers) {
  if (!serviceRecordId) throw new Error('serviceRecordId is required');
  const { data } = await axios.post(
    `/api/service-records/${serviceRecordId}/arrival`,
    payload,
    { withCredentials: true, headers }
  );
  return data;
}

export async function recordServiceRecordCompletion(serviceRecordId, payload = {}, headers) {
  if (!serviceRecordId) throw new Error('serviceRecordId is required');
  const { data } = await axios.post(
    `/api/service-records/${serviceRecordId}/completion`,
    payload,
    { withCredentials: true, headers }
  );
  return data;
}

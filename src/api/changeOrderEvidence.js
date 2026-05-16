import axios from 'axios';

export async function getUploadUrl(changeOrderId, payload = {}, headers) {
  if (!changeOrderId) throw new Error('change order id required');
  const { data } = await axios.post(
    `/api/staff/change-orders/${encodeURIComponent(changeOrderId)}/evidence/upload-url`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

export async function completeUpload(changeOrderId, payload = {}, headers) {
  if (!changeOrderId) throw new Error('change order id required');
  const { data } = await axios.post(
    `/api/staff/change-orders/${encodeURIComponent(changeOrderId)}/evidence/complete`,
    payload,
    { headers, withCredentials: true }
  );
  return data;
}

export async function listEvidence(changeOrderId, headers) {
  if (!changeOrderId) throw new Error('change order id required');
  const { data } = await axios.get(
    `/api/portal/change-orders/${encodeURIComponent(changeOrderId)}/evidence`,
    { headers, withCredentials: true }
  );
  return data;
}

export async function getDownloadUrl(changeOrderId, evidenceId, headers) {
  if (!changeOrderId || !evidenceId) throw new Error('ids required');
  const { data } = await axios.get(
    `/api/portal/change-orders/${encodeURIComponent(changeOrderId)}/evidence/${encodeURIComponent(evidenceId)}/download`,
    { headers, withCredentials: true }
  );
  return data;
}

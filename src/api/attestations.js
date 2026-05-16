import axios from 'axios';

const apiGet = async (url, params = {}) => {
  const { data } = await axios.get(url, { params });
  return data;
};

export const fetchAuthorizations = async ({ limit, cursor } = {}) => {
  return apiGet('/api/authorizations', { limit, cursor });
};

export const fetchPayments = async ({ limit, cursor } = {}) => {
  return apiGet('/api/payments', { limit, cursor });
};

export const fetchAttestationDetail = async ({ entityType, entityId, proofType }) => {
  if (!entityType || !entityId || !proofType) throw new Error('entityType, entityId, and proofType are required');
  return apiGet(`/api/attestations/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(proofType)}`);
};

export default {
  fetchAuthorizations,
  fetchPayments,
  fetchAttestationDetail,
};

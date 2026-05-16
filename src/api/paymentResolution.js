import axios from 'axios';

const portalBase = (serviceRecordId) =>
  `/api/portal/service-records/${encodeURIComponent(serviceRecordId)}/payment-resolution`;
const magicBase = (token) => `/api/portal/resolve/${encodeURIComponent(token)}`;

const urlFor = ({ serviceRecordId, token }) => (token ? magicBase(token) : portalBase(serviceRecordId));

const normalizeError = (e) => {
  if (e?.response?.status === 404 && e?.response?.data?.code === 'invalid_or_expired') {
    const err = new Error('invalid_or_expired');
    err.type = 'invalid_or_expired';
    throw err;
  }
  throw e;
};

const unwrap = (data) => ({
  resolution: data?.resolution || {},
  stripe: data?.stripe || null,
});

export async function fetchPaymentResolution(serviceRecordId, { token, headers } = {}) {
  if (!serviceRecordId && !token) throw new Error('serviceRecordId or token is required');
  try {
    const { data } = await axios.get(urlFor({ serviceRecordId, token }), {
      headers,
      withCredentials: !token,
    });
    return unwrap(data);
  } catch (e) {
    return normalizeError(e);
  }
}

export async function startPaymentResolution(serviceRecordId, payload = {}, { token, headers } = {}) {
  if (!serviceRecordId && !token) throw new Error('serviceRecordId or token is required');
  try {
    const { data } = await axios.post(
      `${urlFor({ serviceRecordId, token })}/start`,
      payload,
      {
        headers,
        withCredentials: !token,
      }
    );
    return unwrap(data);
  } catch (e) {
    return normalizeError(e);
  }
}

export async function confirmPaymentResolution(serviceRecordId, payload = {}, { token, headers } = {}) {
  if (!serviceRecordId && !token) throw new Error('serviceRecordId or token is required');
  try {
    const { data } = await axios.post(
      `${urlFor({ serviceRecordId, token })}/confirm`,
      payload,
      {
        headers,
        withCredentials: !token,
      }
    );
    return unwrap(data);
  } catch (e) {
    return normalizeError(e);
  }
}

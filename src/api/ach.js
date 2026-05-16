import apiFetch from './http';
import {
  validateAchAuthorizeResponse,
  validateTermsCurrentResponse,
  validateAuthorizationsResponse,
  validateAuthorizationZkResponse,
  validatePaymentsResponse,
  validateAttestationResponse,
  validateDisputeExportResponse,
  wrapValidation,
} from './validators';

function friendlyMessage(code, fallback) {
  const map = {
    missing_idempotency_key: 'Idempotency key is required',
    missing_terms: 'Terms must be accepted',
    missing_acceptance_method: 'Acceptance method is required',
    invalid_accepted_at_client: 'Accepted at timestamp is invalid',
    terms_hash_mismatch: 'Terms hash mismatch. Please refresh terms.',
    invalid_payload: 'Request payload invalid',
    unauthorized: 'You are not authorized',
    idempotency_conflict: 'This request was already processed',
    rate_limited: 'Too many attempts; please retry shortly',
  };
  return map[code] || fallback || 'Request failed';
}

export async function postAchAuthorize({ token, idempotencyKey, payload }) {
  const res = await apiFetch('/api/ach/authorize', {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
    body: payload,
    token,
  });

  if (!res.ok) {
    const code = res.error?.code || 'unknown_error';
    return {
      ...res,
      error: { ...res.error, message: friendlyMessage(code, res.error?.message) },
    };
  }

  const data = wrapValidation(validateAchAuthorizeResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getAchTermsCurrent() {
  const res = await apiFetch('/api/terms/ach/current');
  if (!res.ok) return res;
  const data = wrapValidation(validateTermsCurrentResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getAuthorizations({ token, limit, cursor } = {}) {
  const res = await apiFetch('/api/authorizations', {
    token,
    query: { limit, cursor },
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateAuthorizationsResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getAuthorizationZk({ token, id }) {
  const res = await apiFetch(`/api/authorizations/${encodeURIComponent(id)}/zk`, {
    token,
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateAuthorizationZkResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getPayments({ token, limit, cursor } = {}) {
  const res = await apiFetch('/api/payments', {
    token,
    query: { limit, cursor },
  });
  if (!res.ok) return res;
  const data = wrapValidation(validatePaymentsResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getAttestation({ token, entityType, entityId, proofType }) {
  const res = await apiFetch(
    `/api/attestations/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/${encodeURIComponent(proofType)}`,
    { token }
  );
  if (!res.ok) return res;
  const data = wrapValidation(validateAttestationResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function getDisputeExport({ token, paymentId }) {
  const res = await apiFetch(`/api/exports/dispute/payment/${encodeURIComponent(paymentId)}`, { token });
  if (!res.ok) return res;
  const data = wrapValidation(validateDisputeExportResponse, res.data);
  return data?.ok === false ? data : { ...res, data };
}

// Legacy-friendly helpers expected elsewhere in the app
export async function fetchAchTerms() {
  const res = await getAchTermsCurrent();
  if (res?.ok) return res.data;
  throw new Error(res?.error?.message || 'Failed to load terms');
}

export async function submitAchAuthorization(payload, meta = {}) {
  const idempotencyKey = meta.idempotencyKey || meta.sessionId || `ach-${Date.now()}`;
  const res = await apiFetch('/api/ach/authorize', {
    method: 'POST',
    headers: { 'idempotency-key': idempotencyKey },
    body: payload,
  });
  if (res?.ok) return res.data;
  const code = res?.error?.code;
  const err = new Error(res?.error?.message || 'Failed to submit authorization');
  err.code = code;
  throw err;
}

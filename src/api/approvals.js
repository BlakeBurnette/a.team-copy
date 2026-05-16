import apiFetch from './http';
import { validateApprovalsList, validateApproval, wrapValidation } from './validators';

export async function createApproval({ token, body }) {
  const res = await apiFetch('/api/approvals', { method: 'POST', body, token });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function listApprovals({ token, status }) {
  const res = await apiFetch('/api/approvals', { token, query: { status } });
  if (!res.ok) return res;
  const data = wrapValidation(validateApprovalsList, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function approveApproval({ token, id, passkeyToken, body }) {
  const res = await apiFetch(`/api/approvals/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    token,
    body,
    headers: passkeyToken ? { 'x-passkey-token': passkeyToken } : {},
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function declineApproval({ token, id, body }) {
  const res = await apiFetch(`/api/approvals/${encodeURIComponent(id)}/decline`, {
    method: 'POST',
    token,
    body,
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

// Legacy-friendly aliases
export async function fetchApprovals({ token, status }) {
  const res = await listApprovals({ token, status });
  if (res?.ok) return res.data;
  throw new Error(res?.error?.message || 'Failed to load approvals');
}

export async function respondToApproval({ token, id, action, passkeyToken, body }) {
  if (action === 'approve') {
    return approveApproval({ token, id, passkeyToken, body });
  }
  if (action === 'decline') {
    return declineApproval({ token, id, body });
  }
  throw new Error('Unknown approval action');
}

// Portal-specific endpoints for customer users
export async function listPortalApprovals({ token, status }) {
  const res = await apiFetch('/api/portal/approvals', { token, query: { status } });
  if (!res.ok) return res;
  const data = wrapValidation(validateApprovalsList, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function fetchPortalApprovals({ token, status }) {
  const res = await listPortalApprovals({ token, status });
  if (res?.ok) return res.data;
  throw new Error(res?.error?.message || 'Failed to load approvals');
}

export async function approvePortalApproval({ token, id, passkeyToken, body }) {
  const res = await apiFetch(`/api/portal/approvals/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    token,
    body,
    headers: passkeyToken ? { 'x-passkey-token': passkeyToken } : {},
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function declinePortalApproval({ token, id, body }) {
  const res = await apiFetch(`/api/portal/approvals/${encodeURIComponent(id)}/decline`, {
    method: 'POST',
    token,
    body,
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function respondToPortalApproval({ token, id, action, passkeyToken, body }) {
  if (action === 'approve') {
    return approvePortalApproval({ token, id, passkeyToken, body });
  }
  if (action === 'decline') {
    return declinePortalApproval({ token, id, body });
  }
  throw new Error('Unknown approval action');
}

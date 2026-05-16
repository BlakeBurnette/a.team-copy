import apiFetch from './http';
import { validateApproval, wrapValidation } from './validators';

export async function proposeScheduleChange({ token, body }) {
  const res = await apiFetch('/api/schedule/changes/propose', {
    method: 'POST',
    token,
    body,
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

export async function proposeAddOn({ token, body }) {
  const res = await apiFetch('/api/add-ons/propose', {
    method: 'POST',
    token,
    body,
  });
  if (!res.ok) return res;
  const data = wrapValidation(validateApproval, res.data);
  return data?.ok === false ? data : { ...res, data };
}

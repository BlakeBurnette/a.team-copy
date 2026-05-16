import axios from 'axios';

async function adminRequest(method, url, { data, params, headers = {} } = {}) {
  const mergedHeaders = { ...(headers || {}) };

  return axios({
    method,
    url,
    data,
    params,
    headers: mergedHeaders,
    withCredentials: true,
  });
}

export const adminGet = (url, opts) => adminRequest('get', url, opts);
export const adminPut = (url, data, opts) => adminRequest('put', url, { ...(opts || {}), data });

export async function adminListOrgs({ search, limit, offset } = {}) {
  const params = {};
  if (search) params.search = search;
  if (limit !== undefined) params.limit = limit;
  if (offset !== undefined) params.offset = offset;
  const { data } = await adminGet('/api/admin/orgs', { params });
  return data;
}

export async function adminPatchOrgFeatures(orgId, payload = {}) {
  if (!orgId) throw new Error('orgId is required');
  try {
    const { data } = await adminRequest('patch', `/api/admin/org-features/${encodeURIComponent(orgId)}`, { data: payload });
    return data;
  } catch (err) {
    const status = err?.response?.status;
    // fallback if PATCH is not available
    if (status === 404 || status === 405) {
      const fallbackPayload = {
        discovery_listings_enabled: payload.discovery_listings_enabled ?? false,
        neighborhood_offers_entitled: payload.neighborhood_offers_entitled ?? false,
      };
      const { data } = await adminPut(`/api/admin/org-features/${encodeURIComponent(orgId)}`, fallbackPayload);
      return data;
    }
    throw err;
  }
}

export default adminRequest;

export async function adminGetGlobalRecommendations() {
  const { data } = await adminGet('/api/admin/recommendations/global');
  return data;
}

export async function adminSetGlobalRecommendations(payload = {}) {
  const { data } = await adminRequest('put', '/api/admin/recommendations/global', { data: payload });
  return data;
}

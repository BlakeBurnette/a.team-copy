import axios from 'axios';

const withAuth = () => ({
  withCredentials: true,
});

export async function fetchGustoStatus() {
  const { data } = await axios.get('/api/integrations/gusto/status', withAuth());
  return data;
}

export async function fetchGustoSettings() {
  const { data } = await axios.get('/api/integrations/gusto/settings', withAuth());
  return data;
}

export async function saveGustoSettings(payload) {
  const { data } = await axios.post('/api/integrations/gusto/settings', payload, withAuth());
  return data;
}

export async function fetchGustoEmployees() {
  const { data } = await axios.get('/api/integrations/gusto/employees', withAuth());
  return data;
}

export async function fetchGustoMappings() {
  const { data } = await axios.get('/api/integrations/gusto/mappings', withAuth());
  return data;
}

export async function saveGustoMapping(payload) {
  const { data } = await axios.post('/api/integrations/gusto/mappings', payload, withAuth());
  return data;
}

export async function deleteGustoMapping(payhiveUserId) {
  const { data } = await axios.delete(
    `/api/integrations/gusto/mappings/${encodeURIComponent(payhiveUserId)}`,
    withAuth()
  );
  return data;
}

export async function fetchGustoExports(params = {}) {
  const { data } = await axios.get('/api/integrations/gusto/exports', {
    ...withAuth(),
    params,
  });
  return data;
}

export async function retryGustoExport(jobId) {
  const { data } = await axios.post(
    `/api/integrations/gusto/exports/${encodeURIComponent(jobId)}/retry`,
    {},
    withAuth()
  );
  return data;
}

export async function fetchCrewMembers() {
  const { data } = await axios.get('/api/owner/crew-members', withAuth());
  return data;
}

export async function fetchGustoPayPeriod() {
  const { data } = await axios.get('/api/integrations/gusto/pay-period', withAuth());
  return data;
}

export async function saveGustoPayPeriod(payload) {
  const { data } = await axios.post('/api/integrations/gusto/pay-period', payload, withAuth());
  return data;
}

export async function fetchGustoExportPreview(timecardId) {
  const { data } = await axios.get(
    `/api/integrations/gusto/timecards/${encodeURIComponent(timecardId)}/export-preview`,
    withAuth()
  );
  return data;
}

export async function reexportGustoTimecard(timecardId) {
  const { data } = await axios.post(
    `/api/integrations/gusto/timecards/${encodeURIComponent(timecardId)}/reexport`,
    {},
    withAuth()
  );
  return data;
}

export async function getGustoReconciliation({ period_start, period_end } = {}) {
  const { data } = await axios.get('/api/integrations/gusto/reconciliation', {
    ...withAuth(),
    params: {
      period_start,
      period_end,
    },
  });
  return data;
}

export async function bulkRetryGustoReconciliation(payload = {}) {
  const { data } = await axios.post(
    '/api/integrations/gusto/reconciliation/bulk-retry',
    payload,
    withAuth()
  );
  return data;
}

export async function pauseGustoExports() {
  const { data } = await axios.post('/api/integrations/gusto/pause', {}, withAuth());
  return data;
}

export async function resumeGustoExports() {
  const { data } = await axios.post('/api/integrations/gusto/resume', {}, withAuth());
  return data;
}

export async function fetchGustoRunbook(errorCode) {
  const params = {};
  if (errorCode) params.error_code = errorCode;
  const { data } = await axios.get('/api/integrations/gusto/runbook', {
    ...withAuth(),
    params,
  });
  return data;
}

export async function maintenanceRetryEligible() {
  const { data } = await axios.post('/api/integrations/gusto/maintenance/retry-eligible', {}, withAuth());
  return data;
}

export async function getGustoHealth() {
  const { data } = await axios.get('/api/integrations/gusto/health', withAuth());
  return data;
}

export async function getGustoExportDiff(timecardId) {
  const { data } = await axios.get(
    `/api/integrations/gusto/timecards/${encodeURIComponent(timecardId)}/export-diff`,
    withAuth()
  );
  return data;
}

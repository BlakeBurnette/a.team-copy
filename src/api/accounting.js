import axios from 'axios'

// Accounting API client — routes through /acct-api proxy (same origin, cookies forwarded)
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/acct-api/dashboard/stats'),
}

// Transactions
export const transactionsApi = {
  list: (params) => api.get('/acct-api/transactions', { params }),
  get: (id) => api.get(`/acct-api/transactions/${id}`),
  getBundle: (bundleId) => api.get(`/acct-api/transactions/bundle/${bundleId}`),
  updateCoding: (id, data) => api.put(`/acct-api/transactions/${id}/coding`, data),
  verifyChain: (id) => api.get(`/acct-api/transactions/${id}/verify-chain`),
}

// Exceptions
export const exceptionsApi = {
  list: (params) => api.get('/acct-api/exceptions', { params }),
  get: (id) => api.get(`/acct-api/exceptions/${id}`),
  assign: (id, userId) => api.post(`/acct-api/exceptions/${id}/assign`, { user_id: userId }),
  resolve: (id, data) => api.post(`/acct-api/exceptions/${id}/resolve`, data),
  getAiSuggestion: (id) => api.get(`/acct-api/exceptions/${id}/ai-suggestion`),
  getStats: () => api.get('/acct-api/exceptions/stats'),
}

// Patterns
export const patternsApi = {
  list: (params) => api.get('/acct-api/patterns', { params }),
  get: (id) => api.get(`/acct-api/patterns/${id}`),
  create: (data) => api.post('/acct-api/patterns', data),
  update: (id, data) => api.put(`/acct-api/patterns/${id}`, data),
  delete: (id) => api.delete(`/acct-api/patterns/${id}`),
  test: (id, transactionId) => api.post(`/acct-api/patterns/${id}/test`, { transaction_id: transactionId }),
  getStats: (id) => api.get(`/acct-api/patterns/${id}/stats`),
}

// Integrations
export const integrationsApi = {
  // Plaid
  createPlaidLinkToken: () => api.post('/acct-api/integrations/plaid/link-token'),
  exchangePlaidToken: (publicToken, metadata) =>
    api.post('/acct-api/integrations/plaid/exchange', { public_token: publicToken, metadata }),
  listBankConnections: () => api.get('/acct-api/integrations/plaid/connections'),
  syncBankConnection: (connectionId) => api.post(`/acct-api/integrations/plaid/connections/${connectionId}/sync`),
  deleteBankConnection: (connectionId) => api.delete(`/acct-api/integrations/plaid/connections/${connectionId}`),

  // QuickBooks
  getQboAuthUrl: () => api.get('/acct-api/integrations/quickbooks/auth-url'),
  exchangeQboToken: (code, realmId) =>
    api.post('/acct-api/integrations/quickbooks/exchange', { code, realm_id: realmId }),
  getQboConnection: () => api.get('/acct-api/integrations/quickbooks/connection'),
  syncQboAccounts: () => api.post('/acct-api/integrations/quickbooks/sync-accounts'),
  disconnectQbo: () => api.delete('/acct-api/integrations/quickbooks/connection'),

  // Chart of Accounts
  listAccounts: () => api.get('/acct-api/integrations/accounts'),
  syncAccounts: () => api.post('/acct-api/integrations/accounts/sync'),
}

// Alerts
export const alertsApi = {
  list: () => api.get('/acct-api/alerts'),
  get: (id) => api.get(`/acct-api/alerts/${id}`),
  create: (data) => api.post('/acct-api/alerts', data),
  update: (id, data) => api.put(`/acct-api/alerts/${id}`, data),
  delete: (id) => api.delete(`/acct-api/alerts/${id}`),
  test: (id) => api.post(`/acct-api/alerts/${id}/test`),
  getLogs: (id, params) => api.get(`/acct-api/alerts/${id}/logs`, { params }),
}

// Audit
export const auditApi = {
  listBlocks: (params) => api.get('/acct-api/audit/blocks', { params }),
  getBlock: (id) => api.get(`/acct-api/audit/blocks/${id}`),
  sealBlock: () => api.post('/acct-api/audit/blocks/seal'),
  verifyEntity: (entityType, entityId) =>
    api.get(`/acct-api/audit/verify/${entityType}/${entityId}`),
  getChain: (entityType, entityId) =>
    api.get(`/acct-api/audit/chain/${entityType}/${entityId}`),
}

// Settings
export const settingsApi = {
  getProfile: () => api.get('/acct-api/settings/profile'),
  updateProfile: (data) => api.put('/acct-api/settings/profile', data),
  getOrganization: () => api.get('/acct-api/settings/organization'),
  updateOrganization: (data) => api.put('/acct-api/settings/organization', data),
}

// DCF (Discounted Cash Flow)
export const dcfApi = {
  // Models
  listModels: (params) => api.get('/acct-api/dcf/models', { params }),
  getModel: (id) => api.get(`/acct-api/dcf/models/${id}`),
  createModel: (data) => api.post('/acct-api/dcf/models', data),
  updateModel: (id, data) => api.put(`/acct-api/dcf/models/${id}`, data),
  deleteModel: (id) => api.delete(`/acct-api/dcf/models/${id}`),

  // Historical data & calculation
  aggregateHistorical: (id) => api.post(`/acct-api/dcf/models/${id}/aggregate`),
  generateProjections: (id) => api.post(`/acct-api/dcf/models/${id}/generate-projections`),
  calculate: (id, data) => api.post(`/acct-api/dcf/models/${id}/calculate`, data),

  // Projections
  listProjections: (modelId, params) => api.get(`/acct-api/dcf/models/${modelId}/projections`, { params }),
  saveProjection: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/projections`, data),
  updateProjection: (modelId, projId, data) => api.put(`/acct-api/dcf/models/${modelId}/projections/${projId}`, data),
  deleteProjection: (modelId, projId) => api.delete(`/acct-api/dcf/models/${modelId}/projections/${projId}`),
  bulkUpdateProjections: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/projections/bulk`, data),

  // Scenarios
  listScenarios: (modelId) => api.get(`/acct-api/dcf/models/${modelId}/scenarios`),
  saveScenario: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/scenarios`, data),
  updateScenario: (modelId, scenarioId, data) => api.put(`/acct-api/dcf/models/${modelId}/scenarios/${scenarioId}`, data),
  deleteScenario: (modelId, scenarioId) => api.delete(`/acct-api/dcf/models/${modelId}/scenarios/${scenarioId}`),
  calculateScenario: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/scenarios/calculate`, data),
  compareScenarios: (modelId) => api.post(`/acct-api/dcf/models/${modelId}/scenarios/compare`),

  // AI
  analyzeHistorical: (modelId) => api.post(`/acct-api/dcf/models/${modelId}/ai/analyze`),
  generateAiProjections: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/ai/project`, data),
  generateAiScenarios: (modelId) => api.post(`/acct-api/dcf/models/${modelId}/ai/scenarios`),
  acceptAiSuggestions: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/ai/accept`, data),
  explainValuation: (modelId) => api.post(`/acct-api/dcf/models/${modelId}/ai/explain`),

  // Sensitivity
  listSensitivity: (modelId) => api.get(`/acct-api/dcf/models/${modelId}/sensitivity`),
  runSensitivity: (modelId, data) => api.post(`/acct-api/dcf/models/${modelId}/sensitivity`, data),
  deleteSensitivity: (modelId, sensitivityId) => api.delete(`/acct-api/dcf/models/${modelId}/sensitivity/${sensitivityId}`),

  // AI Privacy Settings
  getAISettings: () => api.get('/acct-api/dcf/ai-settings').then(r => r.data),
  updateAISettings: (data) => api.put('/acct-api/dcf/ai-settings', data).then(r => r.data),

  // AI Audit
  getAuditLog: (params) => api.get('/acct-api/dcf/ai-audit', { params }).then(r => r.data),
  verifyAuditEntry: (id) => api.get(`/acct-api/dcf/ai-audit/${id}/verify`).then(r => r.data),
  getAuditProvenance: (id) => api.get(`/acct-api/dcf/ai-audit/${id}/provenance`).then(r => r.data),

  // Cryptographic Audit Chain
  getChainStatus: () => api.get('/acct-api/dcf/ai-chain-status').then(r => r.data),

  // Certificates
  getCertificates: () => api.get('/acct-api/dcf/ai-certificates').then(r => r.data),
  generateCertificate: (data) => api.post('/acct-api/dcf/ai-certificates', data).then(r => r.data),
  verifyCertificate: (id) => api.get(`/acct-api/dcf/ai-certificates/${id}/verify`).then(r => r.data),

  // Privacy Proof
  generatePrivacyProof: (data) => api.post('/acct-api/dcf/ai-privacy-proof', data).then(r => r.data),

  // AI Patterns
  getPatterns: () => api.get('/acct-api/dcf/ai-patterns').then(r => r.data),
  approvePattern: (id, approved) => api.put(`/acct-api/dcf/ai-patterns/${id}/approve`, { approved }).then(r => r.data),
  deletePattern: (id) => api.delete(`/acct-api/dcf/ai-patterns/${id}`).then(r => r.data),

  // Contributions
  getContributions: () => api.get('/acct-api/dcf/ai-contributions').then(r => r.data),
  deleteContributions: () => api.delete('/acct-api/dcf/ai-contributions').then(r => r.data),

  // Global Benchmarks
  getBenchmarks: (params) => api.get('/acct-api/dcf/global-benchmarks', { params }).then(r => r.data),
}

export default api

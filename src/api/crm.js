import axios from 'axios';

const apiOrigin = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN) || '';
const isDev = !apiOrigin || apiOrigin.includes('localhost');

const api = axios.create({
  baseURL: isDev ? '' : apiOrigin,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In production, rewrite /crm-api/* → /api/crm-proxy/*
if (!isDev) {
  api.interceptors.request.use((config) => {
    if (config.url && config.url.startsWith('/crm-api/')) {
      config.url = config.url.replace('/crm-api/', '/api/crm-proxy/');
    }
    return config;
  });
}

export default api;

// Leads
export const getLeads = (params) => api.get('/crm-api/leads', { params });
export const getLead = (id) => api.get(`/crm-api/leads/${id}`);
export const createLead = (data) => api.post('/crm-api/leads', data);
export const updateLead = (id, data) => api.patch(`/crm-api/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/crm-api/leads/${id}`);
export const claimLead = (id) => api.post(`/crm-api/leads/${id}/claim`);
export const assignLead = (id, userId) => api.post(`/crm-api/leads/${id}/assign`, { user_id: userId });
export const addLeadNote = (id, text) => api.post(`/crm-api/leads/${id}/notes`, { text_content: text });
export const convertLeadToMerchant = (id, data = {}) => api.post(`/crm-api/leads/${id}/convert-to-merchant`, data);

// Contacts
export const getContacts = (params) => api.get('/crm-api/contacts', { params });
export const getContact = (id) => api.get(`/crm-api/contacts/${id}`);
export const createContact = (data) => api.post('/crm-api/contacts', data);
export const updateContact = (id, data) => api.patch(`/crm-api/contacts/${id}`, data);
export const deleteContact = (id) => api.delete(`/crm-api/contacts/${id}`);
export const getPipelineContacts = (params) => api.get('/crm-api/contacts', { params: { ...params, pipeline: true } });

// Organizations
export const getOrganizations = (params) => api.get('/crm-api/organizations', { params });
export const getOrganization = (id) => api.get(`/crm-api/organizations/${id}`);
export const createOrganization = (data) => api.post('/crm-api/organizations', data);
export const updateOrganization = (id, data) => api.patch(`/crm-api/organizations/${id}`, data);
export const deleteOrganization = (id) => api.delete(`/crm-api/organizations/${id}`);
export const claimOrganization = (id) => api.post(`/crm-api/organizations/${id}/claim`);
export const getSalesUsers = () => api.get('/crm-api/organizations/sales-users');
export const getFeedbackDashboard = (params) => api.get('/crm-api/organizations/feedback/dashboard', { params });
export const getOrganizationFeedback = (orgId) => api.get(`/crm-api/organizations/${orgId}/feedback`);

// Tasks
export const getTasks = (params) => api.get('/crm-api/tasks', { params });
export const getTask = (id) => api.get(`/crm-api/tasks/${id}`);
export const createTask = (data) => api.post('/crm-api/tasks', data);
export const updateTask = (id, data) => api.patch(`/crm-api/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/crm-api/tasks/${id}`);
export const completeTask = (id) => api.post(`/crm-api/tasks/${id}/complete`);

// Activities
export const getActivities = (params) => api.get('/crm-api/activities', { params });
export const createActivity = (data) => api.post('/crm-api/activities', data);
export const getTimeline = (params) => api.get('/crm-api/activities/timeline', { params });

// Users (admin)
export const getUsers = (params) => api.get('/crm-api/users', { params });
export const updateUser = (id, data) => api.patch(`/crm-api/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/crm-api/users/${id}`);
export const getPendingInvites = () => api.get('/crm-api/users/invites/pending');
export const createInvite = (data) => api.post('/crm-api/users/invites', data);
export const sendInvite = (data) => api.post('/crm-api/users/invites', data);
export const revokeInvite = (id) => api.delete(`/crm-api/users/invites/${id}`);

// Scraper
export const startScrapeJob = (data) => api.post('/crm-api/scraper/jobs', data);
export const smartSearch = (data) => api.post('/crm-api/scraper/smart-search', data);
export const getScrapeJob = (id) => api.get(`/crm-api/scraper/jobs/${id}`);
export const getScrapeJobs = () => api.get('/crm-api/scraper/jobs');
export const getScrapeJobLeads = (id) => api.get(`/crm-api/scraper/jobs/${id}/leads`);
export const runScraper = ({ location, radius = 25, limit = 50, industry = 'local business' }) =>
  api.post('/crm-api/scraper/run', { location, radius, limit, industry });
export const getScraperStatus = (jobId) => api.get(`/crm-api/scraper/jobs/${jobId}/status`);
export const importScrapedLead = (jobId, leadId) =>
  api.post(`/crm-api/scraper/jobs/${jobId}/leads/${leadId}/import`);
export const importAllScrapedLeads = (jobId) =>
  api.post(`/crm-api/scraper/jobs/${jobId}/import-all`);
export const getScraperQuota = () => api.get('/crm-api/scraper/quota');

// Admin (SuperAdmin/InternalAdmin)
export const getAdminStats = () => api.get('/crm-api/admin/stats');
export const getAdminOrganizations = (params) => api.get('/crm-api/admin/organizations', { params });
export const getAdminOrganization = (id) => api.get(`/crm-api/admin/organizations/${id}`);
export const updateAdminOrganization = (id, data) => api.patch(`/crm-api/admin/organizations/${id}`, data);
export const getOrganizationInvites = (params) => api.get('/crm-api/admin/organization-invites', { params });
export const createOrganizationInvite = (data) => api.post('/crm-api/admin/organization-invites', data);
export const revokeOrganizationInvite = (id) => api.delete(`/crm-api/admin/organization-invites/${id}`);
export const resendOrganizationInvite = (id) => api.post(`/crm-api/admin/organization-invites/${id}/resend`);
export const acceptOrgInvite = (token, password, name) => api.post('/crm-api/auth/org-invite/accept', { token, password, name });

// Chat (AI Assistant)
export const sendChatMessage = (messages) => api.post('/crm-api/chat', { messages });
export const getChatTools = () => api.get('/crm-api/chat/tools');
export const submitChatFeedback = (messageId, rating, feedback) => api.post('/crm-api/chat/feedback', { message_id: messageId, rating, feedback });

// Monthly/Nightly Scraper (SuperAdmin)
export const getMonthlyScraperStatus = () => api.get('/crm-api/state-licenses/monthly-scraper/status');
export const getMonthlyScraperLeads = (params) => api.get('/crm-api/state-licenses/monthly-scraper/export', { params });
export const searchMonthlyScraperLeads = (q, limit = 20) => api.get('/crm-api/state-licenses/monthly-scraper/search', { params: { q, limit } });
export const runMonthlyScraper = () => api.post('/crm-api/state-licenses/monthly-scraper/run');
export const resetMonthlyScraper = () => api.post('/crm-api/state-licenses/monthly-scraper/reset');

// Sites Builder
export const createPreviewSession = (data) => api.post('/crm-api/sites/create-preview-session', data);
export const getSitesSession = (phone) => api.get(`/crm-api/sites/sessions/${encodeURIComponent(phone)}`);
export const listSitesSessions = () => api.get('/crm-api/sites/sessions');
export const generateSite = (phone, templateStyle = 'clean-modern') => api.post('/crm-api/sites/generate', { phone, template_style: templateStyle });
export const sendPreviewSms = (phone) => api.post('/crm-api/sites/send-preview-sms', { phone });
export const sendPaymentSms = (phone) => api.post('/crm-api/sites/send-payment-sms', { phone });

// Call Scripts
export const getCallScripts = (params) => api.get('/crm-api/call-scripts', { params });
export const getCallScript = (id) => api.get(`/crm-api/call-scripts/${id}`);
export const createCallScript = (data) => api.post('/crm-api/call-scripts', data);
export const updateCallScript = (id, data) => api.put(`/crm-api/call-scripts/${id}`, data);
export const deleteCallScript = (id) => api.delete(`/crm-api/call-scripts/${id}`);

// Lead Folders
export const getLeadFolders = () => api.get('/crm-api/lead-folders');
export const getLeadFolderTree = () => api.get('/crm-api/lead-folders/tree');
export const createLeadFolder = (data) => api.post('/crm-api/lead-folders', data);
export const updateLeadFolder = (id, data) => api.patch(`/crm-api/lead-folders/${id}`, data);
export const deleteLeadFolder = (id, moveLeadsTo) => api.delete(`/crm-api/lead-folders/${id}`, { params: { move_leads_to: moveLeadsTo } });
export const moveLeadFolder = (id, parentId) => api.post(`/crm-api/lead-folders/${id}/move`, { parent_id: parentId });
export const getFolderLeads = (id, params) => api.get(`/crm-api/lead-folders/${id}/leads`, { params });
export const exportFolderCsv = (id, params) => api.get(`/crm-api/lead-folders/${id}/export-csv`, { params, responseType: 'blob' });
export const bulkMoveLeads = (data) => api.post('/crm-api/lead-folders/move-leads', data);
export const exportLeadsToOrg = (data) => api.post('/crm-api/lead-folders/export-to-org', data);

// PhoneBurner / Rep Metrics
export const getPhoneBurnerConfig = () => api.get('/crm-api/phoneburner/config');
export const savePhoneBurnerConfig = (data) => api.post('/crm-api/phoneburner/config', data);
export const getPhoneBurnerUsers = () => api.get('/crm-api/phoneburner/users');
export const syncPhoneBurnerUsers = (users) => api.post('/crm-api/phoneburner/users', { users });
export const syncPhoneBurnerUsersFromPB = () => api.post('/crm-api/phoneburner/users/sync-from-pb');
export const updatePhoneBurnerUserTargets = (userId, data) => api.post(`/crm-api/phoneburner/users/${userId}/targets`, data);
export const getRepMetricsDaily = (params) => api.get('/crm-api/phoneburner/metrics/daily', { params });
export const getRepMetricsSummary = () => api.get('/crm-api/phoneburner/metrics/summary');
export const getRepAlerts = () => api.get('/crm-api/phoneburner/alerts');
export const dismissRepAlert = (alertId) => api.post(`/crm-api/phoneburner/alerts/${alertId}/dismiss`);
export const distributeContacts = (contactIds, mode) => api.post('/crm-api/phoneburner/distribute', { contact_ids: contactIds, mode });
export const getDistributions = (params) => api.get('/crm-api/phoneburner/distributions', { params });

// B2C Lead Engine
export const b2cSmartSearch = (query) => api.post('/crm-api/b2c/smart-search', { query });
export const createB2CJob = (data) => api.post('/crm-api/b2c/jobs', data);
export const getB2CJob = (jobId) => api.get(`/crm-api/b2c/jobs/${jobId}`);
export const getB2CJobStatus = (jobId) => api.get(`/crm-api/b2c/jobs/${jobId}/status`);
export const getB2CJobLeads = (jobId, params) => api.get(`/crm-api/b2c/jobs/${jobId}/leads`, { params });
export const skipTraceB2CJob = (jobId) => api.post(`/crm-api/b2c/jobs/${jobId}/skip-trace`);
export const skipTraceB2CLead = (leadId) => api.post(`/crm-api/b2c/leads/${leadId}/skip-trace`);
export const importB2CLead = (jobId, leadId) => api.post(`/crm-api/b2c/jobs/${jobId}/leads/${leadId}/import`);
export const importAllB2CLeads = (jobId) => api.post(`/crm-api/b2c/jobs/${jobId}/import-all`);
export const getB2CQuota = () => api.get('/crm-api/b2c/quota');
export const getB2CStorms = (params) => api.get('/crm-api/b2c/storms', { params });

// Auth (limited — only for fetching workspace context lazily)
export const getCrmMe = () => api.get('/crm-api/auth/me');
export const getMe = () => api.get('/crm-api/auth/me');
export const updateProfile = (data) => api.patch('/crm-api/auth/me', data);
export const changePassword = (oldPassword, newPassword) => api.post('/crm-api/auth/password/change', { old_password: oldPassword, new_password: newPassword });

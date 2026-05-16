// src/api/applications.js
// API module for job applications
import axios from 'axios';

const withAuth = () => ({
  withCredentials: true,
});

// ============ PUBLIC ENDPOINTS ============

/**
 * Get presigned URL for resume upload (public)
 * @param {Object} params - { content_type, file_name, byte_size }
 */
export async function getResumeUploadUrl(params) {
  const { data } = await axios.post('/api/applications/presign', params);
  return data;
}

/**
 * Submit a job application (public, rate-limited)
 * @param {Object} application - { name, email, phone, linkedin_url, location, job_title, resume_key }
 */
export async function submitApplication(application) {
  const { data } = await axios.post('/api/applications', application);
  return data;
}

// ============ ADMIN ENDPOINTS ============

/**
 * Fetch all applications (admin only)
 * @param {Object} params - { status, job_title, page, limit }
 */
export async function fetchApplications(params = {}) {
  const { data } = await axios.get('/api/admin/applications', {
    ...withAuth(),
    params,
  });
  return data;
}

/**
 * Update application status (admin only)
 * @param {string} id - Application ID
 * @param {Object} payload - { status: 'new' | 'reviewed' | 'rejected' | 'hired' }
 */
export async function updateApplicationStatus(id, payload) {
  if (!id) throw new Error('Application ID is required');
  const { data } = await axios.patch(
    `/api/admin/applications/${encodeURIComponent(id)}`,
    payload,
    withAuth()
  );
  return data;
}

/**
 * Get signed URL for resume download (admin only)
 * @param {string} id - Application ID
 */
export async function getResumeDownloadUrl(id) {
  if (!id) throw new Error('Application ID is required');
  const { data } = await axios.get(
    `/api/admin/applications/${encodeURIComponent(id)}/resume`,
    withAuth()
  );
  return data;
}

/**
 * Delete an application (admin only)
 * @param {string} id - Application ID
 */
export async function deleteApplication(id) {
  if (!id) throw new Error('Application ID is required');
  const { data } = await axios.delete(
    `/api/admin/applications/${encodeURIComponent(id)}`,
    withAuth()
  );
  return data;
}

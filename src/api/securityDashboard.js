// src/api/securityDashboard.js
// API client for security monitoring dashboard
import axios from 'axios';

const BASE_URL = '/api/admin/security';

// Dashboard summary metrics
export async function getDashboardMetrics() {
  const { data } = await axios.get(`${BASE_URL}/dashboard`, {
    withCredentials: true,
  });
  return data;
}

// Security events list with filtering
export async function getSecurityEvents(params = {}) {
  const { data } = await axios.get(`${BASE_URL}/events`, {
    params,
    withCredentials: true,
  });
  return data;
}

// Single event details
export async function getSecurityEvent(eventId) {
  const { data } = await axios.get(`${BASE_URL}/events/${encodeURIComponent(eventId)}`, {
    withCredentials: true,
  });
  return data;
}

// Alerts list
export async function getAlerts(params = {}) {
  const { data } = await axios.get(`${BASE_URL}/alerts`, {
    params,
    withCredentials: true,
  });
  return data;
}

// Acknowledge an alert
export async function acknowledgeAlert(alertId) {
  const { data } = await axios.post(`${BASE_URL}/alerts/${encodeURIComponent(alertId)}/acknowledge`, {}, {
    withCredentials: true,
  });
  return data;
}

// Resolve an alert
export async function resolveAlert(alertId, resolution = {}) {
  const { data } = await axios.post(`${BASE_URL}/alerts/${encodeURIComponent(alertId)}/resolve`, resolution, {
    withCredentials: true,
  });
  return data;
}

// Mark alert as false positive
export async function markAlertFalsePositive(alertId, reason = '') {
  const { data } = await axios.post(`${BASE_URL}/alerts/${encodeURIComponent(alertId)}/false-positive`, { reason }, {
    withCredentials: true,
  });
  return data;
}

// Get alert rules configuration
export async function getAlertRules() {
  const { data } = await axios.get(`${BASE_URL}/alert-rules`, {
    withCredentials: true,
  });
  return data;
}

// Update an alert rule
export async function updateAlertRule(ruleId, updates) {
  const { data } = await axios.patch(`${BASE_URL}/alert-rules/${encodeURIComponent(ruleId)}`, updates, {
    withCredentials: true,
  });
  return data;
}

// Get hourly event trend data (from dashboard endpoint)
export async function getHourlyTrend(hours = 24) {
  const { data } = await axios.get(`${BASE_URL}/dashboard`, {
    withCredentials: true,
  });
  return { hourly: data.hourly_trend || [] };
}

// Get top events by category (from dashboard endpoint)
export async function getTopEvents(days = 7) {
  const { data } = await axios.get(`${BASE_URL}/dashboard`, {
    withCredentials: true,
  });
  return { events: data.top_events || [] };
}

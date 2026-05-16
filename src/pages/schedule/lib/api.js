// lib/api.js
import axios from 'axios';


export async function getMyOrganization(headers) {
return axios.get('/api/owner/my-organization', { headers, withCredentials: true }).then(r => r.data);
}


export async function getTeams(headers) {
return axios.get('/api/owner/teams', { headers, withCredentials: true }).then(r => r.data);
}


export async function getScheduleWindow(headers, fromYmd, toYmd) {
return axios.get('/api/schedule', {
headers,
withCredentials: true,
params: { from: fromYmd, to: toYmd },
}).then(r => r.data);
}


export async function getStartTimes(headers, fromYmd, toYmd) {
return axios.get('/api/schedule/start-times', {
headers,
withCredentials: true,
params: { from: fromYmd, to: toYmd },
}).then(r => r.data);
}


export async function postSetTime(headers, { rule_id, date, start_minutes, team_id }) {
return axios.post('/api/schedule/set-time', { rule_id, date, start_minutes, team_id: team_id ?? null }, { headers, withCredentials: true });
}


export async function deleteTime(headers, rule_id, date) {
return axios.delete(`/api/schedule/${rule_id}/time`, { headers, withCredentials: true, params: { date } });
}


export async function postSkip(headers, rule_id, date) {
return axios.post(`/api/schedule/${rule_id}/skip`, { date }, { headers, withCredentials: true });
}

export async function postCancelOccurrence(headers, rule_id, date) {
return axios.post(`/api/schedule/${rule_id}/cancel`, { date }, { headers, withCredentials: true });
}


export async function postCompleteImmediate(headers, rule_id, date) {
return axios.post(`/api/schedule/${rule_id}/complete`, { date, bill_mode: 'immediate' }, { headers, withCredentials: true });
}


export async function postReschedule(headers, rule_id, body, extraParams) {
return axios.post(`/api/schedule/${rule_id}/reschedule`, body, { headers, withCredentials: true, params: extraParams });
}

export async function getInvoicesForCustomer(headers, customerId) {
return axios.get('/api/invoices', { params: { customer_id: customerId, flat: 1 }, headers, withCredentials: true }).then(r => r.data);
}


export async function getAvailableSlots(headers, params) {
return axios.get('/api/schedule/available', { headers, withCredentials: true, params }).then(r => r.data);
}

export async function postStartWork(headers, ruleId, body) {
return axios.post(`/api/schedule/${ruleId}/start`, body, { headers, withCredentials: true }).then(r => r.data);
}

export async function patchReorderStops(headers, body) {
return axios.patch('/api/schedule/reorder', body, { headers, withCredentials: true });
}

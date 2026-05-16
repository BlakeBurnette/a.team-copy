import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization, claimOrganization, getOrganizationFeedback, getTasks, createTask, completeTask, searchMonthlyScraperLeads, getActivities, createActivity } from '../../api/crm';
import { Search, Plus, Building2, Globe, MapPin, Users, Trash2, X, Phone, User, MessageSquare, Clock, Zap, CheckSquare, ChevronDown, Check, Database, Star, ExternalLink, PhoneCall, Mail, Calendar, FileText, UserPlus } from 'lucide-react';
import Toast from '../../components/crm/Toast';
import { useAuth } from '../../hooks/useCrmAuth';

const ORG_STAGES = [
  { value: 'prospect', label: 'Prospect', color: 'bg-gray-100 text-gray-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-700' },
  { value: 'churned', label: 'Churned', color: 'bg-red-100 text-red-700' },
];

export default function CrmOrganizations() {
  const { isInternalAdmin } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [nightlyLeads, setNightlyLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [includeNightly, setIncludeNightly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    setNightlyLeads([]);
    try {
      const params = { limit: 100 };
      if (q) params.q = q;
      const { data } = await getOrganizations(params);
      if (data?.items) {
        setOrgs(data.items);
      }

      // Also search nightly leads if enabled and there's a search query
      if (includeNightly && q && q.trim().length >= 2) {
        try {
          const { data: nightlyData } = await searchMonthlyScraperLeads(q, 20);
          if (nightlyData?.items) {
            setNightlyLeads(nightlyData.items);
          }
        } catch (err) {
          console.error('Nightly leads search error:', err);
        }
      }
    } catch (err) {
      console.error('fetchOrgs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrgs();
  };

  const handleCreate = async (formData) => {
    try {
      const { data } = await createOrganization(formData);
      if (data?.ok) {
        showToast('Organization created');
        fetchOrgs();
        setShowForm(false);
      }
    } catch (err) {
      showToast('Failed to create organization');
    }
  };

  const handleUpdate = async (orgId, formData) => {
    try {
      const { data } = await updateOrganization(orgId, formData);
      if (data?.ok) {
        showToast('Organization updated');
        fetchOrgs();
        setEditingOrg(null);
      }
    } catch (err) {
      showToast('Failed to update organization');
    }
  };

  const handleDelete = async (orgId) => {
    if (!confirm('Delete this organization?')) return;
    try {
      await deleteOrganization(orgId);
      showToast('Organization deleted');
      fetchOrgs();
    } catch (err) {
      showToast('Failed to delete organization');
    }
  };

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleStageChange = async (orgId, newStage) => {
    try {
      await updateOrganization(orgId, { stage: newStage });
      setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, stage: newStage } : o));
      showToast('Stage updated');
    } catch (err) {
      showToast('Failed to update stage');
    }
  };

  const handleClaim = async (orgId) => {
    try {
      await claimOrganization(orgId);
      showToast('Organization assigned to you');
      fetchOrgs();
    } catch (err) {
      showToast('Failed to claim organization');
    }
  };

  const handleImportNightlyLead = async (lead) => {
    try {
      const orgData = {
        name: lead.business_name,
        phone: lead.phone || '',
        website: lead.website || '',
        industry: lead.industry || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state_code || '',
        zip: lead.zip || '',
        stage: 'prospect',
        notes: `Imported from nightly scraper (${lead.source}). Rating: ${lead.rating || 'N/A'}, Reviews: ${lead.review_count || 0}`,
      };
      const { data } = await createOrganization(orgData);
      if (data?.ok) {
        showToast('Organization imported successfully');
        // Remove from nightly leads list
        setNightlyLeads(prev => prev.filter(l => l.id !== lead.id));
        // Refresh orgs to show the new one
        fetchOrgs();
      }
    } catch (err) {
      showToast('Failed to import organization');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Organization
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <input
            className="border rounded-lg px-9 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Search organizations..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          Search
        </button>
        {isInternalAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-600 ml-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNightly}
              onChange={(e) => setIncludeNightly(e.target.checked)}
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            <Database className="h-4 w-4 text-amber-500" />
            Include Nightly Leads
          </label>
        )}
      </form>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <Th>Organization</Th>
                <Th>Stage</Th>
                <Th>Owner</Th>
                <Th>Phone</Th>
                <Th>Contact</Th>
                <Th>Location</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No organizations found</td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingOrg(org)}
                        className="text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{org.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {org.industry && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                  {org.industry}
                                </span>
                              )}
                              {org.website && (
                                <a
                                  href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                >
                                  <Globe className="h-3 w-3" />
                                  {org.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <StageDropdown
                        value={org.stage || 'prospect'}
                        onChange={(stage) => handleStageChange(org.id, stage)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {org.owner_name ? (
                        <span className="flex items-center gap-1 text-gray-700">
                          <User className="h-3 w-3 text-amber-500" />
                          {org.owner_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {org.phone ? (
                        <a href={`tel:${org.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Phone className="h-3 w-3" />
                          {org.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {org.contact_name ? (
                        <div>
                          <Link
                            to={`/app/crm/contacts?id=${org.contact_id}`}
                            className="flex items-center gap-1 text-gray-900 font-medium hover:text-amber-600"
                          >
                            <User className="h-3 w-3 text-green-600" />
                            {org.contact_name}
                          </Link>
                          {org.contact_email && (
                            <a href={`mailto:${org.contact_email}`} className="text-xs text-blue-600 hover:underline">
                              {org.contact_email}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {org.city || org.state ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[org.city, org.state].filter(Boolean).join(', ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!org.owner_id && (
                          <button
                            onClick={() => handleClaim(org.id)}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                            title="Claim this organization"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nightly Leads Results */}
      {nightlyLeads.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-900">Nightly Leads ({nightlyLeads.length})</span>
            <span className="text-sm text-amber-700">— Not yet in your CRM</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <Th>Business</Th>
                  <Th>Industry</Th>
                  <Th>Phone</Th>
                  <Th>Location</Th>
                  <Th>Rating</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {nightlyLeads.map((lead) => (
                  <tr key={`nightly-${lead.id}`} className="border-b hover:bg-amber-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Database className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{lead.business_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                Website
                              </a>
                            )}
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
                              {lead.source === 'google_places' ? 'Google' : lead.source === 'yelp' ? 'Yelp' : lead.source}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.industry && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {lead.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.city || lead.state_code ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[lead.city, lead.state_code].filter(Boolean).join(', ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {lead.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium">{lead.rating}</span>
                          {lead.review_count > 0 && (
                            <span className="text-xs text-gray-400">({lead.review_count})</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleImportNightlyLead(lead)}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Import
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <OrgFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {editingOrg && (
        <OrgFormModal
          org={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSubmit={(data) => handleUpdate(editingOrg.id, data)}
        />
      )}

      <Toast show={toast.show} onClose={() => setToast({ show: false, message: '' })}>
        {toast.message}
      </Toast>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{children}</th>;
}

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Calendar },
  { value: 'note', label: 'Note', icon: FileText },
];

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
];

const SENTIMENTS = [
  { value: 'positive', label: 'Positive', color: 'bg-green-100 text-green-700' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-700' },
  { value: 'negative', label: 'Negative', color: 'bg-red-100 text-red-700' },
];

const FEEDBACK_TAGS = [
  'Interested', 'Not Interested', 'Pricing Concern', 'Needs Follow-up',
  'Decision Maker', 'Gatekeeper', 'Competitor Mentioned', 'Budget Issue',
  'Timeline Issue', 'Requested Info', 'Ready to Buy',
];

function OrgFormModal({ org, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: org?.name || '',
    phone: org?.phone || '',
    website: org?.website || '',
    industry: org?.industry || '',
    stage: org?.stage || 'prospect',
    address: org?.address || '',
    city: org?.city || '',
    state: org?.state || '',
    zip: org?.zip || '',
    notes: org?.notes || '',
  });
  const [feedbackData, setFeedbackData] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'call',
    outcome: '',
    sentiment: '',
    tags: [],
    notes: '',
  });

  useEffect(() => {
    if (org?.id) {
      fetchOrgFeedback();
      fetchOrgTasks();
      fetchOrgActivities();
    }
  }, [org?.id]);

  const fetchOrgFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const { data } = await getOrganizationFeedback(org.id);
      setFeedbackData(data);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchOrgTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data } = await getTasks({ organization_id: org.id, completed: false });
      setTasks(data?.items || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchOrgActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data } = await getActivities({ organization_id: org.id, limit: 20 });
      setActivities(data?.items || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const taskData = { title: newTaskTitle, organization_id: org.id };
      if (newTaskDueDate) {
        const time = newTaskDueTime || '09:00';
        const dueAt = new Date(`${newTaskDueDate}T${time}:00`);
        taskData.due_at = dueAt.toISOString();
      }
      await createTask(taskData);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskDueTime('');
      fetchOrgTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(taskId);
      fetchOrgTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      await createActivity({
        type: activityForm.type,
        organization_id: org.id,
        body: activityForm.notes,
        feedback: {
          category: activityForm.outcome || activityForm.type,
          notes: activityForm.notes,
        },
        metadata: {
          outcome: activityForm.outcome,
          sentiment: activityForm.sentiment,
          tags: activityForm.tags,
        },
      });
      setActivityForm({ type: 'call', outcome: '', sentiment: '', tags: [], notes: '' });
      setShowActivityForm(false);
      fetchOrgActivities();
      fetchOrgFeedback(); // Refresh AI analysis
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const toggleTag = (tag) => {
    setActivityForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const getActivityIcon = (type) => {
    const found = ACTIVITY_TYPES.find((t) => t.value === type);
    return found ? found.icon : FileText;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${org ? 'max-w-3xl' : 'max-w-lg'} p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {org ? 'Edit Organization' : 'New Organization'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={org ? "grid grid-cols-1 md:grid-cols-2 gap-6" : ""}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="e.g. Technology, Healthcare"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {ORG_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              {org ? 'Save' : 'Create'}
            </button>
          </div>
        </form>

        {/* Activity, Tasks & Feedback (only shown when editing) */}
        {org && (
          <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Activity Section */}
            <div>
              <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <PhoneCall className="h-4 w-4" /> Activity
              </h3>

              {!showActivityForm ? (
                <button
                  type="button"
                  onClick={() => setShowActivityForm(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Log Activity
                </button>
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  {/* Activity Type */}
                  <div className="flex gap-1">
                    {ACTIVITY_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setActivityForm((prev) => ({ ...prev, type: type.value }))}
                          className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                            activityForm.type === type.value
                              ? 'bg-amber-500 text-white'
                              : 'bg-white border text-gray-600'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Outcome (for calls) */}
                  {activityForm.type === 'call' && (
                    <select
                      value={activityForm.outcome}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, outcome: e.target.value }))}
                      className="w-full border rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">Select outcome...</option>
                      {CALL_OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}

                  {/* Sentiment */}
                  <div className="flex gap-1">
                    {SENTIMENTS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setActivityForm((prev) => ({ ...prev, sentiment: s.value }))}
                        className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
                          activityForm.sentiment === s.value
                            ? s.color + ' ring-1 ring-gray-400'
                            : 'bg-white border text-gray-600'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {FEEDBACK_TAGS.slice(0, 6).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                          activityForm.tags.includes(tag)
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-white border text-gray-500'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Notes */}
                  <textarea
                    value={activityForm.notes}
                    onChange={(e) => setActivityForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes..."
                    rows={2}
                    className="w-full border rounded px-2 py-1.5 text-sm resize-none"
                  />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowActivityForm(false)}
                      className="flex-1 py-1.5 border rounded text-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLogActivity}
                      className="flex-1 py-1.5 bg-amber-500 text-white rounded text-sm"
                    >
                      Log
                    </button>
                  </div>
                </div>
              )}

              {/* Activity Timeline */}
              {loadingActivities ? (
                <div className="text-xs text-gray-500 mt-2">Loading...</div>
              ) : activities.length > 0 ? (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                  {activities.slice(0, 5).map((activity) => {
                    const Icon = getActivityIcon(activity.type);
                    const meta = activity.metadata || {};
                    return (
                      <div key={activity.id} className="flex gap-2 p-2 bg-white border rounded text-xs">
                        <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium capitalize">{activity.type}</span>
                            {meta.sentiment && (
                              <span className={`px-1 py-0.5 rounded text-[10px] ${
                                SENTIMENTS.find((s) => s.value === meta.sentiment)?.color || ''
                              }`}>
                                {meta.sentiment}
                              </span>
                            )}
                          </div>
                          {activity.body && (
                            <p className="text-gray-600 truncate">{activity.body}</p>
                          )}
                          <div className="text-gray-400 mt-0.5">
                            {new Date(activity.occurred_at || activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-2">No activities yet</div>
              )}
            </div>

            {/* Tasks Section */}
            <div>
              <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                <CheckSquare className="h-4 w-4" /> Tasks
              </h3>
              <form onSubmit={handleAddTask} className="mb-3">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task..."
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Clock className="h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={newTaskDueTime}
                    onChange={(e) => setNewTaskDueTime(e.target.value)}
                    placeholder="09:00"
                    className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {newTaskDueDate && (
                    <button
                      type="button"
                      onClick={() => { setNewTaskDueDate(''); setNewTaskDueTime(''); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>
              {loadingTasks ? (
                <div className="text-sm text-gray-500">Loading tasks...</div>
              ) : tasks.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(task.id)}
                        className="p-1 hover:bg-green-100 rounded text-gray-400 hover:text-green-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <span className="text-sm flex-1">{task.title}</span>
                      {task.due_at && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_at).toLocaleDateString()}
                          {' '}
                          {new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No pending tasks</div>
              )}
            </div>

            {/* AI Feedback Analysis */}
            <div>
            <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4" /> AI Feedback Analysis
            </h3>

            {loadingFeedback ? (
              <div className="text-sm text-gray-500 text-center py-4">Loading feedback...</div>
            ) : feedbackData?.ai_analysis ? (
              <div className="space-y-3">
                {/* Overall Sentiment */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Sentiment:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    feedbackData.ai_analysis.overall_sentiment === 'hot' ? 'bg-green-100 text-green-700' :
                    feedbackData.ai_analysis.overall_sentiment === 'warm' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {feedbackData.ai_analysis.overall_sentiment || 'unknown'}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({feedbackData.total_feedback_count} feedback entries)
                  </span>
                </div>

                {/* Themes */}
                {feedbackData.ai_analysis.themes?.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 mb-2">Key Themes</div>
                    <div className="space-y-1.5">
                      {feedbackData.ai_analysis.themes.map((theme, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium capitalize">{theme.category}</span>
                          <span className="text-gray-400"> ({theme.count})</span>
                          <span className="text-gray-600">: {theme.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {feedbackData.ai_analysis.recommended_actions?.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> Recommended Actions
                    </div>
                    <ul className="text-sm text-blue-900 space-y-1">
                      {feedbackData.ai_analysis.recommended_actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">-</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timing */}
                {feedbackData.ai_analysis.timing_suggestion && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Timing
                    </div>
                    <div className="text-sm text-amber-900">
                      {feedbackData.ai_analysis.timing_suggestion}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {feedbackData.ai_analysis.summary && (
                  <div className="text-sm text-gray-600 italic border-t pt-3 mt-3">
                    {feedbackData.ai_analysis.summary}
                  </div>
                )}
              </div>
            ) : feedbackData?.total_feedback_count > 0 ? (
              <div className="text-sm text-gray-500 italic py-4">
                AI analysis pending... ({feedbackData.total_feedback_count} feedback entries)
                <div className="text-xs text-gray-400 mt-1">Analysis runs every 30 minutes</div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-4">
                No feedback logged yet for this organization.
                <div className="text-xs mt-1">Log feedback during calls/emails on the Contacts page.</div>
              </div>
            )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function StageDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = React.useRef(null);
  const listRef = React.useRef(null);
  const currentStage = ORG_STAGES.find(s => s.value === value) || ORG_STAGES[0];

  // Close on outside click / Esc
  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!open) return;
      if (btnRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Reset active index when opening and calculate position
  React.useEffect(() => {
    if (open && btnRef.current) {
      const idx = ORG_STAGES.findIndex(s => s.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [open, value]);

  const handleKeyDown = (e) => {
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % ORG_STAGES.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + ORG_STAGES.length) % ORG_STAGES.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(ORG_STAGES[activeIndex].value);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="border rounded-lg px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[140px]"
      >
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${currentStage.color}`}>
          {currentStage.label}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-500" />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="fixed z-[9999] max-h-64 overflow-auto rounded-lg border bg-white shadow-lg border-stone-200"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          {ORG_STAGES.map((stage, i) => {
            const isSelected = stage.value === value;
            const isActive = i === activeIndex;
            return (
              <div
                key={stage.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onChange(stage.value);
                  setOpen(false);
                }}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? 'bg-zinc-600 text-white font-semibold'
                    : isActive
                    ? 'bg-stone-100 text-stone-900'
                    : 'hover:bg-stone-50 text-stone-700'
                }`}
              >
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isSelected ? 'bg-white/20 text-white' : stage.color
                }`}>
                  {stage.label}
                </span>
                {isSelected && <Check className="w-4 h-4" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
